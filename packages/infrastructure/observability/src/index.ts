import pino, { type Logger } from 'pino';

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
];
export function createPrivacySafeLogger(level = 'info'): Logger {
  return pino({
    level,
    redact: {
      paths: forbiddenKeys.map((key) => `*.${key}`).concat(forbiddenKeys),
      censor: '[REDACTED]',
    },
    base: null,
    messageKey: 'message',
  });
}
export type OperationalMetric = Readonly<{
  name: string;
  value: number;
  labels: Readonly<Record<string, string>>;
}>;
export class Metrics {
  readonly values: OperationalMetric[] = [];
  record(metric: OperationalMetric): void {
    this.values.push(Object.freeze({ ...metric, labels: Object.freeze({ ...metric.labels }) }));
  }
}
