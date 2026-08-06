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
beforeAll(async () => {
  await migrateDatabase(process.env.DATABASE_MIGRATION_URL!);
});
describe('versioned API contracts', () => {
  it('serves canonical route families with tenant context and stable records', async () => {
    const repository = new PostgresContinuityRepository(process.env.DATABASE_URL!);
    const app = createApp(repository);
    const headers = {
      'x-tenant-id': crypto.randomUUID(),
      'x-household-id': crypto.randomUUID(),
      'x-actor-id': crypto.randomUUID(),
      'x-purpose': 'contract proof',
    };
    const created = await app.inject({
      method: 'POST',
      url: '/v1/people',
      headers,
      payload: { name: 'Jordan', relationship: 'owner' },
    });
    expect(created.statusCode).toBe(201);
    const listed = await app.inject({ method: 'GET', url: '/v1/people', headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toHaveLength(1);
    await app.close();
    await repository.close();
  });
  it('returns the locked safe error envelope when context is absent', async () => {
    const repository = new PostgresContinuityRepository(process.env.DATABASE_URL!);
    const app = createApp(repository);
    const response = await app.inject({ method: 'GET', url: '/v1/people' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'REQUEST_CONTEXT_REQUIRED', retryable: false });
    expect(response.json().request_id).toEqual(expect.any(String));
    await app.close();
    await repository.close();
  });
});
