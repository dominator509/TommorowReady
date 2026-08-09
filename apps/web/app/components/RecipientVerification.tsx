'use client';

import { useEffect, useState } from 'react';
import { responseMessage, StatusNotice, type UiStatus } from './StatusNotice';

export function RecipientVerification(
  props: Readonly<{
    tenantId: string;
    householdId: string;
    profileId: string;
    token: string;
  }>,
) {
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const [status, setStatus] = useState<UiStatus>({
    tone: 'idle',
    message: 'Confirm that this email address belongs to the intended packet recipient.',
  });
  async function verify() {
    setStatus({ tone: 'loading', message: 'Verifying recipient address…' });
    try {
      const response = await fetch('/api/recipient/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(props),
      });
      if (!response.ok)
        throw new Error(await responseMessage(response, 'Recipient verification failed.'));
      setStatus({
        tone: 'success',
        message: 'Recipient delivery address verified. You may close this page.',
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Recipient verification failed.',
      });
    }
  }
  return (
    <section className="panel narrow-panel" aria-labelledby="recipient-verification-heading">
      <h1 id="recipient-verification-heading">Verify packet delivery</h1>
      <p>
        Verification does not reveal a household or packet. It only confirms this delivery channel.
      </p>
      <StatusNotice status={status} />
      <button className="button" type="button" onClick={() => void verify()}>
        Verify delivery address
      </button>
    </section>
  );
}
