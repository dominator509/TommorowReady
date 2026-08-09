import pino, { type DestinationStream, type Logger } from 'pino';

const forbiddenKeys = [
  'content',
  'body',
  'document',
  'prompt',
  'password',
  'secret',
  'token',
  'packetContents',
  'childDetails',
  'authorization',
  'cookie',
  'set-cookie',
];
const forbiddenKeySet = new Set(forbiddenKeys.map((key) => key.toLowerCase()));

function safeHttpBoundary(kind: 'req' | 'res', value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  if (kind === 'res')
    return typeof source.statusCode === 'number' ? { statusCode: source.statusCode } : {};
  const output: Record<string, unknown> = {};
  for (const key of ['id', 'method', 'url', 'hostname', 'ip'] as const) {
    const candidate = source[key];
    if (typeof candidate === 'string' && candidate.length <= 2_048) output[key] = candidate;
  }
  return output;
}

function sanitizeLogValue(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (depth > 12) return '[TRUNCATED]';
  if (value instanceof Error) return { name: value.name, error_code: value.name.toUpperCase() };
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeLogValue(item, seen, depth + 1));
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'req' || key === 'res') output[key] = safeHttpBoundary(key, child);
    else
      output[key] = forbiddenKeySet.has(key.toLowerCase())
        ? '[REDACTED]'
        : sanitizeLogValue(child, seen, depth + 1);
  }
  return output;
}

export function createPrivacySafeLogger(level = 'info', destination?: DestinationStream): Logger {
  const options = {
    level,
    redact: {
      paths: forbiddenKeys
        .flatMap((key) => [key, `*.${key}`])
        .concat([
          'req.headers.authorization',
          'req.headers.cookie',
          'request.headers.authorization',
          'request.headers.cookie',
          'response.headers.set-cookie',
        ]),
      censor: '[REDACTED]' as const,
    },
    base: null,
    messageKey: 'message' as const,
    hooks: {
      logMethod(inputArgs: unknown[], method: (...args: unknown[]) => void) {
        return method.apply(
          this,
          inputArgs.map((value) => sanitizeLogValue(value)),
        );
      },
    },
  };
  return destination ? pino(options, destination) : pino(options);
}

export type OperationalEvent = Readonly<{
  request_id: string;
  trace_id: string;
  tenant_id?: string;
  household_id?: string;
  actor_id?: string;
  module: string;
  operation: string;
  result: 'ok' | 'denied' | 'error' | 'manual_review';
  latency_ms: number;
  provider?: string;
  job_id?: string;
  packet_id?: string;
  error_code?: string;
}>;

export function operationalEvent(event: OperationalEvent): OperationalEvent {
  if (!Number.isFinite(event.latency_ms) || event.latency_ms < 0)
    throw new Error('OBSERVABILITY_LATENCY_INVALID');
  if (!event.request_id || !event.trace_id || !event.module || !event.operation)
    throw new Error('OBSERVABILITY_CONTEXT_REQUIRED');
  return Object.freeze({ ...event });
}

export type OperationalMetric = Readonly<{
  name: OperationalMetricName;
  value: number;
  labels: Readonly<Record<string, string>>;
}>;
export type OperationalMetricName = (typeof operationalMetricNames)[number];
export const operationalMetricNames = [
  'authentication_total',
  'authorization_denials_total',
  'cross_tenant_attempts_total',
  'uploads_total',
  'malware_results_total',
  'packet_generation_total',
  'release_transitions_total',
  'continuity_monitor_actions_total',
  'continuity_scheduler_lag_seconds',
  'owner_notifications_total',
  'physical_mail_orders_total',
  'physical_mail_events_total',
  'manual_reviews_total',
  'ai_cache_tokens_total',
  'ai_cost_total',
  'queue_age_seconds',
  'backup_total',
  'restore_total',
  'deletion_total',
] as const;
const allowedMetricLabels = new Set(['module', 'operation', 'result', 'provider', 'error_code']);
export class Metrics {
  readonly values: OperationalMetric[] = [];
  record(metric: OperationalMetric): void {
    if (!operationalMetricNames.includes(metric.name)) throw new Error('METRIC_NAME_NOT_ALLOWED');
    if (!Number.isFinite(metric.value)) throw new Error('METRIC_VALUE_INVALID');
    if (Object.keys(metric.labels).some((key) => !allowedMetricLabels.has(key)))
      throw new Error('METRIC_LABEL_NOT_ALLOWED');
    this.values.push(Object.freeze({ ...metric, labels: Object.freeze({ ...metric.labels }) }));
  }
}

export type OperationalAlert =
  | 'unauthorized-release-attempt'
  | 'unusual-recipient-velocity'
  | 'owner-notification-failure'
  | 'continuity-scheduler-lag'
  | 'physical-mail-ambiguous-submission'
  | 'physical-mail-delivery-failure'
  | 'packet-isolation-failure'
  | 'verification-ambiguity'
  | 'kms-failure'
  | 'backup-failure'
  | 'purge-failure'
  | 'malware-spike'
  | 'cross-tenant-denial-spike';

const alertRunbooks: Readonly<Record<OperationalAlert, string>> = {
  'unauthorized-release-attempt': 'fraudulent-emergency-request',
  'unusual-recipient-velocity': 'fraudulent-emergency-request',
  'owner-notification-failure': 'owner-notice-failure',
  'continuity-scheduler-lag': 'continuity-scheduler-lag',
  'physical-mail-ambiguous-submission': 'physical-mail-ambiguity',
  'physical-mail-delivery-failure': 'physical-mail-delivery-failure',
  'packet-isolation-failure': 'unauthorized-packet-exposure',
  'verification-ambiguity': 'fraudulent-emergency-request',
  'kms-failure': 'kms-failure',
  'backup-failure': 'backup-failure',
  'purge-failure': 'deletion-failure',
  'malware-spike': 'malware-event',
  'cross-tenant-denial-spike': 'unauthorized-packet-exposure',
};

export function runbookForAlert(alert: OperationalAlert): string {
  return alertRunbooks[alert];
}
