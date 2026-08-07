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
  'owner_notifications_total',
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
