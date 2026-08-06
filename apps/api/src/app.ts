import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import {
  ContinuityService,
  type ContinuityRepository,
  type RequestContext,
} from '../../../packages/application/src/index.js';
import {
  contextHeaders,
  errorEnvelope,
  householdInput,
  packetInput,
  recordInput,
  releaseTransitionInput,
} from '../../../packages/contracts/src/index.js';
import {
  DomainError,
  transitionRelease,
  type ReleaseState,
} from '../../../packages/domain/src/index.js';

function context(request: FastifyRequest): RequestContext {
  const parsed = contextHeaders.safeParse(request.headers);
  if (!parsed.success)
    throw new DomainError(
      'REQUEST_CONTEXT_REQUIRED',
      'Tenant, actor, and purpose headers are required.',
    );
  return {
    tenantId: parsed.data['x-tenant-id'],
    ...(parsed.data['x-household-id'] ? { householdId: parsed.data['x-household-id'] } : {}),
    actorId: parsed.data['x-actor-id'],
    purpose: parsed.data['x-purpose'],
  };
}

export function createApp(repository: ContinuityRepository): FastifyInstance {
  const app = Fastify({
    logger: false,
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
        : code === 'REQUEST_CONTEXT_REQUIRED'
          ? 401
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
  app.get('/health/ready', async () => ({ status: 'ok', service: 'api' }));
  app.get('/v1/health/ready', async () => ({ status: 'ok', service: 'api' }));
  app.post('/v1/households', async (request, reply) => {
    const input = householdInput.parse(request.body);
    const record = await service.createRecord(context(request), 'household', input);
    return reply.status(201).send(record);
  });
  app.post('/v1/records', async (request, reply) => {
    const input = recordInput.parse(request.body);
    const record = await service.createRecord(context(request), input.kind, input.payload);
    return reply.status(201).send(record);
  });
  app.get('/v1/records/:kind', async (request) => {
    const params = request.params as { kind: string };
    return repository.list(context(request), params.kind);
  });
  app.post('/v1/packets', async (request, reply) => {
    const input = packetInput.parse(request.body);
    const ctx = context(request);
    if (!ctx.householdId)
      throw new DomainError('HOUSEHOLD_CONTEXT_REQUIRED', 'Household context is required.');
    const manifest = await service.createPacket({ ...ctx, householdId: ctx.householdId }, input);
    return reply.status(201).send(manifest);
  });
  app.post('/v1/releases/:state/transition', async (request) => {
    const input = releaseTransitionInput.parse(request.body);
    const params = request.params as { state: ReleaseState };
    context(request);
    return {
      state: transitionRelease(params.state, input.next, {
        ...input.context,
        challengeEndsAt: new Date(input.context.challengeEndsAt),
        now: new Date(input.context.now),
      }),
    };
  });
  app.post('/v1/privacy/requests', async (request, reply) => {
    const ctx = context(request);
    const input = request.body as Record<string, unknown>;
    const record = await service.createRecord(ctx, 'privacyRequest', {
      ...input,
      status: 'RECEIVED',
    });
    return reply.status(202).send(record);
  });
  return app;
}
