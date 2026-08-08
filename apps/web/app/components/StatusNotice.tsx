export type UiStatus = Readonly<{
  tone: 'idle' | 'loading' | 'success' | 'error' | 'warning';
  message: string;
}>;

export function StatusNotice({ status }: { status: UiStatus }) {
  if (status.tone === 'idle') return null;
  return (
    <p
      className={`status status-${status.tone}`}
      role={status.tone === 'error' ? 'alert' : 'status'}
      aria-live={status.tone === 'error' ? 'assertive' : 'polite'}
    >
      {status.message}
    </p>
  );
}

export async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: unknown };
    return typeof payload.message === 'string' ? payload.message : fallback;
  } catch {
    return fallback;
  }
}
