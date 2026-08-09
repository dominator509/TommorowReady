import { NextResponse } from 'next/server';
import { apiBase, requireSameOrigin, safePayload, upstreamUnavailable } from '../../backend';

export async function POST(request: Request) {
  const rejected = requireSameOrigin(request);
  if (rejected) return rejected;
  try {
    const response = await fetch(`${apiBase()}/v1/releases/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: await request.text(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      return NextResponse.json(await safePayload(response), { status: response.status });
    return new NextResponse(await response.arrayBuffer(), {
      status: 200,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/pdf',
        'content-disposition':
          response.headers.get('content-disposition') ??
          'attachment; filename="tomorrowready-packet.pdf"',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return upstreamUnavailable();
  }
}
