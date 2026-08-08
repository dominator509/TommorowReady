import { randomBytes } from 'node:crypto';
import { mkdir, open } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { hashPassword } from '../packages/infrastructure/auth/src/index.js';
import { PostgresContinuityRepository } from '../packages/infrastructure/database/src/index.js';

try {
  loadEnvFile('.env');
} catch {}

const env = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
};

const directory = '.agent/state/local-credentials';
const path = `${directory}/owner.json`;
await mkdir(directory, { recursive: true, mode: 0o700 });
const handle = await open(path, 'wx', 0o600).catch((error: NodeJS.ErrnoException) => {
  if (error.code === 'EEXIST') throw new Error('LOCAL_OWNER_CREDENTIALS_ALREADY_EXIST');
  throw error;
});
let repository: PostgresContinuityRepository | undefined;
try {
  repository = new PostgresContinuityRepository(
    env('DATABASE_URL'),
    env('FIELD_ENCRYPTION_KEY'),
    env('AUTH_LOOKUP_SECRET'),
  );
  const password = `${randomBytes(24).toString('base64url')}!Aa1`;
  const totpSecret = randomBytes(20).toString('base64');
  const owner = await repository.bootstrapOwner({
    email: 'local-owner@tomorrowready.invalid',
    passwordHash: await hashPassword(password),
    householdName: 'Local TomorrowReady Household',
    totpSecret,
  });
  await handle.writeFile(
    `${JSON.stringify(
      {
        ...owner,
        email: 'local-owner@tomorrowready.invalid',
        password,
        totpSecret,
        environment: 'local-only',
      },
      null,
      2,
    )}\n`,
  );
  console.log(`local owner bootstrap: ok (${path}; credential values withheld)`);
} catch (error) {
  await handle.close();
  await import('node:fs/promises').then(({ rm }) => rm(path, { force: true }));
  throw error;
} finally {
  await repository?.close();
}
await handle.close();
