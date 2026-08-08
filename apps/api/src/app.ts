import Fastify, {
  type FastifyBaseLogger,
  type FastifyInstance,
  type FastifyRequest,
} from 'fastify';
import { randomUUID } from 'node:crypto';
import {
  ContinuityService,
  type ContinuityRepository,
  type RequestContext,
} from '../../../packages/application/src/index.js';
import {
  accessRequestInput,
  errorEnvelope,
  householdInput,
  packetInput,
  passwordSessionInput,
  payloadInput,
  recordInput,
  releaseTransitionInput,
  sessionClaims,
} from '../../../packages/contracts/src/index.js';
import { DomainError, type ReleaseState } from '../../../packages/domain/src/index.js';
import { createPrivacySafeLogger } from '../../../packages/infrastructure/observability/src/index.js';
import {
  authorize,
  hashPassword,
  signSession,
  verifyPassword,
  verifySession,
  verifyTotp,
  type AuthorizationContext,
} from '../../../packages/infrastructure/auth/src/index.js';
import {
  verifyStripeWebhook,
  type VerifiedBillingEvent,
} from '../../../packages/infrastructure/billing/src/index.js';

type AuthenticatedContext = RequestContext & Readonly<{ authorization: AuthorizationContext }>;
type PasswordIdentityRepository = ContinuityRepository &
  Readonly<{
    findPasswordIdentity(
      tenantId: string,
      email: string,
    ): Promise<Readonly<{
      userId: string;
      householdId: string;
      role: 'owner';
      passwordHash: string;
      totpSecret?: string;
    }> | null>;
    processBillingEvent(event: VerifiedBillingEvent): Promise<'processed' | 'duplicate' | 'stale'>;
    transitionReleaseRequest(
      context: RequestContext & { householdId: string },
      accessRequestId: string,
      next: ReleaseState,
      idempotencyKey: string,
    ): Promise<ReleaseState>;
  }>;
type AuthRateLimiter = Readonly<{
  consume(tenantId: string, email: string): Promise<boolean>;
  reset(tenantId: string, email: string): Promise<void>;
}>;
type SessionRevocationStore = Readonly<{
  isRevoked(jti: string): Promise<boolean>;
  revoke(jti: string, expiresAt: number): Promise<void>;
}>;

function context(request: FastifyRequest, sessionSecret: string): AuthenticatedContext {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer '))
    throw new DomainError('AUTHENTICATION_REQUIRED', 'A valid authenticated session is required.');
  const token = authorization.slice('Bearer '.length).trim();
  const claims = sessionClaims.safeParse(verifySession(token, sessionSecret));
  if (!claims.success)
    throw new DomainError('AUTHENTICATION_REQUIRED', 'A valid authenticated session is required.');
  const expiresAt = new Date(claims.data.exp);
  return {
    tenantId: claims.data.tenantId,
    ...(claims.data.householdId ? { householdId: claims.data.householdId } : {}),
    actorId: claims.data.sub,
    purpose: claims.data.purpose,
    authorization: {
      tenantId: claims.data.tenantId,
      householdId: claims.data.householdId ?? '00000000-0000-0000-0000-000000000000',
      role: claims.data.role,
      assurance: claims.data.assurance,
      actionGrants: claims.data.actionGrants,
      categoryGrants: claims.data.categoryGrants,
      packetGrants: claims.data.packetGrants,
      purpose: claims.data.purpose,
      expiresAt,
      ...(claims.data.customerApproved === undefined
        ? {}
        : { customerApproved: claims.data.customerApproved }),
      ...(claims.data.reason === undefined ? {} : { reason: claims.data.reason }),
    },
  };
}

function requireHouseholdAuthorization(
  authenticated: AuthenticatedContext,
  action: string,
  category?: string,
  packetId?: string,
): void {
  if (!authenticated.householdId)
    throw new DomainError('HOUSEHOLD_CONTEXT_REQUIRED', 'Household context is required.');
  const decision = authorize(authenticated.authorization, action, {
    tenantId: authenticated.tenantId,
    householdId: authenticated.householdId,
    ...(category ? { category } : {}),
    ...(packetId ? { packetId } : {}),
  });
  if (!decision.allowed)
    throw new DomainError('AUTHORIZATION_DENIED', 'The authenticated session is not authorized.');
}

export function createApp(
  repository: PasswordIdentityRepository,
  options: Readonly<{
    sessionSecret?: string;
    authRateLimiter?: AuthRateLimiter;
    sessionRevocationStore?: SessionRevocationStore;
    stripeWebhookSecret?: string;
  }> = {},
): FastifyInstance {
  const sessionSecret = options.sessionSecret ?? process.env.SESSION_SECRET;
  if (!sessionSecret || Buffer.byteLength(sessionSecret, 'utf8') < 32)
    throw new Error('SESSION_SECRET_INVALID');
  const app = Fastify({
    loggerInstance: createPrivacySafeLogger(process.env.LOG_LEVEL ?? 'info') as FastifyBaseLogger,
    genReqId: () => randomUUID(),
    bodyLimit: 1_048_576,
    requestTimeout: 15_000,
  });
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    const text = typeof body === 'string' ? body : body.toString('utf8');
    (request as FastifyRequest & { rawBody?: string }).rawBody = text;
    try {
      done(null, JSON.parse(text));
    } catch (error) {
      done(error as Error);
    }
  });
  app.addHook('onRequest', async (request) => {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ') || !options.sessionRevocationStore) return;
    const claims = sessionClaims.safeParse(
      verifySession(authorization.slice('Bearer '.length), sessionSecret),
    );
    if (!claims.success) return;
    try {
      if (await options.sessionRevocationStore.isRevoked(claims.data.jti))
        throw new DomainError('AUTHENTICATION_REQUIRED', 'Authentication is required.');
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new DomainError(
        'AUTH_SERVICE_UNAVAILABLE',
        'Authentication is temporarily unavailable.',
      );
    }
  });
  const service = new ContinuityService(repository);
  const dummyPasswordHash = hashPassword(`dummy-${randomUUID()}-credential`);
  app.setErrorHandler((error: unknown, request, reply) => {
    const safeError = error instanceof Error ? error : new Error('Unknown error');
    const code =
      safeError instanceof DomainError
        ? safeError.code
        : safeError.name === 'ZodError'
          ? 'VALIDATION_FAILED'
          : 'INTERNAL_ERROR';
    const status =
      code === 'INTERNAL_ERROR'
        ? 500
        : code === 'AUTHENTICATION_REQUIRED'
          ? 401
          : code === 'AUTHENTICATION_FAILED'
            ? 401
            : code === 'AUTH_RATE_LIMITED'
              ? 429
              : code === 'AUTH_SERVICE_UNAVAILABLE'
                ? 503
                : code === 'BILLING_PROVIDER_DISABLED'
                  ? 503
                  : code === 'BILLING_WEBHOOK_SIGNATURE_INVALID'
                    ? 401
                    : code === 'AUTHORIZATION_DENIED'
                      ? 403
                      : code === 'SERVER_VERIFIED_RELEASE_EVIDENCE_REQUIRED'
                        ? 409
                        : code === 'RELEASE_POLICY_UNSATISFIED'
                          ? 409
                          : code === 'PROHIBITED_SECRET'
                            ? 422
                            : 400;
    void reply
      .status(status)
      .send(
        errorEnvelope(
          code,
          status === 500 ? 'The request could not be completed.' : safeError.message,
          request.id,
          false,
        ),
      );
  });
  app.get('/health/live', async () => ({ status: 'ok' }));
  const readiness = async (_request: FastifyRequest, reply: { status(code: number): unknown }) => {
    if (!(await repository.ready())) {
      reply.status(503);
      return { status: 'unavailable', service: 'api', dependency: 'database' };
    }
    return { status: 'ok', service: 'api' };
  };
  app.get('/health/ready', readiness);
  app.get('/v1/health/ready', readiness);
  app.post('/v1/auth/password/session', async (request, reply) => {
    const input = passwordSessionInput.parse(request.body);
    if (!options.authRateLimiter)
      throw new DomainError(
        'AUTH_SERVICE_UNAVAILABLE',
        'Authentication is temporarily unavailable.',
      );
    let allowed: boolean;
    try {
      allowed = await options.authRateLimiter.consume(input.tenantId, input.email);
    } catch {
      throw new DomainError(
        'AUTH_SERVICE_UNAVAILABLE',
        'Authentication is temporarily unavailable.',
      );
    }
    if (!allowed)
      throw new DomainError('AUTH_RATE_LIMITED', 'Too many authentication attempts. Try later.');
    const identity = await repository.findPasswordIdentity(input.tenantId, input.email);
    const passwordValid = await verifyPassword(
      input.password,
      identity?.passwordHash ?? (await dummyPasswordHash),
    );
    if (!identity || !passwordValid)
      throw new DomainError('AUTHENTICATION_FAILED', 'The credentials are invalid.');
    let assurance: 'password' | 'mfa' = 'password';
    if (input.totp) {
      const secret = identity.totpSecret ? Buffer.from(identity.totpSecret, 'base64') : null;
      if (
        !secret ||
        secret.length !== 20 ||
        secret.toString('base64') !== identity.totpSecret ||
        !verifyTotp(input.totp, secret)
      )
        throw new DomainError('AUTHENTICATION_FAILED', 'The credentials are invalid.');
      assurance = 'mfa';
    }
    await options.authRateLimiter.reset(input.tenantId, input.email);
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    const token = signSession(
      {
        sub: identity.userId,
        tenantId: input.tenantId,
        householdId: identity.householdId,
        role: identity.role,
        assurance,
        actionGrants: [],
        categoryGrants: [],
        packetGrants: [],
        purpose: 'authenticated household session',
      },
      sessionSecret,
      expiresAt,
    );
    return reply.send({
      accessToken: token,
      tokenType: 'Bearer',
      expiresAt: expiresAt.toISOString(),
      assurance,
    });
  });
  app.post('/v1/auth/logout', async (request, reply) => {
    if (!options.sessionRevocationStore)
      throw new DomainError(
        'AUTH_SERVICE_UNAVAILABLE',
        'Authentication is temporarily unavailable.',
      );
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';
    const claims = sessionClaims.safeParse(verifySession(token, sessionSecret));
    if (!claims.success)
      throw new DomainError('AUTHENTICATION_REQUIRED', 'Authentication is required.');
    await options.sessionRevocationStore.revoke(claims.data.jti, claims.data.exp);
    return reply.status(204).send();
  });
  app.post('/v1/billing/webhooks/stripe', async (request, reply) => {
    if (!options.stripeWebhookSecret)
      throw new DomainError('BILLING_PROVIDER_DISABLED', 'Billing webhooks are not configured.');
    const rawBody = (request as FastifyRequest & { rawBody?: string }).rawBody;
    const signature = request.headers['stripe-signature'];
    if (!rawBody || typeof signature !== 'string')
      throw new DomainError(
        'BILLING_WEBHOOK_SIGNATURE_INVALID',
        'Billing webhook authentication failed.',
      );
    let event: VerifiedBillingEvent;
    try {
      event = verifyStripeWebhook(rawBody, signature, options.stripeWebhookSecret);
    } catch {
      throw new DomainError(
        'BILLING_WEBHOOK_SIGNATURE_INVALID',
        'Billing webhook authentication failed.',
      );
    }
    const result = await repository.processBillingEvent(event);
    return reply.status(result === 'processed' ? 202 : 200).send({ status: result });
  });
  app.post('/v1/households', async (request, reply) => {
    const input = householdInput.parse(request.body);
    const authenticated = context(request, sessionSecret);
    if (authenticated.authorization.role !== 'owner')
      throw new DomainError('AUTHORIZATION_DENIED', 'The authenticated session is not authorized.');
    const record = await service.createRecord(authenticated, 'household', input);
    return reply.status(201).send(record);
  });
  app.post('/v1/records', async (request, reply) => {
    const input = recordInput.parse(request.body);
    const authenticated = context(request, sessionSecret);
    requireHouseholdAuthorization(authenticated, `create:${input.kind}`, input.kind);
    const record = await service.createRecord(authenticated, input.kind, input.payload);
    return reply.status(201).send(record);
  });
  app.get('/v1/records/:kind', async (request) => {
    const params = request.params as { kind: string };
    const authenticated = context(request, sessionSecret);
    requireHouseholdAuthorization(authenticated, `read:${params.kind}`, params.kind);
    return repository.list(authenticated, params.kind);
  });
  app.post('/v1/packets', async (request, reply) => {
    const input = packetInput.parse(request.body);
    const ctx = context(request, sessionSecret);
    if (!ctx.householdId)
      throw new DomainError('HOUSEHOLD_CONTEXT_REQUIRED', 'Household context is required.');
    requireHouseholdAuthorization(ctx, 'create:packet', 'packet');
    const manifest = await service.createPacket({ ...ctx, householdId: ctx.householdId }, input);
    return reply.status(201).send(manifest);
  });
  app.post('/v1/access-requests', async (request, reply) => {
    const input = accessRequestInput.parse(request.body);
    const authenticated = context(request, sessionSecret);
    if (!authenticated.householdId)
      throw new DomainError('HOUSEHOLD_CONTEXT_REQUIRED', 'Household context is required.');
    requireHouseholdAuthorization(authenticated, 'create:accessRequest', 'accessRequest');
    const record = await service.createRecord(authenticated, 'accessRequest', {
      ...input,
      state: 'REQUESTED',
    });
    return reply.status(201).send(record);
  });
  app.post('/v1/releases/:accessRequestId/transition', async (request) => {
    const input = releaseTransitionInput.parse(request.body);
    const params = request.params as { accessRequestId: string };
    const authenticated = context(request, sessionSecret);
    requireHouseholdAuthorization(
      authenticated,
      input.next === 'APPROVED_FOR_RELEASE' || input.next === 'RELEASED'
        ? 'approve-release'
        : 'transition-release',
      'release',
    );
    if (!authenticated.householdId)
      throw new DomainError('HOUSEHOLD_CONTEXT_REQUIRED', 'Household context is required.');
    const idempotencyKey = request.headers['idempotency-key'];
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 200
    )
      throw new DomainError('IDEMPOTENCY_KEY_REQUIRED', 'A valid idempotency key is required.');
    return {
      state: await repository.transitionReleaseRequest(
        { ...authenticated, householdId: authenticated.householdId },
        params.accessRequestId,
        input.next,
        idempotencyKey,
      ),
    };
  });
  app.post('/v1/privacy/requests', async (request, reply) => {
    const ctx = context(request, sessionSecret);
    requireHouseholdAuthorization(ctx, 'create:privacyRequest', 'privacyRequest');
    const input = payloadInput.parse(request.body);
    const record = await service.createRecord(ctx, 'privacyRequest', {
      ...input,
      status: 'RECEIVED',
    });
    return reply.status(202).send(record);
  });
  const resourceKinds = {
    people: 'person',
    dependents: 'dependent',
    children: 'child',
    pets: 'pet',
    contacts: 'contact',
    helpers: 'helperGrant',
    accounts: 'account',
    assets: 'asset',
    insurance: 'insurance',
    properties: 'property',
    'storage-units': 'storageUnit',
    'document-locations': 'documentLocation',
    documents: 'document',
    facts: 'fact',
    playbooks: 'playbook',
    wishes: 'funeralWish',
    letters: 'letter',
    videos: 'video',
    advice: 'advice',
    photos: 'photo',
    recipes: 'recipe',
    readiness: 'readinessResult',
    'family-iq': 'familyIqGap',
    recipients: 'recipient',
    'emergency-policies': 'emergencyPolicy',
    'annual-reviews': 'annualReview',
    consents: 'consent',
    exports: 'export',
    billing: 'subscription',
  } as const;
  for (const [route, kind] of Object.entries(resourceKinds)) {
    app.post(`/v1/${route}`, async (request, reply) => {
      const authenticated = context(request, sessionSecret);
      const action =
        kind === 'emergencyPolicy'
          ? 'arm-emergency-policy'
          : kind === 'recipient'
            ? 'change-release-recipient'
            : kind === 'export'
              ? 'export-full-archive'
              : kind === 'helperGrant'
                ? 'grant-restricted-category'
                : `create:${kind}`;
      requireHouseholdAuthorization(authenticated, action, kind);
      return reply
        .status(201)
        .send(await service.createRecord(authenticated, kind, payloadInput.parse(request.body)));
    });
    app.get(`/v1/${route}`, async (request) => {
      const authenticated = context(request, sessionSecret);
      requireHouseholdAuthorization(authenticated, `read:${kind}`, kind);
      return repository.list(authenticated, kind);
    });
  }
  return app;
}
