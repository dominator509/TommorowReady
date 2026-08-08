import { describe, expect, it } from 'vitest';
import { relay, requireSameOrigin } from '../../apps/web/app/api/backend.js';

describe('web backend-for-frontend boundary', () => {
  it('relays no-content responses without constructing an invalid JSON body', async () => {
    const response = await relay(new Response(null, { status: 204 }));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('accepts only the configured or request-host origin for mutations', () => {
    const accepted = new Request('http://internal-render-host/api/session', {
      method: 'POST',
      headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
    });
    const rejected = new Request('http://internal-render-host/api/session', {
      method: 'POST',
      headers: { host: 'localhost:3000', origin: 'https://attacker.invalid' },
    });
    const missing = new Request('http://localhost:3000/api/session', { method: 'POST' });
    expect(requireSameOrigin(accepted)).toBeNull();
    expect(requireSameOrigin(rejected)?.status).toBe(403);
    expect(requireSameOrigin(missing)?.status).toBe(403);
  });
});
