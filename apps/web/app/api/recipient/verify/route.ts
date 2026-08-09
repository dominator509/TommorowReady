import { NextResponse } from 'next/server';
import { apiBase, relay, requireSameOrigin, upstreamUnavailable } from '../../backend';

export async function POST(request: Request) {
  const rejected = requireSameOrigin(request);
  if (rejected) return rejected;
  try {
    const response = await fetch(
      `${apiBase()}/v1/continuity-monitors/recipient-verifications/complete`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: await request.text(),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      },
    );
    return relay(response);
  } catch {
    return upstreamUnavailable();
  }
}
