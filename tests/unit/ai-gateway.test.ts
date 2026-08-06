import { describe, expect, it } from 'vitest';
import { AiPolicyGateway } from '../../packages/infrastructure/ai-gateway/src/index.js';

const request = {
  tenantId: crypto.randomUUID(),
  householdId: crypto.randomUUID(),
  consentVersion: 'v1',
  purpose: 'summarize' as const,
  promptFamily: 'household-summary',
  promptVersion: 'v1',
  stableEntityVersion: '1',
  content: 'Water shutoff is labeled in the garage.',
  evidenceIds: [crypto.randomUUID()],
};
describe('AI policy gateway', () => {
  it('uses tenant, consent, and versions in cache isolation', () => {
    const gateway = new AiPolicyGateway(null);
    expect(gateway.cacheKey(request)).not.toBe(
      gateway.cacheKey({ ...request, tenantId: crypto.randomUUID() }),
    );
    expect(gateway.cacheKey(request)).not.toBe(
      gateway.cacheKey({ ...request, consentVersion: 'v2' }),
    );
  });
  it('fails closed when provider is disabled', async () => {
    await expect(new AiPolicyGateway(null).execute(request)).rejects.toThrow(
      'AI_PROVIDER_DISABLED',
    );
  });
  it('blocks prohibited secrets before the provider boundary', async () => {
    let called = false;
    const gateway = new AiPolicyGateway({
      name: 'contract',
      async complete() {
        called = true;
        throw new Error('unexpected');
      },
    });
    await expect(
      gateway.execute({ ...request, content: 'seed phrase: alpha beta gamma delta' }),
    ).rejects.toThrow('Use a locator instruction');
    expect(called).toBe(false);
  });
});
