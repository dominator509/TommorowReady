'use client';

import { useState, type FormEvent } from 'react';
import { responseMessage, StatusNotice, type UiStatus } from './StatusNotice';

export function PrivacyRequestForm() {
  const [status, setStatus] = useState<UiStatus>({ tone: 'idle', message: '' });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ tone: 'loading', message: 'Submitting your privacy request…' });
    try {
      const response = await fetch('/api/continuity/privacy/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: data.get('type'), details: data.get('details') }),
      });
      if (!response.ok)
        throw new Error(await responseMessage(response, 'The request could not be submitted.'));
      form.reset();
      setStatus({ tone: 'success', message: 'Request received and recorded for review.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'The request could not be submitted.',
      });
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <label htmlFor="privacy-type">Request type</label>
      <select id="privacy-type" name="type" required defaultValue="">
        <option value="" disabled>
          Select a request
        </option>
        <option value="access">Access my data</option>
        <option value="correct">Correct my data</option>
        <option value="export">Export my data</option>
        <option value="delete">Delete my data</option>
      </select>
      <label htmlFor="privacy-details">Details</label>
      <textarea id="privacy-details" name="details" maxLength={1000} required />
      <button className="primary-action" type="submit" disabled={status.tone === 'loading'}>
        Submit request
      </button>
      <StatusNotice status={status} />
    </form>
  );
}
