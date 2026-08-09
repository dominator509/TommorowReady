'use client';

import { useEffect, useState } from 'react';
import { responseMessage, StatusNotice, type UiStatus } from './StatusNotice';

export function RecipientRelease(
  props: Readonly<{
    tenantId: string;
    householdId: string;
    tokenId: string;
    token: string;
  }>,
) {
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const [status, setStatus] = useState<UiStatus>({
    tone: 'idle',
    message: 'This expiring link retrieves only the packet assigned to you.',
  });
  async function download() {
    setStatus({ tone: 'loading', message: 'Preparing your verified packet…' });
    try {
      const response = await fetch('/api/recipient/release', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(props),
      });
      if (!response.ok)
        throw new Error(await responseMessage(response, 'The release link is invalid or expired.'));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'tomorrowready-packet.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus({ tone: 'success', message: 'Your packet download started.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'The packet could not be downloaded.',
      });
    }
  }
  return (
    <section className="panel narrow-panel" aria-labelledby="recipient-release-heading">
      <h1 id="recipient-release-heading">Your TomorrowReady packet</h1>
      <p>
        The packet is recipient-scoped and may contain sensitive continuity instructions. Download
        it only on a trusted device.
      </p>
      <StatusNotice status={status} />
      <button className="button" type="button" onClick={() => void download()}>
        Download my packet
      </button>
    </section>
  );
}
