import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  apiBase,
  relay,
  requireSameOrigin,
  safePayload,
  setSessionCookie,
  upstreamUnavailable,
} from '../../backend';

const publicRoutes = new Set([
  'password/recovery/request',
  'password/recovery/complete',
  'passkeys/authentication/options',
  'passkeys/authentication/verify',
]);
const authenticatedRoutes = new Set([
  'passkeys/registration/options',
  'passkeys/registration/verify',
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const rejected = requireSameOrigin(request);
  if (rejected) return rejected;
  const path = (await context.params).path.join('/');
  if (!publicRoutes.has(path) && !authenticatedRoutes.has(path))
    return NextResponse.json(
      { code: 'ROUTE_NOT_ALLOWED', message: 'Route is not available.' },
      { status: 404 },
    );

  const token = (await cookies()).get('tr_session')?.value;
  if (authenticatedRoutes.has(path) && !token)
    return NextResponse.json(
      { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' },
      { status: 401 },
    );

  try {
    const response = await fetch(`${apiBase()}/v1/auth/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: await request.text(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return relay(response);
    if (path !== 'passkeys/authentication/verify') return relay(response);

    const payload = (await safePayload(response)) as Record<string, unknown>;
    if (typeof payload.accessToken !== 'string')
      return NextResponse.json(
        { code: 'UPSTREAM_RESPONSE_INVALID', message: 'Authentication could not be completed.' },
        { status: 502 },
      );
    const result = NextResponse.json({
      status: 'authenticated',
      assurance: payload.assurance,
      expiresAt: payload.expiresAt,
    });
    setSessionCookie(result, payload.accessToken);
    return result;
  } catch {
    return upstreamUnavailable();
  }
}
