import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiBase, relay, requireSameOrigin, upstreamUnavailable } from '../../backend';

const allowed = new Set([
  'people',
  'dependents',
  'children',
  'pets',
  'contacts',
  'accounts',
  'assets',
  'insurance',
  'properties',
  'storage-units',
  'document-locations',
  'documents',
  'facts',
  'playbooks',
  'wishes',
  'letters',
  'videos',
  'advice',
  'photos',
  'recipes',
  'readiness',
  'family-iq',
  'packets',
  'recipients',
  'emergency-policies',
  'access-requests',
  'continuity-monitors',
  'continuity-monitors/recipient-verifications',
  'continuity-monitors/postal-addresses',
  'annual-reviews',
  'consents',
  'exports',
  'privacy/requests',
]);

async function forward(request: Request, segments: string[], method: 'GET' | 'POST') {
  const path = segments.join('/');
  const monitorAction = /^continuity-monitors\/[0-9a-f-]{36}\/actions$/i.test(path);
  if (!allowed.has(path) && !monitorAction)
    return NextResponse.json(
      { code: 'ROUTE_NOT_ALLOWED', message: 'Route is not available.' },
      { status: 404 },
    );
  const token = (await cookies()).get('tr_session')?.value;
  if (!token)
    return NextResponse.json(
      { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' },
      { status: 401 },
    );
  if (method === 'POST') {
    const rejected = requireSameOrigin(request);
    if (rejected) return rejected;
  }
  try {
    const response = await fetch(`${apiBase()}/v1/${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(method === 'POST'
          ? { 'content-type': 'application/json', 'idempotency-key': randomUUID() }
          : {}),
      },
      ...(method === 'POST' ? { body: await request.text() } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    return relay(response);
  } catch {
    return upstreamUnavailable();
  }
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path, 'GET');
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await context.params).path, 'POST');
}
