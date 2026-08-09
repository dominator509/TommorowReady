import { createHmac } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import {
  migrateDatabase,
  PostgresContinuityRepository,
} from '../../packages/infrastructure/database/src/index.js';
import {
  RedisAuthRateLimiter,
  RealJobQueue,
  RedisPasskeyChallengeStore,
  RedisSessionRevocationStore,
} from '../../packages/infrastructure/database/src/services.js';
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
    const recipientId = crypto.randomUUID();
    const packet = await app.inject({
      method: 'POST',
      url: '/v1/packets',
      headers,
      payload: { purpose: 'estate continuity', recipientId, itemIds: [created.json().id] },
    });
    expect(packet.statusCode).toBe(201);
    const packets = await app.inject({ method: 'GET', url: '/v1/packets', headers });
    expect(packets.statusCode).toBe(200);
    expect(packets.json()).toHaveLength(1);
    expect(packets.json()[0].payload).toMatchObject({ purpose: 'estate continuity', recipientId });
    await app.close();
    await repository.close();
  });
  it('verifies a recipient and lets only a stepped-up owner test and arm an optional monitor', async () => {
    const repository = new PostgresContinuityRepository(process.env.DATABASE_URL!);
    const queue = new RealJobQueue(process.env.REDIS_URL!);
    const owner = await repository.bootstrapOwner({
      email: `continuity-owner-${crypto.randomUUID()}@example.invalid`,
      passwordHash: await hashPassword('continuity test password with sufficient length'),
      householdName: 'Continuity Contract Household',
    });
    let recipientVerificationMessage = '';
    const app = createApp(repository, {
      continuityNotifier: {
        async send(_to, _subject, text) {
          recipientVerificationMessage = text;
        },
      },
      continuityBaseUrl: 'http://127.0.0.1:3000',
      jobScheduler: queue,
      continuityAutomationEnabled: true,
    });
    const ownerHeaders = sessionHeaders({
      tenantId: owner.tenantId,
      householdId: owner.householdId,
      actorId: owner.userId,
      role: 'owner',
      assurance: 'mfa',
      purpose: 'continuity contract proof',
    });
    const item = await app.inject({
      method: 'POST',
      url: '/v1/people',
      headers: ownerHeaders,
      payload: { name: 'Packet Item', relationship: 'household' },
    });
    const recipientId = crypto.randomUUID();
    const packet = await app.inject({
      method: 'POST',
      url: '/v1/packets',
      headers: ownerHeaders,
      payload: {
        purpose: 'owner-authorized continuity',
        recipientId,
        itemIds: [item.json().id],
      },
    });
    expect(packet.statusCode).toBe(201);
    const verification = await app.inject({
      method: 'POST',
      url: '/v1/continuity-monitors/recipient-verifications',
      headers: ownerHeaders,
      payload: { recipientId, email: 'verified-recipient@example.invalid' },
    });
    expect(verification.statusCode).toBe(202);
    const link = /http:\/\/[^\s]+/.exec(recipientVerificationMessage)?.[0];
    expect(link).toEqual(expect.any(String));
    const verificationUrl = new URL(link!);
    const completed = await app.inject({
      method: 'POST',
      url: '/v1/continuity-monitors/recipient-verifications/complete',
      payload: {
        tenantId: verificationUrl.searchParams.get('tenantId'),
        householdId: verificationUrl.searchParams.get('householdId'),
        profileId: verificationUrl.searchParams.get('profileId'),
        token: verificationUrl.searchParams.get('token'),
      },
    });
    expect(completed.statusCode).toBe(204);
    const created = await app.inject({
      method: 'POST',
      url: '/v1/continuity-monitors',
      headers: ownerHeaders,
      payload: {
        packetId: packet.json().packetId,
        recipientId,
        checkInIntervalDays: 30,
        reminderOffsetsHours: [0, 24, 72],
        gracePeriodHours: 168,
        releaseDelayHours: 24,
        digitalDelivery: true,
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().payload.state).toBe('DISABLED');
    const monitorId = created.json().id as string;
    const passwordOnly = await app.inject({
      method: 'POST',
      url: `/v1/continuity-monitors/${monitorId}/actions`,
      headers: sessionHeaders({
        tenantId: owner.tenantId,
        householdId: owner.householdId,
        actorId: owner.userId,
        assurance: 'password',
      }),
      payload: { action: 'ARM' },
    });
    expect(passwordOnly.statusCode).toBe(403);
    expect(passwordOnly.json().code).toBe('STEP_UP_REQUIRED');
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/continuity-monitors/${monitorId}/actions`,
          headers: ownerHeaders,
          payload: { action: 'TEST' },
        })
      ).statusCode,
    ).toBe(200);
    const armed = await app.inject({
      method: 'POST',
      url: `/v1/continuity-monitors/${monitorId}/actions`,
      headers: ownerHeaders,
      payload: { action: 'ARM' },
    });
    expect(armed.statusCode).toBe(200);
    expect(armed.json()).toMatchObject({ state: 'ARMED', nextActionAt: expect.any(String) });
    const disabledMail = await app.inject({
      method: 'POST',
      url: '/v1/continuity-monitors/postal-addresses',
      headers: ownerHeaders,
      payload: {
        recipientId,
        provider: 'lob',
        name: 'Recipient',
        addressLine1: '1 Example Way',
        city: 'Example',
        state: 'CA',
        postalCode: '94107',
        countryCode: 'US',
      },
    });
    expect(disabledMail.statusCode).toBe(503);
    expect(disabledMail.json().code).toBe('PHYSICAL_MAIL_PROVIDER_DISABLED');
    await app.close();
    await queue.close();
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
  it('fails readiness closed when a configured Redis authentication dependency is unavailable', async () => {
    const repository = new PostgresContinuityRepository(process.env.DATABASE_URL!);
    const app = createApp(repository, {
      authRateLimiter: {
        async ready() {
          throw new Error('REDIS_UNAVAILABLE');
        },
        async consume() {
          return true;
        },
        async reset() {},
      },
    });
    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'unavailable', service: 'api', dependency: 'redis' });
    await app.close();
    await repository.close();
  });
  it('issues password and TOTP-assured sessions with real encrypted identity lookup and rate limiting', async () => {
    const repository = new PostgresContinuityRepository(process.env.DATABASE_URL!);
    const limiter = new RedisAuthRateLimiter(process.env.REDIS_URL!, 2, 60);
    const revocations = new RedisSessionRevocationStore(process.env.REDIS_URL!);
    const passkeyChallenges = new RedisPasskeyChallengeStore(process.env.REDIS_URL!);
    let recoveryMessage = '';
    const password = 'a strong local authentication password';
    const totpSecret = Buffer.from(crypto.getRandomValues(new Uint8Array(20)));
    const owner = await repository.bootstrapOwner({
      email: 'owner@example.invalid',
      passwordHash: await hashPassword(password),
      householdName: 'Authentication Proof Household',
      totpSecret: totpSecret.toString('base64'),
    });
    const app = createApp(repository, {
      authRateLimiter: limiter,
      sessionRevocationStore: revocations,
      passkeyChallengeStore: passkeyChallenges,
      passkeyRpId: '127.0.0.1',
      passkeyOrigin: 'http://127.0.0.1:3000',
      recoveryNotifier: {
        async send(_to, _subject, text) {
          recoveryMessage = text;
        },
      },
      recoveryBaseUrl: 'http://127.0.0.1:3000',
    });
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
    const registration = await app.inject({
      method: 'POST',
      url: '/v1/auth/passkeys/registration/options',
      headers: { authorization: `Bearer ${mfaSession.json().accessToken as string}` },
    });
    expect(registration.statusCode).toBe(200);
    expect(registration.json().options).toMatchObject({
      rp: { id: '127.0.0.1', name: 'TomorrowReady' },
      authenticatorSelection: { userVerification: 'required' },
    });
    const invalidRegistration = await app.inject({
      method: 'POST',
      url: '/v1/auth/passkeys/registration/verify',
      headers: { authorization: `Bearer ${mfaSession.json().accessToken as string}` },
      payload: { flowId: registration.json().flowId, response: {} },
    });
    expect(invalidRegistration.statusCode).toBe(400);
    const replayedRegistration = await app.inject({
      method: 'POST',
      url: '/v1/auth/passkeys/registration/verify',
      headers: { authorization: `Bearer ${mfaSession.json().accessToken as string}` },
      payload: { flowId: registration.json().flowId, response: {} },
    });
    expect(replayedRegistration.statusCode).toBe(400);
    const recoveryRequest = await app.inject({
      method: 'POST',
      url: '/v1/auth/password/recovery/request',
      payload: { tenantId: owner.tenantId, email: 'owner@example.invalid' },
    });
    expect(recoveryRequest.statusCode).toBe(202);
    const recoveryToken = /token=([A-Za-z0-9_-]{43})/.exec(recoveryMessage)?.[1];
    expect(recoveryToken).toEqual(expect.any(String));
    const recoveredPassword = 'a new strong local authentication password';
    const recoveryComplete = await app.inject({
      method: 'POST',
      url: '/v1/auth/password/recovery/complete',
      payload: {
        tenantId: owner.tenantId,
        email: 'owner@example.invalid',
        token: recoveryToken,
        newPassword: recoveredPassword,
      },
    });
    expect(recoveryComplete.statusCode).toBe(204);
    const replayedRecovery = await app.inject({
      method: 'POST',
      url: '/v1/auth/password/recovery/complete',
      payload: {
        tenantId: owner.tenantId,
        email: 'owner@example.invalid',
        token: recoveryToken,
        newPassword: recoveredPassword,
      },
    });
    expect(replayedRecovery.statusCode).toBe(401);
    const recoveredSession = await app.inject({
      method: 'POST',
      url: '/v1/auth/password/session',
      payload: {
        tenantId: owner.tenantId,
        email: 'owner@example.invalid',
        password: recoveredPassword,
      },
    });
    expect(recoveredSession.statusCode).toBe(200);
    const authorization = { authorization: `Bearer ${mfaSession.json().accessToken as string}` };
    expect(
      (await app.inject({ method: 'POST', url: '/v1/auth/logout', headers: authorization }))
        .statusCode,
    ).toBe(204);
    expect(
      (await app.inject({ method: 'GET', url: '/v1/people', headers: authorization })).statusCode,
    ).toBe(401);

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
    await revocations.close();
    await passkeyChallenges.close();
    await repository.close();
  });

  it('authenticates, deduplicates, and orders billing webhooks in PostgreSQL', async () => {
    const repository = new PostgresContinuityRepository(process.env.DATABASE_URL!);
    const secret = 'whsec_contract_secret_with_32_bytes';
    const app = createApp(repository, { stripeWebhookSecret: secret });
    const tenantId = crypto.randomUUID();
    const householdId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const event = (id: string, created: number, status: string) =>
      JSON.stringify({
        id,
        created,
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: `sub_${tenantId}`,
            customer: `cus_${tenantId}`,
            status,
            metadata: { tenantId, householdId },
          },
        },
      });
    const send = (body: string) => {
      const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
      return app.inject({
        method: 'POST',
        url: '/v1/billing/webhooks/stripe',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': `t=${timestamp},v1=${signature}`,
        },
        payload: body,
      });
    };
    const current = event(`evt_${crypto.randomUUID()}`, timestamp, 'active');
    expect((await send(current)).statusCode).toBe(202);
    expect((await send(current)).json()).toEqual({ status: 'duplicate' });
    const stale = event(`evt_${crypto.randomUUID()}`, timestamp - 1, 'past_due');
    expect((await send(stale)).json()).toEqual({ status: 'stale' });
    const forged = await app.inject({
      method: 'POST',
      url: '/v1/billing/webhooks/stripe',
      headers: { 'content-type': 'application/json', 'stripe-signature': `t=${timestamp},v1=bad` },
      payload: current,
    });
    expect(forged.statusCode).toBe(401);
    await app.close();
    await repository.close();
  });
});
