import { loadEnvFile } from 'node:process';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  migrateDatabase,
  PostgresContinuityRepository,
} from '../../packages/infrastructure/database/src/index.js';
import {
  RealEmail,
  RealJobQueue,
  RealObjectStorage,
  RealQueue,
} from '../../packages/infrastructure/database/src/services.js';

try {
  loadEnvFile('.env');
} catch {}
const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
};
beforeAll(async () => {
  await migrateDatabase(required('DATABASE_MIGRATION_URL'));
});
describe('real local services', () => {
  it('persists tenant-scoped records and prevents cross-tenant reads', async () => {
    const repository = new PostgresContinuityRepository(required('DATABASE_URL'));
    const householdId = crypto.randomUUID();
    const actorId = crypto.randomUUID();
    const first = {
      tenantId: crypto.randomUUID(),
      householdId,
      actorId,
      purpose: 'integration proof',
    };
    const record = await repository.create(first, 'person', { name: 'Alex' });
    expect((await repository.get(first, 'person', record.id))?.payload.name).toBe('Alex');
    const second = await repository.create(first, 'person', { name: 'Morgan' });
    const client = await repository.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [first.tenantId]);
      await client.query("SELECT set_config('app.household_id', $1, true)", [first.householdId]);
      const raw = await client.query('SELECT payload FROM people WHERE id=$1', [record.id]);
      expect(JSON.stringify(raw.rows[0].payload)).not.toContain('Alex');
      expect(raw.rows[0].payload).toHaveProperty('_tr_encrypted_v1');
      await client.query('UPDATE people SET payload=$1 WHERE id=$2', [
        raw.rows[0].payload,
        second.id,
      ]);
      await client.query('COMMIT');
    } finally {
      client.release();
    }
    await expect(repository.get(first, 'person', second.id)).rejects.toThrow();
    expect(
      await repository.get({ ...first, householdId: crypto.randomUUID() }, 'person', record.id),
    ).toBeNull();
    expect(
      await repository.get({ ...first, tenantId: crypto.randomUUID() }, 'person', record.id),
    ).toBeNull();
    await repository.close();
  });
  it('keeps audit evidence append-only inside the enforced tenant context', async () => {
    const repository = new PostgresContinuityRepository(required('DATABASE_URL'));
    const context = {
      tenantId: crypto.randomUUID(),
      householdId: crypto.randomUUID(),
      actorId: crypto.randomUUID(),
      purpose: 'append-only proof',
    };
    await repository.appendAudit(context, 'evidence:first', crypto.randomUUID(), 'a'.repeat(64));
    await repository.appendAudit(context, 'evidence:second', crypto.randomUUID(), 'b'.repeat(64));
    const client = await repository.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [context.tenantId]);
      await client.query("SELECT set_config('app.household_id', $1, true)", [context.householdId]);
      const selected = await client.query(
        "SELECT id, payload->>'previousHash' AS previous_hash, payload->>'chainHash' AS chain_hash FROM audit_events WHERE household_id=$1 ORDER BY created_at, id",
        [context.householdId],
      );
      expect(selected.rows).toHaveLength(2);
      expect(selected.rows[0].previous_hash).toBe('GENESIS');
      expect(selected.rows[1].previous_hash).toBe(selected.rows[0].chain_hash);
      await expect(
        client.query("UPDATE audit_events SET payload='{}'::jsonb WHERE id=$1", [
          selected.rows[1].id,
        ]),
      ).rejects.toMatchObject({ message: 'append-only table' });
      await client.query('ROLLBACK');
    } finally {
      client.release();
      await repository.close();
    }
  });
  it('round-trips through real Valkey', async () => {
    const queue = new RealQueue(required('REDIS_URL'));
    expect(await queue.roundTrip('durable-boundary')).toBe('durable-boundary');
    await queue.close();
  });
  it('enqueues, deduplicates, claims, and acknowledges a durable real-Valkey job', async () => {
    const queue = new RealJobQueue(required('REDIS_URL'));
    const job = {
      id: crypto.randomUUID(),
      tenantId: crypto.randomUUID(),
      householdId: crypto.randomUUID(),
      type: 'notification' as const,
      idempotencyKey: crypto.randomUUID(),
    };
    const first = await queue.enqueue(job);
    const duplicate = await queue.enqueue(job);
    expect(first.enqueued).toBe(true);
    expect(duplicate).toEqual({ enqueued: false, streamId: first.streamId });
    const claimed = await queue.claim(`integration-${crypto.randomUUID()}`);
    expect(claimed?.job).toEqual(job);
    expect(claimed?.attempt).toBe(1);
    await queue.acknowledge(claimed!.streamId);
    await expect(
      queue.enqueue({ ...job, type: 'arbitrary' } as unknown as typeof job),
    ).rejects.toThrow('QUEUE_JOB_INVALID');
    await queue.close();
  });
  it('reclaims stale jobs and dead-letters only after the bounded attempt limit', async () => {
    const queue = new RealJobQueue(required('REDIS_URL'));
    const job = {
      id: crypto.randomUUID(),
      tenantId: crypto.randomUUID(),
      householdId: crypto.randomUUID(),
      type: 'export' as const,
      idempotencyKey: crypto.randomUUID(),
    };
    await queue.enqueue(job);
    const first = await queue.claim(`first-${crypto.randomUUID()}`);
    expect(await queue.fail(first!, 'PROVIDER_UNAVAILABLE', 2)).toEqual({ deadLettered: false });
    const reclaimed = await queue.reclaimStale(`second-${crypto.randomUUID()}`, 0);
    expect(reclaimed).toMatchObject({ job, attempt: 2 });
    const before = await queue.deadLetterLength();
    expect(await queue.fail(reclaimed!, 'PROVIDER_UNAVAILABLE', 2)).toEqual({
      deadLettered: true,
    });
    expect(await queue.deadLetterLength()).toBe(before + 1);
    await queue.close();
  });
  it('replaces an obsolete continuity deadline and promotes only the latest scheduled job', async () => {
    const queue = new RealJobQueue(required('REDIS_URL'));
    const scope = {
      tenantId: crypto.randomUUID(),
      householdId: crypto.randomUUID(),
      type: 'continuity-monitor' as const,
      resourceId: crypto.randomUUID(),
    };
    const obsolete = {
      ...scope,
      id: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
    };
    const current = {
      ...scope,
      id: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
    };
    await queue.schedule(obsolete, new Date(Date.now() - 2_000));
    await queue.schedule(current, new Date(Date.now() - 1_000));
    expect(await queue.promoteDue()).toBe(true);
    const claimed = await queue.claim(`scheduled-${crypto.randomUUID()}`);
    expect(claimed?.job).toEqual(current);
    await queue.acknowledge(claimed!.streamId);
    expect(await queue.promoteDue()).toBe(false);
    await queue.close();
  });
  it('round-trips a private object through real S3-compatible storage', async () => {
    const storage = new RealObjectStorage(
      required('S3_BUCKET'),
      required('S3_ENDPOINT'),
      required('S3_ACCESS_KEY_ID'),
      required('S3_SECRET_ACCESS_KEY'),
    );
    await storage.ensureBucket();
    expect(await storage.roundTrip('immutable original test')).toBe('immutable original test');
    const scope = {
      tenantId: crypto.randomUUID(),
      householdId: crypto.randomUUID(),
      objectId: crypto.randomUUID(),
    };
    const body = Buffer.from('tenant-scoped immutable original', 'utf8');
    await storage.putImmutable({ ...scope, body, contentType: 'text/plain' });
    expect(await storage.getPrivate(scope)).toEqual(body);
    await expect(
      storage.putImmutable({ ...scope, body, contentType: 'text/plain' }),
    ).resolves.toEqual(expect.objectContaining({ checksumSha256: expect.any(String) }));
    await expect(
      storage.putImmutable({
        ...scope,
        body: Buffer.from('different immutable content'),
        contentType: 'text/plain',
      }),
    ).rejects.toThrow('IMMUTABLE_OBJECT_ALREADY_EXISTS_WITH_DIFFERENT_CONTENT');
    await expect(
      storage.getPrivate({ ...scope, householdId: crypto.randomUUID() }),
    ).rejects.toThrow();
    await storage.deletePrivate(scope);
  });
  it('sends a real SMTP message to local capture', async () => {
    const email = new RealEmail(required('SMTP_URL'));
    const id = await email.send(
      'recipient@example.invalid',
      'TomorrowReady challenge notice',
      'A challenge is active. No packet content is included.',
    );
    expect(id).toContain('@');
  });
});
