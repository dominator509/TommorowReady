import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const imagePattern = /^[a-z0-9][a-z0-9._/-]*@[s]ha256:[a-f0-9]{64}$/;

export async function validateReleaseManifest(path: string, expectedSha256: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(expectedSha256)) throw new Error('PRODUCTION_MANIFEST_SHA256_INVALID');
  const text = await readFile(path, 'utf8');
  if (createHash('sha256').update(text).digest('hex') !== expectedSha256)
    throw new Error('PRODUCTION_MANIFEST_SHA256_MISMATCH');
  if (/environment:\s*local-rehearsal|imagePullPolicy:\s*Never/.test(text))
    throw new Error('PRODUCTION_MANIFEST_LOCAL_ONLY');
  if (!/kind:\s*Job[\s\S]*name:\s*tomorrowready-migrate/.test(text))
    throw new Error('PRODUCTION_MIGRATION_JOB_REQUIRED');
  const images = [...text.matchAll(/image:\s*([^\s]+)/g)].map((match) => match[1] ?? '');
  for (const component of ['api', 'web', 'worker'] as const) {
    const image = images.find((candidate) => candidate.includes(`tomorrowready-${component}@`));
    if (!image || !image.includes('/') || !imagePattern.test(image))
      throw new Error(`PRODUCTION_${component.toUpperCase()}_IMAGE_INVALID`);
  }
  if (!/readOnlyRootFilesystem:\s*true/.test(text) || !/runAsNonRoot:\s*true/.test(text))
    throw new Error('PRODUCTION_WORKLOAD_HARDENING_REQUIRED');
  if (!/kind:\s*NetworkPolicy/.test(text)) throw new Error('PRODUCTION_NETWORK_POLICY_REQUIRED');
}
