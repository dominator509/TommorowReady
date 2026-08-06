import { loadEnvFile } from 'node:process';
import { createApp } from '../apps/api/src/app.js';
import {
  migrateDatabase,
  PostgresContinuityRepository,
} from '../packages/infrastructure/database/src/index.js';

try {
  loadEnvFile('.env');
} catch {}
if (!process.env.DATABASE_URL || !process.env.DATABASE_MIGRATION_URL)
  throw new Error('DATABASE_URL_REQUIRED');
await migrateDatabase(process.env.DATABASE_MIGRATION_URL);
const repository = new PostgresContinuityRepository(process.env.DATABASE_URL);
const app = createApp(repository);
const response = await app.inject({ method: 'GET', url: '/health/ready' });
if (response.statusCode !== 200 || response.json().status !== 'ok')
  throw new Error('SMOKE_READINESS_FAILED');
await app.close();
await repository.close();
console.log('application smoke: ok');
