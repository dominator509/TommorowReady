'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { responseMessage, StatusNotice, type UiStatus } from './StatusNotice';

export function RecoveryForm() {
  const [credentials, setCredentials] = useState({ tenantId: '', email: '', token: '' });
  const [status, setStatus] = useState<UiStatus>({ tone: 'idle', message: '' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    setCredentials({
      tenantId: params.get('tenantId') ?? '',
      email: params.get('email') ?? '',
      token: params.get('token') ?? '',
    });
    if (params.has('token')) history.replaceState(null, '', window.location.pathname);
  }, []);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ tone: 'loading', message: 'Requesting a recovery link…' });
    try {
      const response = await fetch('/api/auth/password/recovery/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId: data.get('tenantId'), email: data.get('email') }),
      });
      if (!response.ok)
        throw new Error(await responseMessage(response, 'Recovery could not be requested.'));
      setStatus({
        tone: 'success',
        message: 'If the account exists, a one-time link has been sent.',
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Recovery could not be requested.',
      });
    }
  }

  async function completeReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get('newPassword') !== data.get('confirmPassword')) {
      setStatus({ tone: 'error', message: 'The new passwords do not match.' });
      return;
    }
    setStatus({ tone: 'loading', message: 'Changing your password…' });
    try {
      const response = await fetch('/api/auth/password/recovery/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...credentials, newPassword: data.get('newPassword') }),
      });
      if (!response.ok)
        throw new Error(
          await responseMessage(response, 'The recovery link is invalid or expired.'),
        );
      setCredentials({ tenantId: '', email: '', token: '' });
      setStatus({ tone: 'success', message: 'Password changed. You can now sign in.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Password change failed.',
      });
    }
  }

  return credentials.token ? (
    <form className="form-card" onSubmit={completeReset}>
      <p>
        Resetting access for <strong>{credentials.email}</strong>.
      </p>
      <label htmlFor="new-password">New password</label>
      <input
        id="new-password"
        name="newPassword"
        type="password"
        minLength={12}
        maxLength={256}
        autoComplete="new-password"
        required
      />
      <label htmlFor="confirm-password">Confirm new password</label>
      <input
        id="confirm-password"
        name="confirmPassword"
        type="password"
        minLength={12}
        maxLength={256}
        autoComplete="new-password"
        required
      />
      <button className="primary-action" type="submit" disabled={status.tone === 'loading'}>
        Change password
      </button>
      <StatusNotice status={status} />
    </form>
  ) : (
    <form className="form-card" onSubmit={requestReset}>
      <label htmlFor="recovery-tenant">Household tenant ID</label>
      <input id="recovery-tenant" name="tenantId" type="text" required />
      <label htmlFor="recovery-email">Email address</label>
      <input id="recovery-email" name="email" type="email" autoComplete="username" required />
      <button className="primary-action" type="submit" disabled={status.tone === 'loading'}>
        Send recovery link
      </button>
      <StatusNotice status={status} />
    </form>
  );
}
