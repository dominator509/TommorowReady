import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { hostname } from 'node:os';
import { pathToFileURL } from 'node:url';
import type { Logger } from 'pino';
import {
  RealEmail,
  RealJobQueue,
  RealObjectStorage,
  RedisPhysicalMailRouter,
  type ClaimedDurableJob,
  type DurableJob,
} from '../../../packages/infrastructure/database/src/services.js';
import { PostgresContinuityRepository } from '../../../packages/infrastructure/database/src/index.js';
import {
  configuredPhysicalMailProviders,
  PhysicalMailError,
  type PhysicalMailProvider,
  type PostalAddress,
} from '../../../packages/infrastructure/physical-mail/src/index.js';
import {
  renderDeterministicBinder,
  renderDeterministicMailHtml,
} from '../../report-renderer/src/index.js';
import { createPrivacySafeLogger } from '../../../packages/infrastructure/observability/src/index.js';

export type Job = DurableJob & Readonly<{ attempt: number }>;
export type JobHandler = (job: Job) => Promise<void>;
export type WorkerQueue = Pick<
  RealJobQueue,
  'ready' | 'promoteDue' | 'claim' | 'reclaimStale' | 'acknowledge' | 'fail' | 'close'
>;

export async function executeJob(job: Job, logger: Logger, handler: JobHandler): Promise<void> {
  try {
    await handler(job);
    logger.info(
      {
        job_id: job.id,
        tenant_id: job.tenantId,
        household_id: job.householdId,
        module: 'worker',
        operation: job.type,
        result: 'ok',
      },
      'job completed',
    );
  } catch (error) {
    logger.error(
      {
        job_id: job.id,
        tenant_id: job.tenantId,
        household_id: job.householdId,
        module: 'worker',
        operation: job.type,
        result: 'failed',
        error_code: normalizeErrorCode(error),
      },
      'job failed',
    );
    throw error;
  }
}

function normalizeErrorCode(error: unknown): string {
  const candidate = error instanceof Error ? error.message : 'UNKNOWN';
  const normalized = candidate
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .slice(0, 120);
  return normalized.length >= 3 ? normalized : 'UNKNOWN';
}

async function processClaim(
  queue: WorkerQueue,
  claimed: ClaimedDurableJob,
  handler: JobHandler,
  logger: Logger,
  maximumAttempts: number,
): Promise<void> {
  try {
    await executeJob({ ...claimed.job, attempt: claimed.attempt }, logger, handler);
    await queue.acknowledge(claimed.streamId);
  } catch (error) {
    const failure = await queue.fail(claimed, normalizeErrorCode(error), maximumAttempts);
    if (failure.deadLettered)
      logger.error(
        {
          job_id: claimed.job.id,
          module: 'worker',
          operation: claimed.job.type,
          result: 'dead_lettered',
          error_code: normalizeErrorCode(error),
        },
        'job dead-lettered',
      );
  }
}

export async function runWorker(
  queue: WorkerQueue,
  handler: JobHandler,
  logger: Logger,
  signal: AbortSignal,
  options: Readonly<{
    consumer?: string;
    blockMilliseconds?: number;
    staleMilliseconds?: number;
    maximumAttempts?: number;
  }> = {},
): Promise<void> {
  const consumer = options.consumer ?? `${hostname()}-${process.pid}-${randomUUID()}`;
  const blockMilliseconds = options.blockMilliseconds ?? 1_000;
  const staleMilliseconds = options.staleMilliseconds ?? 60_000;
  const maximumAttempts = options.maximumAttempts ?? 5;
  await queue.ready();
  while (!signal.aborted) {
    await queue.promoteDue();
    const fresh = await queue.claim(consumer, blockMilliseconds);
    if (fresh) {
      await processClaim(queue, fresh, handler, logger, maximumAttempts);
      continue;
    }
    const stale = await queue.reclaimStale(consumer, staleMilliseconds);
    if (stale) await processClaim(queue, stale, handler, logger, maximumAttempts);
  }
}

export function createWorkerHealthServer(
  queue: Pick<WorkerQueue, 'ready'>,
  signal: AbortSignal,
): Server {
  return createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json');
    response.setHeader('cache-control', 'no-store');
    if (request.url === '/health/live') {
      response.statusCode = signal.aborted ? 503 : 200;
      response.end(
        JSON.stringify({ status: signal.aborted ? 'stopping' : 'ok', service: 'worker' }),
      );
      return;
    }
    if (request.url === '/health/ready') {
      try {
        if (signal.aborted) throw new Error('WORKER_STOPPING');
        await queue.ready();
        response.statusCode = 200;
        response.end(JSON.stringify({ status: 'ok', service: 'worker' }));
      } catch {
        response.statusCode = 503;
        response.end(
          JSON.stringify({ status: 'unavailable', service: 'worker', dependency: 'redis' }),
        );
      }
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ status: 'not_found' }));
  });
}

function failClosedHandler(): JobHandler {
  return async (job) => {
    throw new Error(`JOB_HANDLER_UNAVAILABLE_${job.type.toUpperCase()}`);
  };
}

type ContinuityRepository = Pick<
  PostgresContinuityRepository,
  | 'advanceContinuityMonitorForJob'
  | 'markContinuityMonitorNotificationFailure'
  | 'prepareAutomaticRelease'
  | 'recordReleaseArtifact'
  | 'reservePhysicalMailOrder'
  | 'recordPhysicalMailOrder'
  | 'completeAutomaticReleaseDelivery'
>;

export function createContinuityJobHandler(
  input: Readonly<{
    repository: ContinuityRepository;
    queue: Pick<RealJobQueue, 'schedule'>;
    storage: Pick<RealObjectStorage, 'putImmutable'>;
    notifier?: Pick<RealEmail, 'send'>;
    baseUrl: string;
    providers: Readonly<Partial<Record<'lob' | 'postgrid', PhysicalMailProvider>>>;
    mailRouter?: Pick<RedisPhysicalMailRouter, 'put'>;
    returnAddress?: PostalAddress;
    automationEnabled: boolean;
    logger?: Pick<Logger, 'info' | 'warn' | 'error'>;
    now?: () => Date;
  }>,
): JobHandler {
  return async (job) => {
    if (job.type !== 'continuity-monitor' || !job.resourceId)
      throw new Error(`JOB_HANDLER_UNAVAILABLE_${job.type.toUpperCase()}`);
    const context = {
      tenantId: job.tenantId,
      householdId: job.householdId,
      actorId: '00000000-0000-4000-8000-000000000000',
      purpose: 'continuity monitor worker',
    } as const;
    if (!input.automationEnabled) {
      input.logger?.warn(
        {
          job_id: job.id,
          tenant_id: job.tenantId,
          household_id: job.householdId,
          module: 'continuity',
          operation: 'global-pause',
          result: 'denied',
          error_code: 'CONTINUITY_AUTOMATION_DISABLED',
        },
        'continuity job deferred by global safety switch',
      );
      await input.queue.schedule(
        {
          ...job,
          id: randomUUID(),
          idempotencyKey: `continuity:${job.resourceId}:global-pause`,
        },
        new Date(Date.now() + 300_000),
      );
      return;
    }
    const decision = await input.repository.advanceContinuityMonitorForJob(
      context,
      job.resourceId,
      input.now?.() ?? new Date(),
    );
    if (['OWNER_CHECK_IN_DUE', 'OWNER_REMINDER', 'OWNER_GRACE_NOTICE'].includes(decision.effect)) {
      if (!input.notifier) {
        await input.repository.markContinuityMonitorNotificationFailure(context, job.resourceId);
        input.logger?.error(
          {
            job_id: job.id,
            module: 'continuity',
            operation: 'owner-notification',
            result: 'error',
            error_code: 'CONTINUITY_NOTIFIER_DISABLED',
          },
          'continuity owner notification failed',
        );
        return;
      }
      try {
        await input.notifier.send(
          decision.ownerEmail,
          decision.effect === 'OWNER_GRACE_NOTICE'
            ? 'TomorrowReady continuity monitor grace period'
            : 'TomorrowReady check-in required',
          decision.effect === 'OWNER_GRACE_NOTICE'
            ? 'Your grace period is active. Check in, snooze, cancel, or deny from TomorrowReady before the configured release point.'
            : 'Your continuity monitor needs a check-in. No packet has been released.',
        );
      } catch {
        await input.repository.markContinuityMonitorNotificationFailure(context, job.resourceId);
        input.logger?.error(
          {
            job_id: job.id,
            module: 'continuity',
            operation: 'owner-notification',
            result: 'error',
            error_code: 'CONTINUITY_NOTIFICATION_FAILED',
          },
          'continuity owner notification failed',
        );
        return;
      }
    }
    if (decision.effect !== 'RELEASE_PACKET') {
      if (
        ['ARMED', 'SNOOZED', 'CHECK_IN_DUE', 'REMINDERS_ACTIVE', 'GRACE_PERIOD'].includes(
          decision.state,
        )
      )
        await input.queue.schedule(
          {
            id: randomUUID(),
            tenantId: job.tenantId,
            householdId: job.householdId,
            type: 'continuity-monitor',
            resourceId: job.resourceId,
            idempotencyKey: `continuity:${job.resourceId}:${decision.nextActionAt}`,
          },
          new Date(decision.nextActionAt),
        );
      return;
    }

    const delivery = await input.repository.prepareAutomaticRelease(context, job.resourceId);
    const binder = renderDeterministicBinder({
      householdName: delivery.householdName,
      manifestHash: delivery.manifestHash,
      sections: delivery.sections,
    });
    const stored = await input.storage.putImmutable({
      tenantId: job.tenantId,
      householdId: job.householdId,
      objectId: delivery.accessRequestId,
      body: binder.bytes,
      contentType: binder.mediaType,
    });
    const releaseToken = await input.repository.recordReleaseArtifact(context, {
      monitorId: job.resourceId,
      accessRequestId: delivery.accessRequestId,
      objectId: delivery.accessRequestId,
      checksumSha256: stored.checksumSha256,
      manifestHash: delivery.manifestHash,
      recipientId: delivery.recipientId,
    });
    const releaseUrl = new URL('/recipient/release', input.baseUrl);
    releaseUrl.search = new URLSearchParams({
      tenantId: job.tenantId,
      householdId: job.householdId,
      tokenId: releaseToken.tokenId,
      token: releaseToken.token,
    }).toString();
    let digitalDelivered = false;
    if (delivery.recipientEmail && input.notifier) {
      try {
        await input.notifier.send(
          delivery.recipientEmail,
          'A TomorrowReady packet is available to you',
          `Open this expiring recipient-bound link: ${releaseUrl.toString()}\nExpires: ${releaseToken.expiresAt}`,
        );
        digitalDelivered = true;
      } catch {
        digitalDelivered = false;
      }
    }

    let physicalMailAccepted = false;
    if (delivery.physicalMail) {
      const provider = input.providers[delivery.physicalMail.provider];
      if (provider && input.returnAddress && input.mailRouter) {
        const mailedSections =
          delivery.physicalMail.mode === 'SECURE_ACCESS_LETTER'
            ? [
                'A TomorrowReady packet is available to you.',
                `Secure access link: ${releaseUrl.toString()}`,
                `This link expires: ${releaseToken.expiresAt}`,
              ]
            : [...delivery.sections, `Secure digital backup: ${releaseUrl.toString()}`];
        const mailedBinder = renderDeterministicBinder({
          householdName: delivery.householdName,
          manifestHash: delivery.manifestHash,
          sections: mailedSections,
        });
        const renderedHtml = renderDeterministicMailHtml({
          title: 'TomorrowReady recipient packet',
          manifestHash: delivery.manifestHash,
          sections: mailedSections,
        });
        const idempotencyKey = `continuity:${job.resourceId}:${delivery.accessRequestId}:mail`;
        const reservation = await input.repository.reservePhysicalMailOrder(context, {
          monitorId: job.resourceId,
          accessRequestId: delivery.accessRequestId,
          provider: provider.name,
          idempotencyKey,
          contentSha256: mailedBinder.checksum,
        });
        if (reservation.status === 'ACCEPTED') physicalMailAccepted = true;
        else if (reservation.reserved) {
          try {
            const order = await provider.createLetter({
              to: delivery.physicalMail.address,
              from: input.returnAddress,
              pdf: mailedBinder.bytes,
              html: renderedHtml.html,
              contentSha256: mailedBinder.checksum,
              idempotencyKey,
              service: delivery.physicalMail.service,
              description: 'TomorrowReady owner-authorized continuity delivery',
            });
            await input.repository.recordPhysicalMailOrder(context, {
              monitorId: job.resourceId,
              accessRequestId: delivery.accessRequestId,
              ...order,
              idempotencyKey,
              contentSha256: mailedBinder.checksum,
            });
            await input.mailRouter.put(order.provider, order.providerOrderId, {
              tenantId: job.tenantId,
              householdId: job.householdId,
            });
            physicalMailAccepted = true;
          } catch (error) {
            if (error instanceof PhysicalMailError && error.outcomeAmbiguous) {
              physicalMailAccepted = false;
              input.logger?.error(
                {
                  job_id: job.id,
                  module: 'continuity',
                  operation: 'physical-mail-submission',
                  result: 'error',
                  provider: provider.name,
                  error_code: error.code,
                },
                'physical mail submission outcome is ambiguous',
              );
            } else if (error instanceof PhysicalMailError && !error.retryable) {
              physicalMailAccepted = false;
              input.logger?.error(
                {
                  job_id: job.id,
                  module: 'continuity',
                  operation: 'physical-mail-submission',
                  result: 'error',
                  provider: provider.name,
                  error_code: error.code,
                },
                'physical mail submission was rejected',
              );
            } else throw error;
          }
        }
      }
    }
    await input.repository.completeAutomaticReleaseDelivery(context, job.resourceId, {
      digitalDelivered,
      physicalMailAccepted,
    });
    input.logger?.info(
      {
        job_id: job.id,
        tenant_id: job.tenantId,
        household_id: job.householdId,
        module: 'continuity',
        operation: 'automatic-release-delivery',
        result: digitalDelivered || physicalMailAccepted ? 'ok' : 'error',
      },
      'continuity release delivery finalized',
    );
  };
}

function configuredReturnAddress(): PostalAddress | undefined {
  const values = [
    process.env.PHYSICAL_MAIL_FROM_NAME,
    process.env.PHYSICAL_MAIL_FROM_ADDRESS_LINE1,
    process.env.PHYSICAL_MAIL_FROM_CITY,
    process.env.PHYSICAL_MAIL_FROM_STATE,
    process.env.PHYSICAL_MAIL_FROM_POSTAL_CODE,
    process.env.PHYSICAL_MAIL_FROM_COUNTRY_CODE,
  ];
  if (!values.some(Boolean)) return undefined;
  if (!values.every(Boolean)) throw new Error('PHYSICAL_MAIL_RETURN_ADDRESS_INCOMPLETE');
  const [name, addressLine1, city, state, postalCode, countryCode] = values;
  return {
    name: name!,
    addressLine1: addressLine1!,
    ...(process.env.PHYSICAL_MAIL_FROM_ADDRESS_LINE2
      ? { addressLine2: process.env.PHYSICAL_MAIL_FROM_ADDRESS_LINE2 }
      : {}),
    city: city!,
    state: state!,
    postalCode: postalCode!,
    countryCode: countryCode!,
  };
}

async function main(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL_REQUIRED');
  const logger = createPrivacySafeLogger(process.env.LOG_LEVEL ?? 'info');
  const queue = new RealJobQueue(redisUrl);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');
  const repository = new PostgresContinuityRepository(databaseUrl);
  const storage = new RealObjectStorage(
    process.env.S3_BUCKET ?? '',
    process.env.S3_ENDPOINT ?? '',
    process.env.S3_ACCESS_KEY_ID ?? '',
    process.env.S3_SECRET_ACCESS_KEY ?? '',
  );
  await storage.ensureBucket();
  const notifier = process.env.SMTP_URL ? new RealEmail(process.env.SMTP_URL) : undefined;
  const mailRouter = new RedisPhysicalMailRouter(redisUrl, process.env.AUTH_LOOKUP_SECRET ?? '');
  const providers = configuredPhysicalMailProviders();
  const continuityAutomationSetting = process.env.CONTINUITY_AUTOMATION_ENABLED ?? 'no';
  if (!['yes', 'no'].includes(continuityAutomationSetting))
    throw new Error('CONTINUITY_AUTOMATION_ENABLED_INVALID');
  const continuityHandler = createContinuityJobHandler({
    repository,
    queue,
    storage,
    ...(notifier ? { notifier } : {}),
    baseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
    providers,
    mailRouter,
    ...(configuredReturnAddress() ? { returnAddress: configuredReturnAddress()! } : {}),
    automationEnabled: continuityAutomationSetting === 'yes',
    logger,
  });
  const controller = new AbortController();
  const server = createWorkerHealthServer(queue, controller.signal);
  const shutdown = () => controller.abort();
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  server.listen(Number(process.env.WORKER_HEALTH_PORT ?? '4100'), process.env.HOST ?? '0.0.0.0');
  try {
    await runWorker(
      queue,
      async (job) =>
        job.type === 'continuity-monitor' ? continuityHandler(job) : failClosedHandler()(job),
      logger,
      controller.signal,
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await queue.close();
    await mailRouter.close();
    await repository.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const logger = createPrivacySafeLogger(process.env.LOG_LEVEL ?? 'info');
    logger.fatal({ module: 'worker', error_code: normalizeErrorCode(error) }, 'worker stopped');
    process.exitCode = 1;
  });
}
