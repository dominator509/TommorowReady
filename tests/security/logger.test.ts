import { describe, expect, it } from 'vitest';
import { Writable } from 'node:stream';
import {
  createPrivacySafeLogger,
  Metrics,
  operationalEvent,
  runbookForAlert,
} from '../../packages/infrastructure/observability/src/index.js';

describe('privacy-safe observability', () => {
  it('constructs a logger with redaction enabled', () => {
    const logger = createPrivacySafeLogger('silent');
    expect(logger.level).toBe('silent');
  });
  it('redacts credentials and content at common structured-log boundaries', () => {
    let output = '';
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });
    const logger = createPrivacySafeLogger('info', sink);
    logger.info(
      {
        req: {
          method: 'POST',
          url: '/v1/auth/password/session',
          headers: { authorization: 'Bearer forbidden', cookie: 'session=bad' },
        },
        content: 'private body',
        deeply: { nested: { secret: 'deeply forbidden', packetContents: 'packet private' } },
        error: new Error('credential-bearing provider response'),
      },
      'request',
    );
    expect(output).not.toContain('forbidden');
    expect(output).not.toContain('session=bad');
    expect(output).not.toContain('private body');
    expect(output).not.toContain('deeply forbidden');
    expect(output).not.toContain('packet private');
    expect(output).not.toContain('credential-bearing provider response');
    expect(output).toContain('/v1/auth/password/session');
    expect(output).toContain('[REDACTED]');
  });
  it('bounds metric names and labels to low-cardinality operational data', () => {
    const metrics = new Metrics();
    metrics.record({ name: 'queue_age_seconds', value: 4, labels: { module: 'worker' } });
    expect(metrics.values).toHaveLength(1);
    expect(() =>
      metrics.record({ name: 'queue_age_seconds', value: 4, labels: { tenant_id: 'secret' } }),
    ).toThrow('METRIC_LABEL_NOT_ALLOWED');
  });
  it('requires trace context and maps every security signal to a runbook', () => {
    expect(
      operationalEvent({
        request_id: crypto.randomUUID(),
        trace_id: crypto.randomUUID(),
        module: 'release',
        operation: 'approve',
        result: 'denied',
        latency_ms: 12,
        error_code: 'RELEASE_POLICY_UNSATISFIED',
      }).result,
    ).toBe('denied');
    expect(runbookForAlert('packet-isolation-failure')).toBe('unauthorized-packet-exposure');
    expect(runbookForAlert('continuity-scheduler-lag')).toBe('continuity-scheduler-lag');
    expect(runbookForAlert('physical-mail-ambiguous-submission')).toBe('physical-mail-ambiguity');
  });
});
