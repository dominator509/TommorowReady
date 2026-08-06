import { loadEnvFile } from 'node:process';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../apps/api/src/app.js';
import { PostgresContinuityRepository } from '../../packages/infrastructure/database/src/index.js';

try {
  loadEnvFile('.env');
} catch {}
describe('performance budget', () => {
  it('keeps p95 readiness reads under 350 ms at 50 concurrent users', async () => {
    const repository = new PostgresContinuityRepository(process.env.DATABASE_URL!);
    const app = createApp(repository);
    const samples = await Promise.all(
      Array.from({ length: 50 }, async () => {
        const start = performance.now();
        const response = await app.inject({ method: 'GET', url: '/v1/health/ready' });
        expect(response.statusCode).toBe(200);
        return performance.now() - start;
      }),
    );
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.ceil(samples.length * 0.95) - 1]!;
    expect(p95).toBeLessThan(350);
    await app.close();
    await repository.close();
  });
});
