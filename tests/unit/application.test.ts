import { describe, expect, it, vi } from 'vitest';
import {
  ContinuityService,
  type ContinuityRepository,
} from '../../packages/application/src/index.js';

const repository = (): ContinuityRepository => ({
  ready: vi.fn(async () => true),
  create: vi.fn(async (context, kind, payload) => ({
    id: 'e42cf70e-a054-493c-bc8f-2475de5413b0',
    tenantId: context.tenantId,
    householdId: context.householdId,
    kind,
    payload,
    version: 1,
  })),
  get: vi.fn(async () => null),
  list: vi.fn(async () => []),
  appendAudit: vi.fn(async () => undefined),
  savePacket: vi.fn(async () => undefined),
});

describe('application payload boundary', () => {
  it('rejects prohibited secrets nested below the first object level', async () => {
    const service = new ContinuityService(repository());
    await expect(
      service.createRecord(
        {
          tenantId: '009cbb07-81dd-49b0-bdbf-5585113a3f13',
          householdId: 'd7a1395d-f905-4cc4-beed-b57170be24de',
          actorId: '97607b3b-86b7-416a-965f-511dbe1735b0',
          purpose: 'unit test',
        },
        'playbook',
        { section: { notes: 'password: hunter2' } },
      ),
    ).rejects.toMatchObject({ code: 'PROHIBITED_SECRET' });
  });

  it('rejects over-complex payloads before persistence', async () => {
    const service = new ContinuityService(repository());
    await expect(
      service.createRecord(
        {
          tenantId: '009cbb07-81dd-49b0-bdbf-5585113a3f13',
          householdId: 'd7a1395d-f905-4cc4-beed-b57170be24de',
          actorId: '97607b3b-86b7-416a-965f-511dbe1735b0',
          purpose: 'unit test',
        },
        'playbook',
        { values: Array.from({ length: 501 }, (_, index) => index) },
      ),
    ).rejects.toThrow('PAYLOAD_ARRAY_TOO_LONG');
  });
});
