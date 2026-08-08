import { loadEnvFile } from 'node:process';
import { expect, test } from '@playwright/test';
import type { FastifyInstance } from 'fastify';
import { createApp } from '../../apps/api/src/app.js';
import { hashPassword, totp } from '../../packages/infrastructure/auth/src/index.js';
import {
  migrateDatabase,
  PostgresContinuityRepository,
} from '../../packages/infrastructure/database/src/index.js';
import {
  RedisAuthRateLimiter,
  RedisPasskeyChallengeStore,
  RedisSessionRevocationStore,
} from '../../packages/infrastructure/database/src/services.js';

try {
  loadEnvFile('.env');
} catch {}

let app: FastifyInstance;
let repository: PostgresContinuityRepository;
let limiter: RedisAuthRateLimiter;
let challenges: RedisPasskeyChallengeStore;
let revocations: RedisSessionRevocationStore;
let tenantId: string;
const email = `browser-passkey-${crypto.randomUUID()}@example.invalid`;
const password = 'browser ceremony proof password';
const totpSecret = Buffer.from(crypto.getRandomValues(new Uint8Array(20)));

test.beforeAll(async () => {
  await migrateDatabase(process.env.DATABASE_MIGRATION_URL!);
  repository = new PostgresContinuityRepository(process.env.DATABASE_URL!);
  limiter = new RedisAuthRateLimiter(process.env.REDIS_URL!);
  challenges = new RedisPasskeyChallengeStore(process.env.REDIS_URL!);
  revocations = new RedisSessionRevocationStore(process.env.REDIS_URL!);
  const owner = await repository.bootstrapOwner({
    email,
    passwordHash: await hashPassword(password),
    householdName: 'Browser Passkey Proof Household',
    totpSecret: totpSecret.toString('base64'),
  });
  tenantId = owner.tenantId;
  app = createApp(repository, {
    authRateLimiter: limiter,
    passkeyChallengeStore: challenges,
    sessionRevocationStore: revocations,
    passkeyRpId: 'localhost',
    passkeyOrigin: 'http://localhost:3000',
  });
  await app.listen({ host: '127.0.0.1', port: 4011 });
});

test.afterAll(async () => {
  await app?.close();
  await limiter?.close();
  await challenges?.close();
  await revocations?.close();
  await repository?.close();
});

test('registers and authenticates a user-verified passkey through the real browser and API', async ({
  page,
}) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  await page.goto('/sign-in');
  await page.getByLabel('Household tenant ID').fill(tenantId);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Authenticator code').fill(totp(totpSecret));
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/plan$/);

  await page.goto('/settings/security');
  await page.getByRole('button', { name: 'Register this device' }).click();
  await expect(page.getByText('Passkey registered.')).toBeVisible();

  await page.goto('/plan');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByLabel('Household tenant ID').fill(tenantId);
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Use a passkey' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole('heading', { name: 'People in your plan' })).toBeVisible();
});
