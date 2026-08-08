import { randomUUID } from 'node:crypto';
import {
  assertSafeContent,
  buildPacketManifest,
  evidenceHash,
  type PacketManifest,
} from '../../domain/src/index.js';

export type RequestContext = Readonly<{
  tenantId: string;
  householdId?: string;
  actorId: string;
  purpose: string;
}>;
export type StoredRecord = Readonly<{
  id: string;
  tenantId: string;
  householdId?: string;
  kind: string;
  payload: Readonly<Record<string, unknown>>;
  version: number;
}>;
export interface ContinuityRepository {
  ready(): Promise<boolean>;
  create(
    context: RequestContext,
    kind: string,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<StoredRecord>;
  get(context: RequestContext, kind: string, id: string): Promise<StoredRecord | null>;
  list(context: RequestContext, kind: string): Promise<readonly StoredRecord[]>;
  appendAudit(
    context: RequestContext,
    operation: string,
    targetId: string,
    evidenceHash: string,
  ): Promise<void>;
  savePacket(context: RequestContext, manifest: PacketManifest): Promise<void>;
}

function assertSafePayload(value: unknown, depth = 0, budget = { nodes: 0 }): void {
  budget.nodes += 1;
  if (budget.nodes > 2_000) throw new Error('PAYLOAD_COMPLEXITY_EXCEEDED');
  if (depth > 12) throw new Error('PAYLOAD_DEPTH_EXCEEDED');
  if (typeof value === 'string') {
    if (value.length > 20_000) throw new Error('PAYLOAD_STRING_TOO_LONG');
    assertSafeContent(value);
    return;
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return;
  if (Array.isArray(value)) {
    if (value.length > 500) throw new Error('PAYLOAD_ARRAY_TOO_LONG');
    for (const item of value) assertSafePayload(item, depth + 1, budget);
    return;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 200) throw new Error('PAYLOAD_FIELDS_EXCEEDED');
    for (const [key, child] of entries) {
      if (['__proto__', 'constructor', 'prototype'].includes(key))
        throw new Error('PAYLOAD_KEY_PROHIBITED');
      assertSafePayload(child, depth + 1, budget);
    }
    return;
  }
  throw new Error('PAYLOAD_VALUE_INVALID');
}

export class ContinuityService {
  constructor(private readonly repository: ContinuityRepository) {}
  async createRecord(
    context: RequestContext,
    kind: string,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<StoredRecord> {
    assertSafePayload(payload);
    const record = await this.repository.create(context, kind, payload);
    await this.repository.appendAudit(context, `create:${kind}`, record.id, evidenceHash(record));
    return record;
  }
  async createPacket(
    context: RequestContext & { householdId: string },
    input: { purpose: string; recipientId: string; itemIds: readonly string[] },
  ): Promise<PacketManifest> {
    const manifest = buildPacketManifest({
      tenantId: context.tenantId,
      householdId: context.householdId,
      packetId: randomUUID(),
      recipientId: input.recipientId,
      purpose: input.purpose,
      itemIds: input.itemIds,
      version: 1,
    });
    await this.repository.savePacket(context, manifest);
    await this.repository.appendAudit(context, 'packet:approve', manifest.id, manifest.hash);
    return manifest;
  }
}
