import { loadEnvFile } from 'node:process';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import {
  migrateDatabase,
  PostgresContinuityRepository,
} from '../../packages/infrastructure/database/src/index.js';
import { RedisAuthRateLimiter } from '../../packages/infrastructure/database/src/services.js';
import { hashPassword, totp } from '../../packages/infrastructure/auth/src/index.js';
import { sessionHeaders } from '../helpers/auth.js';

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
    const headers = sessionHeaders({
      tenantId: crypto.randomUUID(),
      householdId: crypto.randomUUID(),
      purpose: 'contract proof',
    });
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
    expect(response.json()).toMatchObject({ code: 'AUTHENTICATION_REQUIRED', retryable: false });
    expect(response.json().request_id).toEqual(expect.any(String));
    await app.close();
    await repository.close();
  });
  it('rejects forged identity headers and derives tenant context only from the session', async () => {
    const repository = new PostgresContinuityRepository(process.env.DATABASE_URL!);
    const app = createApp(repository);
    const forged = await app.inject({
      method: 'GET',
      url: '/v1/people',
      headers: {
        'x-tenant-id': crypto.randomUUID(),
        'x-household-id': crypto.randomUUID(),
        'x-actor-id': crypto.randomUUID(),
        'x-purpose': 'forged caller context',
      },
    });
    expect(forged.statusCode).toBe(401);

    const denied = await app.inject({
      method: 'GET',
      url: '/v1/people',
      headers: sessionHeaders({
        tenantId: crypto.randomUUID(),
        householdId: crypto.randomUUID(),
        role: 'trusted-helper',
        assurance: 'mfa',
        purpose: 'ungranted household access',
      }),
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().code).toBe('AUTHORIZATION_DENIED');
    await app.close();
    await repository.close();
  });
  it('fails readiness closed when the authoritative database is unavailable', async () => {
    const repository = new PostgresContinuityRepository(process.env.DATABASE_URL!);
    await repository.close();
    const app = createApp(repository);
    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      status: 'unavailable',
      service: 'api',
      dependency: 'database',
    });
    await app.close();
  });
  it('issues password and TOTP-assured sessions with real encrypted identity lookup and rate limiting', async () => {
    const repository = new PostgresContinuityRepository(process.env.DATABASE_URL!);
    const limiter = new RedisAuthRateLimiter(process.env.REDIS_URL!, 2, 60);
    const password = 'a strong local authentication password';
    const totpSecret = Buffer.from(crypto.getRandomValues(new Uint8Array(20)));
    const owner = await repository.bootstrapOwner({
      email: 'owner@example.invalid',
      passwordHash: await hashPassword(password),
      householdName: 'Authentication Proof Household',
      totpSecret: totpSecret.toString('base64'),
    });
    const app = createApp(repository, { authRateLimiter: limiter });
    const passwordSession = await app.inject({
      method: 'POST',
      url: '/v1/auth/password/session',
      payload: { tenantId: owner.tenantId, email: 'OWNER@example.invalid', password },
    });
    expect(passwordSession.statusCode).toBe(200);
    expect(passwordSession.json()).toMatchObject({ tokenType: 'Bearer', assurance: 'password' });

    const mfaSession = await app.inject({
      method: 'POST',
      url: '/v1/auth/password/session',
      payload: {
        tenantId: owner.tenantId,
        email: 'owner@example.invalid',
        password,
        totp: totp(totpSecret),
      },
    });
    expect(mfaSession.statusCode).toBe(200);
    expect(mfaSession.json().assurance).toBe('mfa');
    const authorized = await app.inject({
      method: 'GET',
      url: '/v1/people',
      headers: { authorization: `Bearer ${mfaSession.json().accessToken as string}` },
    });
    expect(authorized.statusCode).toBe(200);

    const unknownTenant = crypto.randomUUID();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const invalid = await app.inject({
        method: 'POST',
        url: '/v1/auth/password/session',
        payload: {
          tenantId: unknownTenant,
          email: 'unknown@example.invalid',
          password: 'definitely the wrong password',
        },
      });
      expect(invalid.statusCode).toBe(401);
    }
    const limited = await app.inject({
      method: 'POST',
      url: '/v1/auth/password/session',
      payload: {
        tenantId: unknownTenant,
        email: 'unknown@example.invalid',
        password: 'definitely the wrong password',
      },
    });
    expect(limited.statusCode).toBe(429);
    await app.close();
    await limiter.close();
    await repository.close();
  });
});
