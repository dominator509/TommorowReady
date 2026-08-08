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
export class ContinuityService {
  constructor(private readonly repository: ContinuityRepository) {}
  async createRecord(
    context: RequestContext,
    kind: string,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<StoredRecord> {
    for (const value of Object.values(payload))
      if (typeof value === 'string') assertSafeContent(value);
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
