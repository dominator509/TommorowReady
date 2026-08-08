import { spawn } from 'node:child_process';
import { validateReleaseManifest } from './release-manifest.js';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}
function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command.toUpperCase()}_EXIT_${code ?? 'UNKNOWN'}`)),
    );
  });
}

if (process.env.ROLLBACK_AUTHORIZED !== 'yes') throw new Error('ROLLBACK_AUTHORIZED_REQUIRED');
const manifest = required('ROLLBACK_MANIFEST');
const context = required('KUBERNETES_CONTEXT');
const namespace = required('PRODUCTION_NAMESPACE');
if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(namespace))
  throw new Error('PRODUCTION_NAMESPACE_INVALID');
await validateReleaseManifest(manifest, required('ROLLBACK_MANIFEST_SHA256'));
const scope = ['--context', context, '--namespace', namespace];
await run('kubectl', [
  ...scope,
  'apply',
  '--server-side',
  '--field-manager=tomorrowready-rollback',
  '--filename',
  manifest,
]);
for (const deployment of ['tomorrowready-api', 'tomorrowready-web', 'tomorrowready-worker'])
  await run('kubectl', [
    ...scope,
    'rollout',
    'status',
    `deployment/${deployment}`,
    '--timeout=10m',
  ]);
console.log('rollback: ok - database contract migrations were not reversed');
