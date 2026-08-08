const configured = process.env.PRODUCTION_BASE_URL;
if (!configured) throw new Error('PRODUCTION_BASE_URL_REQUIRED');
const baseUrl = new URL(configured);
if (baseUrl.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname))
  throw new Error('PRODUCTION_BASE_URL_INVALID');
if (baseUrl.username || baseUrl.password)
  throw new Error('PRODUCTION_BASE_URL_CREDENTIALS_FORBIDDEN');

async function probe(path: string): Promise<Response> {
  const expected = new URL(path, baseUrl);
  const response = await fetch(expected, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`PRODUCTION_SMOKE_${path}_${response.status}`);
  if (new URL(response.url).origin !== baseUrl.origin)
    throw new Error('PRODUCTION_SMOKE_REDIRECT_ORIGIN');
  return response;
}

const health = await probe('/api/health');
const healthPayload = (await health.json()) as { status?: unknown; service?: unknown };
if (healthPayload.status !== 'ok' || healthPayload.service !== 'web')
  throw new Error('PRODUCTION_SMOKE_HEALTH_PAYLOAD_INVALID');
const home = await probe('/');
for (const [header, expected] of [
  ['x-content-type-options', 'nosniff'],
  ['x-frame-options', 'DENY'],
  ['cross-origin-opener-policy', 'same-origin'],
] as const) {
  if (home.headers.get(header) !== expected) throw new Error(`PRODUCTION_SMOKE_HEADER_${header}`);
}
if (!home.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"))
  throw new Error('PRODUCTION_SMOKE_CSP_INVALID');
if (!home.headers.get('strict-transport-security')?.includes('max-age='))
  throw new Error('PRODUCTION_SMOKE_HSTS_INVALID');
console.log('production smoke: ok');
