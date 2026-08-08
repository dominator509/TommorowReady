import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { renderDeterministicBinder } from '../../apps/report-renderer/src/index.js';

describe('deterministic report renderer', () => {
  it('emits a structurally valid, content-addressed PDF instead of mislabeled text', () => {
    const binder = renderDeterministicBinder({
      householdName: 'Owen (Family)',
      manifestHash: 'abc123',
      sections: ['People', 'Pets'],
    });
    const pdf = binder.bytes.toString('ascii');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.endsWith('%%EOF\n')).toBe(true);
    expect(pdf).toContain('(Household: Owen \\(Family\\)) Tj');
    const startXref = Number(/startxref\n(\d+)\n%%EOF/.exec(pdf)?.[1]);
    expect(pdf.slice(startXref, startXref + 4)).toBe('xref');
    expect(binder.checksum).toBe(createHash('sha256').update(binder.bytes).digest('hex'));
    expect(binder.manifestHash).toBe('abc123');
  });
});
