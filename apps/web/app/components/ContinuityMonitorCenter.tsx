'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { responseMessage, StatusNotice, type UiStatus } from './StatusNotice';

type StoredRecord = Readonly<{
  id?: string;
  payload?: Readonly<Record<string, unknown>>;
}>;

const stringValue = (value: unknown): string => (typeof value === 'string' ? value : '');

export function ContinuityMonitorCenter() {
  const [packets, setPackets] = useState<readonly StoredRecord[]>([]);
  const [monitors, setMonitors] = useState<readonly StoredRecord[]>([]);
  const [packetIndex, setPacketIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [checkInDays, setCheckInDays] = useState(30);
  const [graceHours, setGraceHours] = useState(168);
  const [releaseDelayHours, setReleaseDelayHours] = useState(24);
  const [physicalMail, setPhysicalMail] = useState(false);
  const [provider, setProvider] = useState<'lob' | 'postgrid'>('lob');
  const [mailMode, setMailMode] = useState('SECURE_ACCESS_LETTER');
  const [mailService, setMailService] = useState('FIRST_CLASS');
  const [addressId, setAddressId] = useState('');
  const [address, setAddress] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    countryCode: 'US',
  });
  const [status, setStatus] = useState<UiStatus>({
    tone: 'idle',
    message: 'The continuity monitor is optional and remains disabled until you test and arm it.',
  });

  const selectedPacket = packets[packetIndex];
  const packetId = stringValue(selectedPacket?.payload?.packetId);
  const recipientId = stringValue(selectedPacket?.payload?.recipientId);

  const load = useCallback(async () => {
    const [packetResponse, monitorResponse] = await Promise.all([
      fetch('/api/continuity/packets', { cache: 'no-store' }),
      fetch('/api/continuity/continuity-monitors', { cache: 'no-store' }),
    ]);
    if (!packetResponse.ok || !monitorResponse.ok) return;
    setPackets((await packetResponse.json()) as StoredRecord[]);
    setMonitors((await monitorResponse.json()) as StoredRecord[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedDescription = useMemo(() => {
    if (!selectedPacket) return 'No packet is available.';
    return `${stringValue(selectedPacket.payload?.purpose) || 'Recipient packet'} for ${recipientId || 'recipient'}`;
  }, [recipientId, selectedPacket]);

  async function post(path: string, body: unknown, success: string): Promise<Response | null> {
    setStatus({ tone: 'loading', message: 'Saving continuity controls…' });
    try {
      const response = await fetch(`/api/continuity/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok)
        throw new Error(await responseMessage(response, 'The change was rejected.'));
      setStatus({ tone: 'success', message: success });
      await load();
      return response;
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'The change could not be saved.',
      });
      return null;
    }
  }

  async function verifyRecipient() {
    if (!recipientId) return;
    await post(
      'continuity-monitors/recipient-verifications',
      { recipientId, email },
      'Verification email sent. Create the monitor after the recipient confirms it.',
    );
  }

  async function verifyPostalAddress() {
    if (!recipientId) return;
    const response = await post(
      'continuity-monitors/postal-addresses',
      { recipientId, provider, ...address },
      'Postal address verified by the selected provider.',
    );
    if (response) {
      const result = (await response.json()) as { id?: string };
      setAddressId(result.id ?? '');
    }
  }

  async function createMonitor() {
    if (!packetId || !recipientId) return;
    await post(
      'continuity-monitors',
      {
        packetId,
        recipientId,
        checkInIntervalDays: checkInDays,
        reminderOffsetsHours: [0, 24, 72].filter((offset) => offset < graceHours),
        gracePeriodHours: graceHours,
        releaseDelayHours,
        digitalDelivery: true,
        ...(physicalMail
          ? {
              physicalMail: {
                addressId,
                provider,
                mode: mailMode,
                service: mailService,
              },
            }
          : {}),
      },
      'Continuity monitor created disabled. Run its test before arming.',
    );
  }

  async function action(monitorId: string, actionName: string) {
    await post(
      `continuity-monitors/${monitorId}/actions`,
      { action: actionName, ...(actionName === 'SNOOZE' ? { snoozeHours: 24 } : {}) },
      `Continuity monitor action completed: ${actionName.toLowerCase().replace('_', ' ')}.`,
    );
  }

  return (
    <section className="panel" aria-labelledby="continuity-monitor-heading">
      <p className="eyebrow">Optional automation</p>
      <h2 id="continuity-monitor-heading">Continuity monitor</h2>
      <p>
        If repeated check-ins are missed, TomorrowReady can release only the exact packet and
        recipient selected here after reminders, grace, a recent test, and a final safety check. AI
        and support staff cannot approve it.
      </p>
      <StatusNotice status={status} />
      <div className="form-grid">
        <label>
          Recipient packet
          <select
            value={packetIndex}
            onChange={(event) => setPacketIndex(Number(event.target.value))}
          >
            {packets.map((packet, index) => (
              <option key={packet.id ?? index} value={index}>
                {stringValue(packet.payload?.purpose) || `Packet ${index + 1}`}
              </option>
            ))}
          </select>
          <span className="field-help">{selectedDescription}</span>
        </label>
        <label>
          Verified recipient email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>
        <button className="button secondary" type="button" onClick={() => void verifyRecipient()}>
          Send verification email
        </button>
        <label>
          Check in every (days)
          <input
            type="number"
            min="1"
            max="365"
            value={checkInDays}
            onChange={(event) => setCheckInDays(Number(event.target.value))}
          />
        </label>
        <label>
          Reminder and grace window (hours)
          <input
            type="number"
            min="24"
            max="720"
            value={graceHours}
            onChange={(event) => setGraceHours(Number(event.target.value))}
          />
        </label>
        <label>
          Final release delay (hours)
          <input
            type="number"
            min="0"
            max="168"
            value={releaseDelayHours}
            onChange={(event) => setReleaseDelayHours(Number(event.target.value))}
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={physicalMail}
            onChange={(event) => setPhysicalMail(event.target.checked)}
          />
          Add automatic postal delivery
        </label>
      </div>
      {physicalMail ? (
        <fieldset className="nested-panel">
          <legend>Physical mail</legend>
          <p>
            Postal mail may become impossible to recall after provider acceptance. The address must
            be verified before the monitor can be created.
          </p>
          <div className="form-grid">
            <label>
              Provider
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value as 'lob' | 'postgrid')}
              >
                <option value="lob">Lob</option>
                <option value="postgrid">PostGrid</option>
              </select>
            </label>
            <label>
              Mailing mode
              <select value={mailMode} onChange={(event) => setMailMode(event.target.value)}>
                <option value="SECURE_ACCESS_LETTER">Secure access letter</option>
                <option value="SELECTED_INSTRUCTIONS">Selected instructions</option>
                <option value="FULL_ELIGIBLE_PACKET">Full eligible packet</option>
              </select>
            </label>
            <label>
              Postal service
              <select value={mailService} onChange={(event) => setMailService(event.target.value)}>
                <option value="FIRST_CLASS">First class</option>
                <option value="CERTIFIED">Certified</option>
                <option value="CERTIFIED_RETURN_RECEIPT">Certified return receipt</option>
                <option value="REGISTERED">Registered</option>
              </select>
            </label>
            {Object.entries(address).map(([key, value]) => (
              <label key={key}>
                {key.replace(/([A-Z])/g, ' $1')}
                <input
                  value={value}
                  onChange={(event) =>
                    setAddress((current) => ({ ...current, [key]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <button
            className="button secondary"
            type="button"
            onClick={() => void verifyPostalAddress()}
          >
            Verify postal address
          </button>
          {addressId ? <p className="field-help">Verified address reference: {addressId}</p> : null}
        </fieldset>
      ) : null}
      <button
        className="button"
        type="button"
        disabled={!packetId || !email || (physicalMail && !addressId)}
        onClick={() => void createMonitor()}
      >
        Create disabled monitor
      </button>
      <div className="packet-grid" aria-live="polite">
        {monitors.map((monitor, index) => {
          const payload = monitor.payload ?? {};
          const id = monitor.id ?? '';
          const state = stringValue(payload.state) || 'DISABLED';
          return (
            <article className="nested-panel" key={id || index}>
              <h3>Monitor {index + 1}</h3>
              <p>
                <strong>Status:</strong> {state.replaceAll('_', ' ')}
              </p>
              <p>
                <strong>Next action:</strong> {stringValue(payload.nextActionAt) || 'Not scheduled'}
              </p>
              <div className="button-row">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => void action(id, 'TEST')}
                >
                  Test
                </button>
                <button type="button" className="button" onClick={() => void action(id, 'ARM')}>
                  Arm
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => void action(id, 'CHECK_IN')}
                >
                  Check in
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => void action(id, 'SNOOZE')}
                >
                  Snooze 24 hours
                </button>
                <button
                  type="button"
                  className="button danger"
                  onClick={() => void action(id, 'DENY')}
                >
                  Deny release
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => void action(id, 'CANCEL')}
                >
                  Cancel
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
