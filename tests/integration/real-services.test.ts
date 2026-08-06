import { loadEnvFile } from 'node:process';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  migrateDatabase,
  PostgresContinuityRepository,
} from '../../packages/infrastructure/database/src/index.js';
import {
  RealEmail,
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
    await repository.appendAudit(context, 'evidence:test', crypto.randomUUID(), 'a'.repeat(64));
    const client = await repository.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [context.tenantId]);
      const selected = await client.query('SELECT id FROM audit_events LIMIT 1');
      await expect(
        client.query("UPDATE audit_events SET payload='{}'::jsonb WHERE id=$1", [
          selected.rows[0].id,
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
  it('round-trips a private object through real S3-compatible storage', async () => {
    const storage = new RealObjectStorage(
      required('S3_BUCKET'),
      required('S3_ENDPOINT'),
      required('S3_ACCESS_KEY_ID'),
      required('S3_SECRET_ACCESS_KEY'),
    );
    await storage.ensureBucket();
    expect(await storage.roundTrip('immutable original test')).toBe('immutable original test');
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
