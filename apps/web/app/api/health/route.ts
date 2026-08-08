import { NextResponse } from 'next/server';
import { apiBase, safePayload, upstreamUnavailable } from '../backend';

export async function GET(): Promise<NextResponse> {
  try {
    const response = await fetch(`${apiBase()}/health/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok)
      return NextResponse.json(
        { status: 'unavailable', service: 'web', dependency: 'api' },
        { status: 503 },
      );
    const payload = (await safePayload(response)) as Record<string, unknown> | null;
    if (payload?.status !== 'ok') return upstreamUnavailable();
    return NextResponse.json(
      { status: 'ok', service: 'web' },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return upstreamUnavailable();
  }
}
