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
  errorEnvelope,
  householdInput,
  packetInput,
  payloadInput,
  recordInput,
  releaseTransitionInput,
  sessionClaims,
} from '../../../packages/contracts/src/index.js';
import {
  DomainError,
  transitionRelease,
  type ReleaseState,
} from '../../../packages/domain/src/index.js';
import { createPrivacySafeLogger } from '../../../packages/infrastructure/observability/src/index.js';
import {
  authorize,
  verifySession,
  type AuthorizationContext,
} from '../../../packages/infrastructure/auth/src/index.js';

type AuthenticatedContext = RequestContext & Readonly<{ authorization: AuthorizationContext }>;

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
  repository: ContinuityRepository,
  options: Readonly<{ sessionSecret?: string }> = {},
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
  const service = new ContinuityService(repository);
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
          : code === 'AUTHORIZATION_DENIED'
            ? 403
            : code === 'SERVER_VERIFIED_RELEASE_EVIDENCE_REQUIRED'
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
  app.post('/v1/releases/:state/transition', async (request) => {
    const input = releaseTransitionInput.parse(request.body);
    const params = request.params as { state: ReleaseState };
    const authenticated = context(request, sessionSecret);
    requireHouseholdAuthorization(
      authenticated,
      input.next === 'APPROVED_FOR_RELEASE' || input.next === 'RELEASED'
        ? 'approve-release'
        : 'transition-release',
      'release',
    );
    if (input.next === 'APPROVED_FOR_RELEASE' || input.next === 'RELEASED')
      throw new DomainError(
        'SERVER_VERIFIED_RELEASE_EVIDENCE_REQUIRED',
        'Release approval requires persisted server-verified policy evidence.',
      );
    return {
      state: transitionRelease(params.state, input.next, {
        ...input.context,
        challengeEndsAt: new Date(input.context.challengeEndsAt),
        now: new Date(),
      }),
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
    'access-requests': 'accessRequest',
    verifications: 'verification',
    challenges: 'challenge',
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
