import { loadEnvFile } from 'node:process';
import { migrateDatabase } from '../packages/infrastructure/database/src/index.js';

try {
  loadEnvFile('.env');
} catch {}
if (!process.env.DATABASE_MIGRATION_URL) throw new Error('DATABASE_MIGRATION_URL_REQUIRED');
if (!process.env.POSTGRES_APP_PASSWORD) throw new Error('POSTGRES_APP_PASSWORD_REQUIRED');
await migrateDatabase(
  process.env.DATABASE_MIGRATION_URL,
  'migrations/001_initial.sql',
  process.env.POSTGRES_APP_PASSWORD,
);
console.log('database migration: ok');
