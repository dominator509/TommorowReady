import { loadEnvFile } from 'node:process';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import {
  migrateDatabase,
  PostgresContinuityRepository,
} from '../../packages/infrastructure/database/src/index.js';
import { sessionHeaders } from '../helpers/auth.js';

try {
  loadEnvFile('.env');
} catch {}
const databaseUrl = process.env.DATABASE_URL!;
beforeAll(async () => {
  await migrateDatabase(process.env.DATABASE_MIGRATION_URL!);
});
describe('real API end to end', () => {
  it('creates a household and rejects secret-bearing records', async () => {
    const repository = new PostgresContinuityRepository(databaseUrl);
    const app = createApp(repository);
    const tenantId = crypto.randomUUID();
    const headers = sessionHeaders({ tenantId, purpose: 'one afternoon plan' });
    const household = await app.inject({
      method: 'POST',
      url: '/v1/households',
      headers,
      payload: { name: 'River Household' },
    });
    expect(household.statusCode).toBe(201);
    const householdId = household.json().id as string;
    const rejected = await app.inject({
      method: 'POST',
      url: '/v1/records',
      headers: sessionHeaders({ tenantId, householdId, purpose: 'one afternoon plan' }),
      payload: { kind: 'account', payload: { locator: 'password: do-not-store-this' } },
    });
    expect(rejected.statusCode).toBe(422);
    expect(rejected.json().code).toBe('PROHIBITED_SECRET');
    await app.close();
    await repository.close();
  });
  it('returns manual review for ambiguous verification', async () => {
    const repository = new PostgresContinuityRepository(databaseUrl);
    const app = createApp(repository);
    const tenantId = crypto.randomUUID();
    const householdId = crypto.randomUUID();
    const actorId = crypto.randomUUID();
    const headers = sessionHeaders({
      tenantId,
      householdId,
      actorId,
      purpose: 'release verification',
    });
    const created = await app.inject({
      method: 'POST',
      url: '/v1/access-requests',
      headers,
      payload: {
        packetId: crypto.randomUUID(),
        recipientId: crypto.randomUUID(),
        purpose: 'childcare',
      },
    });
    const accessRequestId = created.json().id as string;
    await app.inject({
      method: 'POST',
      url: `/v1/releases/${accessRequestId}/transition`,
      headers: { ...headers, 'idempotency-key': crypto.randomUUID() },
      payload: { next: 'VERIFYING' },
    });
    await repository.recordReleaseEvidence(
      { tenantId, householdId, actorId, purpose: 'sandbox verification adapter' },
      accessRequestId,
      {
        recipientVerified: true,
        packetScopeMatches: true,
        verificationSatisfied: true,
        providerAmbiguous: true,
        providerReference: 'sandbox-verification-ambiguous',
      },
    );
    const response = await app.inject({
      method: 'POST',
      url: `/v1/releases/${accessRequestId}/transition`,
      headers: { ...headers, 'idempotency-key': crypto.randomUUID() },
      payload: { next: 'MANUAL_REVIEW_REQUIRED' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().state).toBe('MANUAL_REVIEW_REQUIRED');
    await app.close();
    await repository.close();
  });
  it('never approves a release from caller-asserted evidence', async () => {
    const repository = new PostgresContinuityRepository(databaseUrl);
    const app = createApp(repository);
    const tenantId = crypto.randomUUID();
    const householdId = crypto.randomUUID();
    const headers = sessionHeaders({
      tenantId,
      householdId,
      assurance: 'mfa',
      purpose: 'attempt release approval',
    });
    const created = await app.inject({
      method: 'POST',
      url: '/v1/access-requests',
      headers,
      payload: {
        packetId: crypto.randomUUID(),
        recipientId: crypto.randomUUID(),
        purpose: 'emergency packet',
      },
    });
    const accessRequestId = created.json().id as string;
    await app.inject({
      method: 'POST',
      url: `/v1/releases/${accessRequestId}/transition`,
      headers: { ...headers, 'idempotency-key': crypto.randomUUID() },
      payload: { next: 'VERIFYING' },
    });
    await app.inject({
      method: 'POST',
      url: `/v1/releases/${accessRequestId}/transition`,
      headers: { ...headers, 'idempotency-key': crypto.randomUUID() },
      payload: { next: 'CHALLENGE_ACTIVE' },
    });
    const response = await app.inject({
      method: 'POST',
      url: `/v1/releases/${accessRequestId}/transition`,
      headers: { ...headers, 'idempotency-key': crypto.randomUUID() },
      payload: { next: 'APPROVED_FOR_RELEASE' },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe('RELEASE_POLICY_UNSATISFIED');
    await app.close();
    await repository.close();
  });
  it('releases exactly one recipient-scoped packet from persisted trusted evidence', async () => {
    const repository = new PostgresContinuityRepository(databaseUrl);
    const app = createApp(repository);
    const tenantId = crypto.randomUUID();
    const householdId = crypto.randomUUID();
    const actorId = crypto.randomUUID();
    const headers = sessionHeaders({
      tenantId,
      householdId,
      actorId,
      assurance: 'mfa',
      purpose: 'sandbox release proof',
    });
    const recipientId = crypto.randomUUID();
    const packetId = crypto.randomUUID();
    const packet = await app.inject({
      method: 'POST',
      url: '/v1/packets',
      headers,
      payload: { purpose: 'emergency childcare', recipientId, itemIds: [crypto.randomUUID()] },
    });
    expect(packet.statusCode).toBe(201);
    const created = await app.inject({
      method: 'POST',
      url: '/v1/access-requests',
      headers,
      payload: {
        packetId: packet.json().packetId ?? packetId,
        recipientId,
        purpose: 'emergency childcare',
      },
    });
    const accessRequestId = created.json().id as string;
    const transition = (next: string, key = crypto.randomUUID()) =>
      app.inject({
        method: 'POST',
        url: `/v1/releases/${accessRequestId}/transition`,
        headers: { ...headers, 'idempotency-key': key },
        payload: { next },
      });
    expect((await transition('VERIFYING')).json()).toEqual({ state: 'VERIFYING' });
    await repository.recordReleaseEvidence(
      { tenantId, householdId, actorId, purpose: 'sandbox verification adapter' },
      accessRequestId,
      {
        recipientVerified: true,
        packetScopeMatches: true,
        verificationSatisfied: true,
        providerAmbiguous: false,
        providerReference: 'sandbox-verified-recipient',
      },
    );
    await repository.recordReleaseChallenge(
      { tenantId, householdId, actorId, purpose: 'challenge timer worker' },
      accessRequestId,
      new Date(0),
    );
    expect((await transition('CHALLENGE_ACTIVE')).json()).toEqual({ state: 'CHALLENGE_ACTIVE' });
    expect((await transition('APPROVED_FOR_RELEASE')).json()).toEqual({
      state: 'APPROVED_FOR_RELEASE',
    });
    const releaseKey = crypto.randomUUID();
    expect((await transition('RELEASED', releaseKey)).json()).toEqual({ state: 'RELEASED' });
    expect((await transition('RELEASED', releaseKey)).json()).toEqual({ state: 'RELEASED' });
    await app.close();
    await repository.close();
  });
});
