import type { Logger } from 'pino';

export type Job = Readonly<{
  id: string;
  tenantId: string;
  householdId: string;
  type: 'packet' | 'notification' | 'retention' | 'export' | 'purge';
  idempotencyKey: string;
  attempt: number;
}>;
export async function executeJob(
  job: Job,
  logger: Logger,
  handler: (job: Job) => Promise<void>,
): Promise<void> {
  try {
    await handler(job);
    logger.info(
      {
        job_id: job.id,
        tenant_id: job.tenantId,
        household_id: job.householdId,
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
        operation: job.type,
        result: 'failed',
        error_code: error instanceof Error ? error.name : 'UNKNOWN',
      },
      'job failed',
    );
    throw error;
  }
}
