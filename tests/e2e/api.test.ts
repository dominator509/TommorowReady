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
    const response = await app.inject({
      method: 'POST',
      url: '/v1/releases/VERIFYING/transition',
      headers: sessionHeaders({
        tenantId: crypto.randomUUID(),
        householdId: crypto.randomUUID(),
        purpose: 'release verification',
      }),
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
  it('never approves a release from caller-asserted evidence', async () => {
    const repository = new PostgresContinuityRepository(databaseUrl);
    const app = createApp(repository);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/releases/CHALLENGE_ACTIVE/transition',
      headers: sessionHeaders({
        tenantId: crypto.randomUUID(),
        householdId: crypto.randomUUID(),
        assurance: 'mfa',
        purpose: 'attempt release approval',
      }),
      payload: {
        next: 'APPROVED_FOR_RELEASE',
        context: {
          recipientVerified: true,
          packetScopeMatches: true,
          challengeEndsAt: new Date(0).toISOString(),
          now: new Date(0).toISOString(),
          ownerDenied: false,
          takeoverSignal: false,
          verificationSatisfied: true,
          providerAmbiguous: false,
        },
      },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe('SERVER_VERIFIED_RELEASE_EVIDENCE_REQUIRED');
    await app.close();
    await repository.close();
  });
});
