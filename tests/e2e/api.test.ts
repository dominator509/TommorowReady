import { loadEnvFile } from 'node:process';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import {
  migrateDatabase,
  PostgresContinuityRepository,
} from '../../packages/infrastructure/database/src/index.js';

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
    const headers = {
      'x-tenant-id': crypto.randomUUID(),
      'x-actor-id': crypto.randomUUID(),
      'x-purpose': 'one afternoon plan',
    };
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
      headers: { ...headers, 'x-household-id': householdId },
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
    const response = await app.inject({
      method: 'POST',
      url: '/v1/releases/VERIFYING/transition',
      headers: {
        'x-tenant-id': crypto.randomUUID(),
        'x-household-id': crypto.randomUUID(),
        'x-actor-id': crypto.randomUUID(),
        'x-purpose': 'release verification',
      },
      payload: {
        next: 'MANUAL_REVIEW_REQUIRED',
        context: {
          recipientVerified: true,
          packetScopeMatches: true,
          challengeEndsAt: new Date(0).toISOString(),
          now: new Date().toISOString(),
          ownerDenied: false,
          takeoverSignal: false,
          verificationSatisfied: true,
          providerAmbiguous: true,
        },
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().state).toBe('MANUAL_REVIEW_REQUIRED');
    await app.close();
    await repository.close();
  });
});
