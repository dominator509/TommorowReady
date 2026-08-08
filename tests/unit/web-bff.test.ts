import { afterEach, describe, expect, it, vi } from 'vitest';
import { relay, requireSameOrigin } from '../../apps/web/app/api/backend.js';
import { GET as webHealth } from '../../apps/web/app/api/health/route.js';

describe('web backend-for-frontend boundary', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('relays no-content responses without constructing an invalid JSON body', async () => {
    const response = await relay(new Response(null, { status: 204 }));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('fails web readiness closed when the API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unavailable')));
    const response = await webHealth();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
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
