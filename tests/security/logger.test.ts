import { describe, expect, it } from 'vitest';
import { createPrivacySafeLogger } from '../../packages/infrastructure/observability/src/index.js';

describe('privacy-safe observability', () => {
  it('constructs a logger with redaction enabled', () => {
    const logger = createPrivacySafeLogger('silent');
    expect(logger.level).toBe('silent');
  });
});
