import { createHash } from 'node:crypto';

export type Binder = Readonly<{
  mediaType: 'application/pdf';
  bytes: Buffer;
  checksum: string;
  manifestHash: string;
}>;
export function renderDeterministicBinder(input: {
  householdName: string;
  manifestHash: string;
  sections: readonly string[];
}): Binder {
  const normalized = [
    `TomorrowReady Binder`,
    `Household: ${input.householdName}`,
    `Manifest: ${input.manifestHash}`,
    ...input.sections,
  ].join('\n');
  const bytes = Buffer.from(normalized, 'utf8');
  return {
    mediaType: 'application/pdf',
    bytes,
    checksum: createHash('sha256').update(bytes).digest('hex'),
    manifestHash: input.manifestHash,
  };
}
