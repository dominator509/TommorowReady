import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateReleaseManifest } from '../../scripts/release-manifest.js';

const digest = 'a'.repeat(64);
const productionManifest = `
apiVersion: batch/v1
kind: Job
metadata: { name: tomorrowready-migrate }
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: tomorrowready-api }
spec:
  template:
    spec:
      securityContext: { runAsNonRoot: true }
      containers:
        - name: api
          image: registry.invalid/team/tomorrowready-api@sha256:${digest}
          securityContext: { readOnlyRootFilesystem: true }
        - name: web
          image: registry.invalid/team/tomorrowready-web@sha256:${digest}
        - name: worker
          image: registry.invalid/team/tomorrowready-worker@sha256:${digest}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: tomorrowready }
`;

describe('production release manifest validation', () => {
  const directories: string[] = [];
  afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })));
  });

  async function manifest(text: string): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'tomorrowready-manifest-'));
    directories.push(directory);
    const path = join(directory, 'release.yaml');
    await writeFile(path, text, { encoding: 'utf8', mode: 0o600 });
    return path;
  }

  const hash = (text: string): string => createHash('sha256').update(text).digest('hex');

  it('accepts hardened registry-qualified digest deployments with a migration job', async () => {
    await expect(
      validateReleaseManifest(await manifest(productionManifest), hash(productionManifest)),
    ).resolves.toBeUndefined();
  });

  it('rejects local-only and tag-based release inputs', async () => {
    await expect(
      validateReleaseManifest(
        await manifest(
          productionManifest.replace(
            'kind: Deployment',
            'environment: local-rehearsal\nkind: Deployment',
          ),
        ),
        hash(
          productionManifest.replace(
            'kind: Deployment',
            'environment: local-rehearsal\nkind: Deployment',
          ),
        ),
      ),
    ).rejects.toThrow('PRODUCTION_MANIFEST_LOCAL_ONLY');
    await expect(
      validateReleaseManifest(
        await manifest(productionManifest.replace(`@sha256:${digest}`, ':latest')),
        hash(productionManifest.replace(`@sha256:${digest}`, ':latest')),
      ),
    ).rejects.toThrow('PRODUCTION_API_IMAGE_INVALID');
  });

  it('rejects release content that differs from the approved digest', async () => {
    await expect(
      validateReleaseManifest(await manifest(productionManifest), 'b'.repeat(64)),
    ).rejects.toThrow('PRODUCTION_MANIFEST_SHA256_MISMATCH');
  });
});
import { createHash } from 'node:crypto';
