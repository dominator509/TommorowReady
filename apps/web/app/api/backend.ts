import { NextResponse } from 'next/server';

export const apiBase = (): string => {
  const value = process.env.API_BASE_URL;
  if (!value) throw new Error('API_BASE_URL_REQUIRED');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('API_BASE_URL_INVALID');
  return url.toString().replace(/\/$/, '');
};

export function requireSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  let expected: string | null = null;
  try {
    expected = process.env.APP_BASE_URL
      ? new URL(process.env.APP_BASE_URL).origin
      : host
        ? `${new URL(request.url).protocol}//${host}`
        : null;
  } catch {
    expected = null;
  }
  if (origin && expected && origin === expected) return null;
  return NextResponse.json(
    { code: 'ORIGIN_REJECTED', message: 'The request origin is not allowed.' },
    { status: 403 },
  );
}

export function upstreamUnavailable(): NextResponse {
  return NextResponse.json(
    { code: 'UPSTREAM_UNAVAILABLE', message: 'The service is temporarily unavailable.' },
    { status: 503 },
  );
}

export async function safePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      code: 'UPSTREAM_RESPONSE_INVALID',
      message: 'The service returned an invalid response.',
    };
  }
}

export async function relay(response: Response): Promise<NextResponse> {
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await safePayload(response), { status: response.status });
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set('tr_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60,
  });
}
