'use client';

import { startRegistration } from '@simplewebauthn/browser';
import { useState } from 'react';
import { responseMessage, StatusNotice, type UiStatus } from './StatusNotice';

export function PasskeyManager() {
  const [status, setStatus] = useState<UiStatus>({ tone: 'idle', message: '' });

  async function register() {
    setStatus({ tone: 'loading', message: 'Waiting for your passkey…' });
    try {
      const optionsResponse = await fetch('/api/auth/passkeys/registration/options', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (!optionsResponse.ok)
        throw new Error(await responseMessage(optionsResponse, 'Passkey setup is unavailable.'));
      const ceremony = (await optionsResponse.json()) as {
        flowId: string;
        options: Parameters<typeof startRegistration>[0]['optionsJSON'];
      };
      const credential = await startRegistration({ optionsJSON: ceremony.options });
      const response = await fetch('/api/auth/passkeys/registration/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ flowId: ceremony.flowId, response: credential }),
      });
      if (!response.ok)
        throw new Error(await responseMessage(response, 'Passkey registration failed.'));
      setStatus({ tone: 'success', message: 'Passkey registered.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Passkey registration failed.',
      });
    }
  }

  return (
    <section className="panel" aria-labelledby="passkey-heading">
      <h2 id="passkey-heading">Passkey security</h2>
      <p>Add a device-bound passkey after signing in with multi-factor authentication.</p>
      <button
        className="primary-action"
        type="button"
        onClick={() => void register()}
        disabled={status.tone === 'loading'}
      >
        Register this device
      </button>
      <StatusNotice status={status} />
    </section>
  );
}
