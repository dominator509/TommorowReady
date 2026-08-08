import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { hostname } from 'node:os';
import { pathToFileURL } from 'node:url';
import type { Logger } from 'pino';
import {
  RealJobQueue,
  type ClaimedDurableJob,
  type DurableJob,
} from '../../../packages/infrastructure/database/src/services.js';
import { createPrivacySafeLogger } from '../../../packages/infrastructure/observability/src/index.js';

export type Job = DurableJob & Readonly<{ attempt: number }>;
export type JobHandler = (job: Job) => Promise<void>;
export type WorkerQueue = Pick<
  RealJobQueue,
  'ready' | 'claim' | 'reclaimStale' | 'acknowledge' | 'fail' | 'close'
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

async function main(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL_REQUIRED');
  const logger = createPrivacySafeLogger(process.env.LOG_LEVEL ?? 'info');
  const queue = new RealJobQueue(redisUrl);
  const controller = new AbortController();
  const server = createWorkerHealthServer(queue, controller.signal);
  const shutdown = () => controller.abort();
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  server.listen(Number(process.env.WORKER_HEALTH_PORT ?? '4100'), process.env.HOST ?? '0.0.0.0');
  try {
    await runWorker(queue, failClosedHandler(), logger, controller.signal);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await queue.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const logger = createPrivacySafeLogger(process.env.LOG_LEVEL ?? 'info');
    logger.fatal({ module: 'worker', error_code: normalizeErrorCode(error) }, 'worker stopped');
    process.exitCode = 1;
  });
}
