import { afterEach, describe, expect, it } from 'vitest';
import type { ClaimedDurableJob } from '../../packages/infrastructure/database/src/services.js';
import { createPrivacySafeLogger } from '../../packages/infrastructure/observability/src/index.js';
import {
  createContinuityJobHandler,
  createWorkerHealthServer,
  runWorker,
  type WorkerQueue,
} from '../../apps/worker/src/index.js';

const claimed = (): ClaimedDurableJob => ({
  streamId: '1-0',
  attempt: 1,
  job: {
    id: crypto.randomUUID(),
    tenantId: crypto.randomUUID(),
    householdId: crypto.randomUUID(),
    type: 'notification',
    idempotencyKey: crypto.randomUUID(),
  },
});

function fakeQueue(job: ClaimedDurableJob | null) {
  const calls = { acknowledged: [] as string[], failed: [] as ClaimedDurableJob[] };
  let next = job;
  const queue: WorkerQueue = {
    async ready() {},
    async promoteDue() {
      return false;
    },
    async claim() {
      const value = next;
      next = null;
      return value;
    },
    async reclaimStale() {
      return null;
    },
    async acknowledge(streamId) {
      calls.acknowledged.push(streamId);
    },
    async fail(value) {
      calls.failed.push(value);
      return { deadLettered: true };
    },
    async close() {},
  };
  return { queue, calls };
}

describe('worker runtime', () => {
  const servers: ReturnType<typeof createWorkerHealthServer>[] = [];
  afterEach(async () => {
    await Promise.all(
      servers
        .splice(0)
        .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
    );
  });

  it('acknowledges only after the handler succeeds', async () => {
    const controller = new AbortController();
    const { queue, calls } = fakeQueue(claimed());
    await runWorker(
      queue,
      async () => controller.abort(),
      createPrivacySafeLogger('silent'),
      controller.signal,
      { blockMilliseconds: 1 },
    );
    expect(calls.acknowledged).toEqual(['1-0']);
    expect(calls.failed).toEqual([]);
  });

  it('routes handler failures to bounded queue failure handling without acknowledging', async () => {
    const controller = new AbortController();
    const { queue, calls } = fakeQueue(claimed());
    await runWorker(
      queue,
      async () => {
        controller.abort();
        throw new Error('PROVIDER_UNAVAILABLE');
      },
      createPrivacySafeLogger('silent'),
      controller.signal,
      { blockMilliseconds: 1 },
    );
    expect(calls.acknowledged).toEqual([]);
    expect(calls.failed).toHaveLength(1);
  });

  it('reports dependency-aware readiness and rejects unknown health paths', async () => {
    const controller = new AbortController();
    const { queue } = fakeQueue(null);
    const server = createWorkerHealthServer(queue, controller.signal);
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('TEST_SERVER_ADDRESS_INVALID');
    const base = `http://127.0.0.1:${address.port}`;
    expect((await fetch(`${base}/health/live`)).status).toBe(200);
    expect((await fetch(`${base}/health/ready`)).status).toBe(200);
    expect((await fetch(`${base}/unknown`)).status).toBe(404);
    controller.abort();
    expect((await fetch(`${base}/health/live`)).status).toBe(503);
  });

  it('reschedules without advancing state while the global continuity kill switch is active', async () => {
    const job = {
      id: crypto.randomUUID(),
      tenantId: crypto.randomUUID(),
      householdId: crypto.randomUUID(),
      type: 'continuity-monitor' as const,
      resourceId: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      attempt: 1,
    };
    let advanced = false;
    const scheduled: unknown[] = [];
    const handler = createContinuityJobHandler({
      repository: {
        async advanceContinuityMonitorForJob() {
          advanced = true;
          throw new Error('MUST_NOT_ADVANCE_WHILE_PAUSED');
        },
      } as unknown as Parameters<typeof createContinuityJobHandler>[0]['repository'],
      queue: {
        async schedule(value) {
          scheduled.push(value);
        },
      },
      storage: {
        async putImmutable() {
          throw new Error('MUST_NOT_RENDER_WHILE_PAUSED');
        },
      },
      baseUrl: 'https://example.invalid',
      providers: {},
      automationEnabled: false,
    });
    await handler(job);
    expect(advanced).toBe(false);
    expect(scheduled).toHaveLength(1);
  });

  it('renders, stores, and digitally delivers an authorized continuity release', async () => {
    const job = {
      id: crypto.randomUUID(),
      tenantId: crypto.randomUUID(),
      householdId: crypto.randomUUID(),
      type: 'continuity-monitor' as const,
      resourceId: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      attempt: 1,
    };
    const accessRequestId = crypto.randomUUID();
    const recipientId = crypto.randomUUID();
    let storedBytes = Buffer.alloc(0);
    let delivered:
      Readonly<{ digitalDelivered: boolean; physicalMailAccepted: boolean }> | undefined;
    let message = '';
    const handler = createContinuityJobHandler({
      repository: {
        async advanceContinuityMonitorForJob() {
          return {
            state: 'RELEASE_PENDING' as const,
            effect: 'RELEASE_PACKET' as const,
            nextActionAt: new Date().toISOString(),
            ownerEmail: 'owner@example.invalid',
          };
        },
        async markContinuityMonitorNotificationFailure() {},
        async prepareAutomaticRelease() {
          return {
            monitorId: job.resourceId,
            tenantId: job.tenantId,
            householdId: job.householdId,
            accessRequestId,
            recipientEmail: 'recipient@example.invalid',
            recipientId,
            packetId: crypto.randomUUID(),
            manifestHash: 'a'.repeat(64),
            householdName: 'Continuity Test Household',
            sections: ['Owner-approved instruction'],
          };
        },
        async recordReleaseArtifact() {
          return {
            tokenId: crypto.randomUUID(),
            token: 'release-token-with-sufficient-entropy-for-test',
            expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          };
        },
        async reservePhysicalMailOrder() {
          throw new Error('PHYSICAL_MAIL_NOT_EXPECTED');
        },
        async recordPhysicalMailOrder() {
          throw new Error('PHYSICAL_MAIL_NOT_EXPECTED');
        },
        async completeAutomaticReleaseDelivery(_context, _monitorId, result) {
          delivered = result;
        },
      },
      queue: {
        async schedule() {
          throw new Error('RELEASE_MUST_NOT_RESCHEDULE');
        },
      },
      storage: {
        async putImmutable(input) {
          storedBytes = Buffer.from(input.body);
          return { key: 'private/test', checksumSha256: 'b'.repeat(64) };
        },
      },
      notifier: {
        async send(_to, _subject, text) {
          message = text;
          return 'smtp-message-id';
        },
      },
      baseUrl: 'https://tomorrowready.example',
      providers: {},
      automationEnabled: true,
    });
    await handler(job);
    expect(storedBytes.subarray(0, 4).toString()).toBe('%PDF');
    expect(message).toContain('/recipient/release?');
    expect(delivered).toEqual({ digitalDelivered: true, physicalMailAccepted: false });
  });
});
