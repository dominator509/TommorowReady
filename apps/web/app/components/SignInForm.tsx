'use client';

import { startAuthentication } from '@simplewebauthn/browser';
import { useState, type FormEvent } from 'react';
import { responseMessage, StatusNotice, type UiStatus } from './StatusNotice';

const idle: UiStatus = { tone: 'idle', message: '' };

export function SignInForm() {
  const [status, setStatus] = useState(idle);

  async function passwordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ tone: 'loading', message: 'Signing in…' });
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantId: data.get('tenantId'),
          email: data.get('email'),
          password: data.get('password'),
          ...(data.get('totp') ? { totp: data.get('totp') } : {}),
        }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, 'Sign-in failed.'));
      window.location.assign('/plan');
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Sign-in failed.',
      });
    }
  }

  async function passkeySignIn(form: HTMLFormElement) {
    setStatus({ tone: 'loading', message: 'Waiting for your passkey…' });
    const data = new FormData(form);
    try {
      const optionsResponse = await fetch('/api/auth/passkeys/authentication/options', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId: data.get('tenantId'), email: data.get('email') }),
      });
      if (!optionsResponse.ok)
        throw new Error(await responseMessage(optionsResponse, 'Passkey sign-in is unavailable.'));
      const ceremony = (await optionsResponse.json()) as {
        flowId: string;
        options: Parameters<typeof startAuthentication>[0]['optionsJSON'];
      };
      const credential = await startAuthentication({ optionsJSON: ceremony.options });
      const verifyResponse = await fetch('/api/auth/passkeys/authentication/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ flowId: ceremony.flowId, response: credential }),
      });
      if (!verifyResponse.ok)
        throw new Error(await responseMessage(verifyResponse, 'Passkey sign-in failed.'));
      window.location.assign('/plan');
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Passkey sign-in failed.',
      });
    }
  }

  return (
    <form className="form-card" onSubmit={passwordSignIn}>
      <label htmlFor="tenant-id">Household tenant ID</label>
      <input
        id="tenant-id"
        name="tenantId"
        type="text"
        inputMode="text"
        required
        autoComplete="organization"
      />
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" required autoComplete="username webauthn" />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        minLength={12}
        maxLength={256}
        required
        autoComplete="current-password"
      />
      <label htmlFor="totp">
        Authenticator code <span className="optional">(if configured)</span>
      </label>
      <input
        id="totp"
        name="totp"
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        autoComplete="one-time-code"
      />
      <div className="actions">
        <button className="primary-action" type="submit" disabled={status.tone === 'loading'}>
          Sign in
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={status.tone === 'loading'}
          onClick={(event) => void passkeySignIn(event.currentTarget.form!)}
        >
          Use a passkey
        </button>
      </div>
      <StatusNotice status={status} />
    </form>
  );
}
