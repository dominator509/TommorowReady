'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { responseMessage, StatusNotice, type UiStatus } from './StatusNotice';

type RecordItem = Readonly<{ id?: string; payload?: Readonly<Record<string, unknown>> }>;
type Collection = 'people' | 'accounts';

function title(item: RecordItem, fallback: string): string {
  for (const key of ['name', 'label', 'title']) {
    const value = item.payload?.[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

export function PlanWorkbench() {
  const [active, setActive] = useState<Collection>('people');
  const [records, setRecords] = useState<Record<Collection, readonly RecordItem[]>>({
    people: [],
    accounts: [],
  });
  const [status, setStatus] = useState<UiStatus>({
    tone: 'loading',
    message: 'Loading your private plan…',
  });
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    setStatus({ tone: 'loading', message: 'Refreshing your plan…' });
    try {
      const [people, accounts] = await Promise.all([
        fetch('/api/continuity/people', { cache: 'no-store' }),
        fetch('/api/continuity/accounts', { cache: 'no-store' }),
      ]);
      if (people.status === 401 || accounts.status === 401) {
        setStatus({ tone: 'warning', message: 'Your session ended. Sign in again to continue.' });
        return;
      }
      if (people.status === 403 || accounts.status === 403) {
        setStatus({
          tone: 'error',
          message: 'Your account does not have permission to view this plan.',
        });
        return;
      }
      if (!people.ok || !accounts.ok)
        throw new Error(
          await responseMessage(!people.ok ? people : accounts, 'Your plan could not be loaded.'),
        );
      setRecords({
        people: (await people.json()) as RecordItem[],
        accounts: (await accounts.json()) as RecordItem[],
      });
      setLoadedAt(new Date());
      setStatus({ tone: 'success', message: 'Your latest saved records are shown.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Your plan could not be loaded.',
      });
    }
  }, []);

  useEffect(() => {
    if (window.location.hash === '#accounts') setActive('accounts');
    const updateNetwork = () => setOffline(!navigator.onLine);
    updateNetwork();
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    void load();
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
    };
  }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (offline) {
      setStatus({ tone: 'warning', message: 'You are offline. Nothing was submitted.' });
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload =
      active === 'people'
        ? {
            name: data.get('name'),
            relationship: data.get('relationship'),
            guidance: data.get('guidance'),
          }
        : {
            label: data.get('label'),
            institution: data.get('institution'),
            locator: data.get('locator'),
            retrievalGuidance: data.get('guidance'),
          };
    setStatus({ tone: 'loading', message: 'Saving your record…' });
    try {
      const response = await fetch(`/api/continuity/${active}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok)
        throw new Error(await responseMessage(response, 'The record could not be saved.'));
      form.reset();
      await load();
      setStatus({ tone: 'success', message: 'Record saved and confirmed by the service.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'The record could not be saved.',
      });
    }
  }

  async function signOut() {
    await fetch('/api/session', { method: 'DELETE' });
    window.location.assign('/sign-in');
  }

  return (
    <>
      <div className="workbench-toolbar" aria-label="Plan controls" id="accounts">
        <div className="tab-list" role="tablist" aria-label="Record type">
          <button
            role="tab"
            aria-selected={active === 'people'}
            onClick={() => setActive('people')}
          >
            People
          </button>
          <button
            role="tab"
            aria-selected={active === 'accounts'}
            onClick={() => setActive('accounts')}
          >
            Account locators
          </button>
        </div>
        <button className="text-button" type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
      {offline ? (
        <p className="status status-warning" role="status">
          Offline — saved records remain visible, but writes are disabled.
        </p>
      ) : null}
      <StatusNotice status={status} />
      {loadedAt ? (
        <p className="freshness">
          Last confirmed {loadedAt.toLocaleTimeString()}.{' '}
          <button className="text-button" type="button" onClick={() => void load()}>
            Refresh
          </button>
        </p>
      ) : null}

      <div className="workbench-grid">
        <section className="panel" aria-labelledby="records-heading">
          <h2 id="records-heading">
            {active === 'people' ? 'People in your plan' : 'Account locations'}
          </h2>
          {records[active].length === 0 ? (
            <p className="empty-state">No confirmed records yet.</p>
          ) : (
            <ul className="record-list">
              {records[active].map((item, index) => (
                <li key={item.id ?? index}>
                  {title(item, `Record ${index + 1}`)}
                  <span>Confirmed</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <form className="form-card" onSubmit={save} aria-labelledby="add-heading">
          <h2 id="add-heading">Add {active === 'people' ? 'a person' : 'an account locator'}</h2>
          {active === 'people' ? (
            <>
              <label htmlFor="person-name">Name</label>
              <input id="person-name" name="name" maxLength={120} required />
              <label htmlFor="relationship">Relationship or role</label>
              <input id="relationship" name="relationship" maxLength={120} required />
            </>
          ) : (
            <>
              <label htmlFor="account-label">Account label</label>
              <input id="account-label" name="label" maxLength={120} required />
              <label htmlFor="institution">Institution</label>
              <input id="institution" name="institution" maxLength={120} required />
              <label htmlFor="locator">Where it can be found</label>
              <input
                id="locator"
                name="locator"
                maxLength={240}
                required
                aria-describedby="no-secrets"
              />
            </>
          )}
          <label htmlFor="guidance">Retrieval guidance</label>
          <textarea id="guidance" name="guidance" rows={4} maxLength={1000} />
          <p id="no-secrets" className="field-help">
            Never enter passwords, PINs, private keys, recovery phrases, or safe combinations.
          </p>
          <button
            className="primary-action"
            type="submit"
            disabled={offline || status.tone === 'loading'}
          >
            Save record
          </button>
        </form>
      </div>
    </>
  );
}
