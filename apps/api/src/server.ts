import { loadEnvFile } from 'node:process';
import { createApp } from './app.js';
import { PostgresContinuityRepository } from '../../../packages/infrastructure/database/src/index.js';
import {
  RedisAuthRateLimiter,
  RedisPhysicalMailRouter,
  RedisPasskeyChallengeStore,
  RedisSessionRevocationStore,
  RealEmail,
  RealJobQueue,
  RealObjectStorage,
} from '../../../packages/infrastructure/database/src/services.js';
import { configuredPhysicalMailProviders } from '../../../packages/infrastructure/physical-mail/src/index.js';

try {
  loadEnvFile('.env');
} catch {}
const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');
if (!redisUrl) throw new Error('REDIS_URL_REQUIRED');
const repository = new PostgresContinuityRepository(databaseUrl);
const authRateLimiter = new RedisAuthRateLimiter(redisUrl);
const sessionRevocationStore = new RedisSessionRevocationStore(redisUrl);
const passkeyChallengeStore = new RedisPasskeyChallengeStore(redisUrl);
const recoveryNotifier = process.env.SMTP_URL ? new RealEmail(process.env.SMTP_URL) : undefined;
const jobScheduler = new RealJobQueue(redisUrl);
const physicalMailRouter = new RedisPhysicalMailRouter(
  redisUrl,
  process.env.AUTH_LOOKUP_SECRET ?? '',
);
const packetStorage = new RealObjectStorage(
  process.env.S3_BUCKET ?? '',
  process.env.S3_ENDPOINT ?? '',
  process.env.S3_ACCESS_KEY_ID ?? '',
  process.env.S3_SECRET_ACCESS_KEY ?? '',
);
const physicalMailProviders = configuredPhysicalMailProviders();
const continuityAutomationSetting = process.env.CONTINUITY_AUTOMATION_ENABLED ?? 'no';
if (!['yes', 'no'].includes(continuityAutomationSetting))
  throw new Error('CONTINUITY_AUTOMATION_ENABLED_INVALID');
const app = createApp(repository, {
  authRateLimiter,
  sessionRevocationStore,
  ...(process.env.PASSKEY_RP_ID && process.env.PASSKEY_ORIGIN
    ? {
        passkeyChallengeStore,
        passkeyRpId: process.env.PASSKEY_RP_ID,
        passkeyOrigin: process.env.PASSKEY_ORIGIN,
      }
    : {}),
  ...(recoveryNotifier && process.env.APP_BASE_URL
    ? { recoveryNotifier, recoveryBaseUrl: process.env.APP_BASE_URL }
    : {}),
  ...(process.env.STRIPE_WEBHOOK_SECRET
    ? { stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET }
    : {}),
  ...(recoveryNotifier && process.env.APP_BASE_URL
    ? { continuityNotifier: recoveryNotifier, continuityBaseUrl: process.env.APP_BASE_URL }
    : {}),
  jobScheduler,
  packetStorage,
  physicalMailProviders,
  physicalMailRouter,
  continuityAutomationEnabled: continuityAutomationSetting === 'yes',
});
const close = async () => {
  await app.close();
  await authRateLimiter.close();
  await sessionRevocationStore.close();
  await passkeyChallengeStore.close();
  await jobScheduler.close();
  await physicalMailRouter.close();
  await repository.close();
};
process.on('SIGINT', () => {
  void close().then(() => process.exit(0));
});
process.on('SIGTERM', () => {
  void close().then(() => process.exit(0));
});
await app.listen({ host: process.env.HOST ?? '127.0.0.1', port: 4000 });
