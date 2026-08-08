'use client';

import { useCallback, useEffect, useState } from 'react';
import { responseMessage, StatusNotice, type UiStatus } from './StatusNotice';

type StoredRecord = Readonly<{ id?: string; payload?: Readonly<Record<string, unknown>> }>;
const text = (value: unknown, fallback = 'Not configured'): string =>
  typeof value === 'string' && value.trim() ? value : fallback;

export function PacketCenter() {
  const [packets, setPackets] = useState<readonly StoredRecord[]>([]);
  const [requests, setRequests] = useState<readonly StoredRecord[]>([]);
  const [status, setStatus] = useState<UiStatus>({
    tone: 'loading',
    message: 'Loading packet controls…',
  });

  const load = useCallback(async () => {
    setStatus({ tone: 'loading', message: 'Refreshing packet controls…' });
    try {
      const [packetResponse, requestResponse] = await Promise.all([
        fetch('/api/continuity/packets', { cache: 'no-store' }),
        fetch('/api/continuity/access-requests', { cache: 'no-store' }),
      ]);
      if (packetResponse.status === 401 || requestResponse.status === 401) {
        setStatus({ tone: 'warning', message: 'Sign in to review packets and release requests.' });
        return;
      }
      if (packetResponse.status === 403 || requestResponse.status === 403) {
        setStatus({
          tone: 'error',
          message: 'You do not have permission to review packet controls.',
        });
        return;
      }
      if (!packetResponse.ok || !requestResponse.ok)
        throw new Error(
          await responseMessage(
            !packetResponse.ok ? packetResponse : requestResponse,
            'Packet controls could not be loaded.',
          ),
        );
      setPackets((await packetResponse.json()) as StoredRecord[]);
      setRequests((await requestResponse.json()) as StoredRecord[]);
      setStatus({ tone: 'success', message: 'Packet and release state confirmed.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Packet controls could not be loaded.',
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <StatusNotice status={status} />
      {packets.length === 0 ? (
        <section className="panel empty-state" aria-labelledby="packet-empty">
          <h2 id="packet-empty">No approved packets</h2>
          <p>
            Create and approve recipient-specific manifests through the guided plan before a release
            can be requested.
          </p>
        </section>
      ) : (
        <div className="packet-grid">
          {packets.map((packet, index) => {
            const payload = packet.payload ?? {};
            const itemIds = Array.isArray(payload.itemIds) ? payload.itemIds : [];
            return (
              <article className="panel" key={packet.id ?? index}>
                <h2>Packet {index + 1}</h2>
                <dl className="details-list">
                  <div>
                    <dt>Recipient</dt>
                    <dd>{text(payload.recipientId)}</dd>
                  </div>
                  <div>
                    <dt>Purpose</dt>
                    <dd>{text(payload.purpose)}</dd>
                  </div>
                  <div>
                    <dt>Included categories</dt>
                    <dd>
                      {itemIds.length} approved item{itemIds.length === 1 ? '' : 's'}
                    </dd>
                  </div>
                  <div>
                    <dt>Excluded categories</dt>
                    <dd>Everything outside the approved manifest</dd>
                  </div>
                  <div>
                    <dt>Release method</dt>
                    <dd>Policy-controlled, recipient-bound release</dd>
                  </div>
                  <div>
                    <dt>Last test</dt>
                    <dd>Not yet recorded</dd>
                  </div>
                  <div>
                    <dt>Review date</dt>
                    <dd>{text(payload.approvedAt, 'Review required')}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
      <section className="notice" aria-labelledby="emergency-policy-heading">
        <h2 id="emergency-policy-heading">Emergency release is never automatic</h2>
        <p>
          Every request moves through identity verification, scope matching, a challenge period,
          owner denial checks, expiry, and policy approval. Conflicting or unavailable evidence
          requires manual review. TomorrowReady does not determine legal death or incapacity.
        </p>
        {requests.length ? (
          <ul className="record-list">
            {requests.map((request, index) => (
              <li key={request.id ?? index}>
                Request {index + 1}
                <span>{text(request.payload?.state, 'MANUAL_REVIEW_REQUIRED')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No release requests are active.</p>
        )}
      </section>
    </>
  );
}
