import { loadEnvFile } from 'node:process';
import { createApp } from './app.js';
import { PostgresContinuityRepository } from '../../../packages/infrastructure/database/src/index.js';

try {
  loadEnvFile('.env');
} catch {}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');
const repository = new PostgresContinuityRepository(databaseUrl);
const app = createApp(repository);
const close = async () => {
  await app.close();
  await repository.close();
};
process.on('SIGINT', () => {
  void close().then(() => process.exit(0));
});
process.on('SIGTERM', () => {
  void close().then(() => process.exit(0));
});
await app.listen({ host: process.env.HOST ?? '127.0.0.1', port: 4000 });
