import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  apiBase,
  relay,
  requireSameOrigin,
  safePayload,
  setSessionCookie,
  upstreamUnavailable,
} from '../backend';

export async function POST(request: Request): Promise<NextResponse> {
  const rejected = requireSameOrigin(request);
  if (rejected) return rejected;
  let response: Response;
  try {
    response = await fetch(`${apiBase()}/v1/auth/password/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(await request.json()),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return upstreamUnavailable();
  }
  if (!response.ok) return relay(response);
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
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const rejected = requireSameOrigin(request);
  if (rejected) return rejected;
  const jar = await cookies();
  const token = jar.get('tr_session')?.value;
  if (token) {
    try {
      await fetch(`${apiBase()}/v1/auth/logout`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // Local cookie invalidation must still complete when the upstream session is unavailable.
    }
  }
  const response = NextResponse.json({ status: 'signed-out' });
  response.cookies.delete('tr_session');
  return response;
}

export async function GET(): Promise<NextResponse> {
  const token = (await cookies()).get('tr_session')?.value;
  return NextResponse.json(
    { authenticated: Boolean(token) },
    { headers: { 'cache-control': 'no-store' } },
  );
}
