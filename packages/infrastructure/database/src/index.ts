import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import type { VerifiedBillingEvent } from '../../billing/src/index.js';
import type { StoredPasskey } from '../../auth/src/passkeys.js';
import type {
  ContinuityRepository,
  RequestContext,
  StoredRecord,
} from '../../../application/src/index.js';
import {
  advanceContinuityMonitor,
  assertSafeContent,
  DomainError,
  ownerContinuityMonitorAction,
  transitionRelease,
  validateContinuityMonitorPolicy,
  type ContinuityMonitorPolicy,
  type ContinuityMonitorSnapshot,
  type ContinuityMonitorState,
  type PacketManifest,
  type ReleaseState,
} from '../../../domain/src/index.js';
import type {
  VerifiedPhysicalMailEvent,
  VerifiedPostalAddress,
} from '../../physical-mail/src/index.js';
import {
  assertFieldEncryptionKey,
  decryptRestricted,
  encryptRestricted,
  type EncryptedEnvelope,
} from '../../security/src/index.js';

const encryptedPayloadKey = '_tr_encrypted_v1';
const canonicalPayloadTables = [
  'users',
  'identities',
  'tenants',
  'households',
  'memberships',
  'people',
  'dependents',
  'children',
  'pets',
  'relationships',
  'helper_grants',
  'professional_contacts',
  'emergency_contacts',
  'account_locators',
  'assets',
  'debts',
  'insurance_records',
  'properties',
  'storage_units',
  'document_locations',
  'documents',
  'document_versions',
  'extracted_candidates',
  'confirmed_facts',
  'playbooks',
  'playbook_sections',
  'funeral_wishes',
  'letters',
  'video_messages',
  'advice_items',
  'photos',
  'recipes',
  'evidence_references',
  'readiness_rule_versions',
  'readiness_results',
  'family_iq_gaps',
  'packet_definitions',
  'packet_manifests',
  'packet_manifest_items',
  'packet_recipients',
  'emergency_policies',
  'access_requests',
  'verification_evidence',
  'challenges',
  'denials',
  'release_authorizations',
  'released_packets',
  'consents',
  'annual_reviews',
  'privacy_requests',
  'exports',
  'audit_events',
  'outbox_events',
  'inbox_events',
  'jobs',
  'subscriptions',
  'ai_usage',
  'continuity_monitors',
  'recipient_delivery_profiles',
  'recipient_postal_addresses',
  'release_delivery_tokens',
  'release_artifacts',
  'physical_mail_orders',
  'physical_mail_events',
] as const;
const appendOnlyTables = [
  'audit_events',
  'consents',
  'released_packets',
  'verification_evidence',
  'release_authorizations',
  'packet_manifests',
  'document_versions',
  'evidence_references',
  'release_artifacts',
  'physical_mail_events',
] as const;

type EncryptedPayload = Readonly<{ _tr_encrypted_v1: EncryptedEnvelope } & Record<string, unknown>>;

function payloadContext(
  table: string,
  id: string,
  tenantId: string,
  householdId: string | null,
): string {
  return JSON.stringify({ version: 1, tenantId, householdId, table, id });
}

function encryptPayload(
  table: string,
  id: string,
  tenantId: string,
  householdId: string | null,
  payload: Readonly<Record<string, unknown>>,
  fieldEncryptionKey: string,
  indexedMetadata: Readonly<Record<string, string>> = {},
): EncryptedPayload {
  return {
    ...indexedMetadata,
    [encryptedPayloadKey]: encryptRestricted(
      JSON.stringify(payload),
      fieldEncryptionKey,
      payloadContext(table, id, tenantId, householdId),
    ),
  };
}

function decryptPayload(
  table: string,
  row: Readonly<{ id: string; tenant_id: string; household_id: string | null; payload: unknown }>,
  fieldEncryptionKey: string,
): Readonly<Record<string, unknown>> {
  if (!row.payload || typeof row.payload !== 'object' || !(encryptedPayloadKey in row.payload))
    throw new Error('PLAINTEXT_PAYLOAD_REJECTED');
  const envelope = (row.payload as EncryptedPayload)[encryptedPayloadKey];
  return JSON.parse(
    decryptRestricted(
      envelope,
      fieldEncryptionKey,
      payloadContext(table, row.id, row.tenant_id, row.household_id),
    ),
  ) as Readonly<Record<string, unknown>>;
}

function auditChainHash(input: Readonly<Record<string, unknown>>): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function evidenceHashForBootstrap(input: {
  email: string;
  householdName: string;
  totpSecret?: string;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        email: input.email.trim().toLowerCase(),
        householdName: input.householdName,
        totpConfigured: Boolean(input.totpSecret),
      }),
    )
    .digest('hex');
}

const kindTable: Readonly<Record<string, string>> = {
  household: 'households',
  person: 'people',
  dependent: 'dependents',
  child: 'children',
  pet: 'pets',
  contact: 'professional_contacts',
  account: 'account_locators',
  asset: 'assets',
  debt: 'debts',
  insurance: 'insurance_records',
  property: 'properties',
  storageUnit: 'storage_units',
  documentLocation: 'document_locations',
  document: 'documents',
  fact: 'confirmed_facts',
  playbook: 'playbooks',
  funeralWish: 'funeral_wishes',
  letter: 'letters',
  video: 'video_messages',
  advice: 'advice_items',
  photo: 'photos',
  recipe: 'recipes',
  helperGrant: 'helper_grants',
  consent: 'consents',
  annualReview: 'annual_reviews',
  privacyRequest: 'privacy_requests',
  export: 'exports',
  subscription: 'subscriptions',
  packet: 'packet_manifests',
  readinessResult: 'readiness_results',
  familyIqGap: 'family_iq_gaps',
  recipient: 'packet_recipients',
  emergencyPolicy: 'emergency_policies',
  accessRequest: 'access_requests',
  verification: 'verification_evidence',
  challenge: 'challenges',
  denial: 'denials',
  releaseAuthorization: 'release_authorizations',
  releasedPacket: 'released_packets',
  continuityMonitor: 'continuity_monitors',
  recipientDeliveryProfile: 'recipient_delivery_profiles',
  recipientPostalAddress: 'recipient_postal_addresses',
  releaseArtifact: 'release_artifacts',
  physicalMailOrder: 'physical_mail_orders',
};

export type ContinuityMonitorConfiguration = Readonly<{
  packetId: string;
  recipientId: string;
  checkInIntervalDays: number;
  reminderOffsetsHours: readonly number[];
  gracePeriodHours: number;
  releaseDelayHours: number;
  digitalDelivery: boolean;
  physicalMail?: Readonly<{
    addressId: string;
    provider: 'lob' | 'postgrid';
    mode: 'SECURE_ACCESS_LETTER' | 'SELECTED_INSTRUCTIONS' | 'FULL_ELIGIBLE_PACKET';
    service: 'FIRST_CLASS' | 'CERTIFIED' | 'CERTIFIED_RETURN_RECEIPT' | 'REGISTERED';
  }>;
}>;

export type DueContinuityMonitorAction = Readonly<{
  monitorId: string;
  tenantId: string;
  householdId: string;
  effect:
    | 'OWNER_CHECK_IN_DUE'
    | 'OWNER_REMINDER'
    | 'OWNER_GRACE_NOTICE'
    | 'RELEASE_PACKET'
    | 'SECURITY_LOCK';
  ownerEmail: string;
}>;

export type AutomaticReleaseDelivery = Readonly<{
  monitorId: string;
  tenantId: string;
  householdId: string;
  accessRequestId: string;
  recipientEmail?: string;
  recipientId: string;
  packetId: string;
  manifestHash: string;
  householdName: string;
  sections: readonly string[];
  physicalMail?: Readonly<{
    address: VerifiedPostalAddress;
    provider: 'lob' | 'postgrid';
    mode: 'SECURE_ACCESS_LETTER' | 'SELECTED_INSTRUCTIONS' | 'FULL_ELIGIBLE_PACKET';
    service: 'FIRST_CLASS' | 'CERTIFIED' | 'CERTIFIED_RETURN_RECEIPT' | 'REGISTERED';
  }>;
}>;

type StoredContinuityMonitor = Readonly<{
  state: ContinuityMonitorState;
  policy: ContinuityMonitorPolicy;
  packetId: string;
  recipientId: string;
  manifestId: string;
  manifestHash: string;
  ownerEmail: string;
  recipientProfileId?: string;
  postalAddressId?: string;
  physicalMail?: ContinuityMonitorConfiguration['physicalMail'];
  nextActionAt: string;
  cycleDueAt: string;
  reminderIndex: number;
  lastTestedAt?: string;
  notificationsHealthy: boolean;
  ownerDenied: boolean;
  takeoverSignal: boolean;
  accessRequestId?: string;
}>;

function monitorSnapshot(payload: StoredContinuityMonitor): ContinuityMonitorSnapshot {
  return {
    state: payload.state,
    policy: payload.policy,
    nextActionAt: new Date(payload.nextActionAt),
    cycleDueAt: new Date(payload.cycleDueAt),
    reminderIndex: payload.reminderIndex,
  };
}

function monitorMetadata(payload: StoredContinuityMonitor): Readonly<Record<string, string>> {
  return {
    state: payload.state,
    nextActionEpochMs: String(new Date(payload.nextActionAt).getTime()),
    recipientId: payload.recipientId,
    manifestId: payload.manifestId,
  };
}

const printablePacketTables = [
  'people',
  'dependents',
  'children',
  'pets',
  'professional_contacts',
  'emergency_contacts',
  'account_locators',
  'assets',
  'debts',
  'insurance_records',
  'properties',
  'storage_units',
  'document_locations',
  'confirmed_facts',
  'playbooks',
  'funeral_wishes',
  'letters',
  'advice_items',
  'recipes',
] as const;

export class PostgresContinuityRepository implements ContinuityRepository {
  readonly pool: Pool;
  private readonly fieldEncryptionKey: string;
  private readonly authLookupSecret: string;
  private readonly recoveryTokenSecret: string;
  constructor(
    connectionString: string,
    fieldEncryptionKey = process.env.FIELD_ENCRYPTION_KEY ?? '',
    authLookupSecret = process.env.AUTH_LOOKUP_SECRET ?? '',
    recoveryTokenSecret = process.env.RECOVERY_TOKEN_SECRET ?? '',
  ) {
    assertFieldEncryptionKey(fieldEncryptionKey);
    if (Buffer.byteLength(authLookupSecret, 'utf8') < 32)
      throw new Error('AUTH_LOOKUP_SECRET_INVALID');
    if (Buffer.byteLength(recoveryTokenSecret, 'utf8') < 32)
      throw new Error('RECOVERY_TOKEN_SECRET_INVALID');
    this.fieldEncryptionKey = fieldEncryptionKey;
    this.authLookupSecret = authLookupSecret;
    this.recoveryTokenSecret = recoveryTokenSecret;
    this.pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
  }
  async close(): Promise<void> {
    await this.pool.end();
  }

  async bootstrapOwner(input: {
    email: string;
    passwordHash: string;
    householdName: string;
    totpSecret?: string;
  }): Promise<Readonly<{ tenantId: string; householdId: string; userId: string }>> {
    const tenantId = randomUUID();
    const householdId = randomUUID();
    const userId = randomUUID();
    const identityId = randomUUID();
    const membershipId = randomUUID();
    const context: RequestContext = {
      tenantId,
      householdId,
      actorId: userId,
      purpose: 'local owner bootstrap',
    };
    await this.transaction(context, async (client) => {
      const rows = [
        {
          table: 'tenants',
          id: tenantId,
          householdId: null,
          payload: { name: input.householdName },
        },
        {
          table: 'households',
          id: householdId,
          householdId,
          payload: { name: input.householdName },
        },
        {
          table: 'users',
          id: userId,
          householdId,
          payload: { status: 'ACTIVE' },
        },
        {
          table: 'identities',
          id: identityId,
          householdId: null,
          payload: {
            email: input.email,
            passwordHash: input.passwordHash,
            householdId,
            userId,
            role: 'owner',
            ...(input.totpSecret ? { totpSecret: input.totpSecret } : {}),
          },
          metadata: { emailLookup: this.emailLookup(tenantId, input.email), userId },
        },
        {
          table: 'memberships',
          id: membershipId,
          householdId,
          payload: { userId, role: 'owner', status: 'ACTIVE' },
        },
      ] as const;
      for (const row of rows) {
        const payload = encryptPayload(
          row.table,
          row.id,
          tenantId,
          row.householdId,
          row.payload,
          this.fieldEncryptionKey,
          'metadata' in row ? row.metadata : {},
        );
        await client.query(
          `INSERT INTO ${row.table} (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)`,
          [row.id, tenantId, row.householdId, payload],
        );
      }
    });
    await this.appendAudit(
      context,
      'auth:owner-bootstrap',
      userId,
      evidenceHashForBootstrap(input),
    );
    return { tenantId, householdId, userId };
  }

  async findPasswordIdentity(
    tenantId: string,
    email: string,
  ): Promise<Readonly<{
    userId: string;
    householdId: string;
    role: 'owner';
    passwordHash: string;
    totpSecret?: string;
  }> | null> {
    const context: RequestContext = {
      tenantId,
      actorId: '00000000-0000-0000-0000-000000000000',
      purpose: 'password authentication',
    };
    return this.transaction(context, async (client) => {
      const result = await client.query(
        "SELECT id, tenant_id, household_id, payload FROM identities WHERE payload->>'emailLookup'=$1 LIMIT 1",
        [this.emailLookup(tenantId, email)],
      );
      const row = result.rows[0];
      if (!row) return null;
      const payload = decryptPayload('identities', row, this.fieldEncryptionKey);
      if (
        typeof payload.userId !== 'string' ||
        typeof payload.householdId !== 'string' ||
        payload.role !== 'owner' ||
        typeof payload.passwordHash !== 'string'
      )
        throw new Error('AUTH_IDENTITY_INVALID');
      return {
        userId: payload.userId,
        householdId: payload.householdId,
        role: payload.role,
        passwordHash: payload.passwordHash,
        ...(typeof payload.totpSecret === 'string' ? { totpSecret: payload.totpSecret } : {}),
      };
    });
  }

  async issuePasswordRecovery(
    tenantId: string,
    email: string,
  ): Promise<Readonly<{ email: string; token: string }> | null> {
    const context: RequestContext = {
      tenantId,
      actorId: '00000000-0000-4000-8000-000000000000',
      purpose: 'password recovery request',
    };
    return this.transaction(context, async (client) => {
      const result = await client.query(
        "SELECT id, tenant_id, household_id, payload FROM identities WHERE payload->>'emailLookup'=$1 FOR UPDATE",
        [this.emailLookup(tenantId, email)],
      );
      const row = result.rows[0];
      if (!row) return null;
      const payload = decryptPayload('identities', row, this.fieldEncryptionKey);
      if (typeof payload.email !== 'string' || typeof payload.userId !== 'string')
        throw new Error('AUTH_IDENTITY_INVALID');
      const token = randomBytes(32).toString('base64url');
      const recoveryTokenHash = this.recoveryHash(tenantId, payload.userId, token);
      const stored = encryptPayload(
        'identities',
        row.id,
        tenantId,
        row.household_id,
        {
          ...payload,
          recoveryTokenHash,
          recoveryExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        },
        this.fieldEncryptionKey,
        {
          emailLookup: String((row.payload as Record<string, unknown>).emailLookup),
          userId: payload.userId,
        },
      );
      await client.query(
        'UPDATE identities SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
        [stored, row.id],
      );
      return { email: payload.email, token };
    });
  }

  async completePasswordRecovery(
    tenantId: string,
    email: string,
    token: string,
    passwordHash: string,
  ): Promise<void> {
    const context: RequestContext = {
      tenantId,
      actorId: '00000000-0000-4000-8000-000000000000',
      purpose: 'password recovery completion',
    };
    const userId = await this.transaction(context, async (client) => {
      const result = await client.query(
        "SELECT id, tenant_id, household_id, payload FROM identities WHERE payload->>'emailLookup'=$1 FOR UPDATE",
        [this.emailLookup(tenantId, email)],
      );
      const row = result.rows[0];
      if (!row) throw new DomainError('AUTHENTICATION_FAILED', 'Recovery credential is invalid.');
      const payload = decryptPayload('identities', row, this.fieldEncryptionKey);
      if (
        typeof payload.userId !== 'string' ||
        typeof payload.recoveryTokenHash !== 'string' ||
        typeof payload.recoveryExpiresAt !== 'string' ||
        new Date(payload.recoveryExpiresAt) <= new Date()
      )
        throw new DomainError('AUTHENTICATION_FAILED', 'Recovery credential is invalid.');
      const candidate = this.recoveryHash(tenantId, payload.userId, token);
      if (
        candidate.length !== payload.recoveryTokenHash.length ||
        !timingSafeEqual(Buffer.from(candidate), Buffer.from(payload.recoveryTokenHash))
      )
        throw new DomainError('AUTHENTICATION_FAILED', 'Recovery credential is invalid.');
      const { recoveryTokenHash: _hash, recoveryExpiresAt: _expiry, ...retained } = payload;
      const stored = encryptPayload(
        'identities',
        row.id,
        tenantId,
        row.household_id,
        { ...retained, passwordHash },
        this.fieldEncryptionKey,
        {
          emailLookup: String((row.payload as Record<string, unknown>).emailLookup),
          userId: payload.userId,
        },
      );
      await client.query(
        'UPDATE identities SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
        [stored, row.id],
      );
      return payload.userId;
    });
    await this.appendAudit(
      { ...context, actorId: userId },
      'auth:password-recovered',
      userId,
      createHash('sha256').update(`${tenantId}:${userId}:recovered`).digest('hex'),
    );
  }

  private recoveryHash(tenantId: string, userId: string, token: string): string {
    return createHmac('sha256', this.recoveryTokenSecret)
      .update(`${tenantId}:${userId}:${token}`)
      .digest('hex');
  }

  async findPasskeyIdentity(
    tenantId: string,
    email: string,
  ): Promise<Readonly<{
    userId: string;
    householdId: string;
    email: string;
    role: 'owner';
    passkeys: readonly StoredPasskey[];
  }> | null> {
    const context: RequestContext = {
      tenantId,
      actorId: '00000000-0000-4000-8000-000000000000',
      purpose: 'passkey authentication',
    };
    return this.transaction(context, async (client) => {
      const result = await client.query(
        "SELECT id, tenant_id, household_id, payload FROM identities WHERE payload->>'emailLookup'=$1 LIMIT 1",
        [this.emailLookup(tenantId, email)],
      );
      const row = result.rows[0];
      return row ? this.passkeyIdentityFromRow(row) : null;
    });
  }

  async findPasskeyIdentityByUserId(
    tenantId: string,
    userId: string,
  ): Promise<Awaited<ReturnType<PostgresContinuityRepository['findPasskeyIdentity']>>> {
    const context: RequestContext = {
      tenantId,
      actorId: userId,
      purpose: 'passkey registration',
    };
    return this.transaction(context, async (client) => {
      const result = await client.query(
        "SELECT id, tenant_id, household_id, payload FROM identities WHERE payload->>'userId'=$1",
        [userId],
      );
      if (result.rows[0]) return this.passkeyIdentityFromRow(result.rows[0]);
      const fallback = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM identities',
      );
      for (const row of fallback.rows) {
        const payload = decryptPayload('identities', row, this.fieldEncryptionKey);
        if (payload.userId === userId) return this.passkeyIdentityFromRow(row);
      }
      return null;
    });
  }

  async savePasskey(tenantId: string, userId: string, passkey: StoredPasskey): Promise<void> {
    await this.updatePasskeys(tenantId, userId, (passkeys) => {
      if (passkeys.some((existing) => existing.id === passkey.id))
        throw new DomainError('PASSKEY_ALREADY_REGISTERED', 'Passkey is already registered.');
      return [...passkeys, passkey];
    });
  }

  async updatePasskeyCounter(
    tenantId: string,
    userId: string,
    credentialId: string,
    counter: number,
  ): Promise<void> {
    await this.updatePasskeys(tenantId, userId, (passkeys) =>
      passkeys.map((passkey) => (passkey.id === credentialId ? { ...passkey, counter } : passkey)),
    );
  }

  private passkeyIdentityFromRow(row: {
    id: string;
    tenant_id: string;
    household_id: string | null;
    payload: unknown;
  }) {
    const payload = decryptPayload('identities', row, this.fieldEncryptionKey);
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.householdId !== 'string' ||
      typeof payload.email !== 'string' ||
      payload.role !== 'owner'
    )
      throw new Error('AUTH_IDENTITY_INVALID');
    return {
      userId: payload.userId,
      householdId: payload.householdId,
      email: payload.email,
      role: payload.role,
      passkeys: Array.isArray(payload.passkeys) ? (payload.passkeys as StoredPasskey[]) : [],
    } as const;
  }

  private async updatePasskeys(
    tenantId: string,
    userId: string,
    update: (passkeys: readonly StoredPasskey[]) => readonly StoredPasskey[],
  ): Promise<void> {
    const context: RequestContext = {
      tenantId,
      actorId: userId,
      purpose: 'passkey credential update',
    };
    await this.transaction(context, async (client) => {
      const result = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM identities FOR UPDATE',
      );
      const row = result.rows.find((candidate) => {
        const payload = decryptPayload('identities', candidate, this.fieldEncryptionKey);
        return payload.userId === userId;
      });
      if (!row) throw new DomainError('AUTHENTICATION_FAILED', 'The credential is invalid.');
      const payload = decryptPayload('identities', row, this.fieldEncryptionKey);
      const passkeys = Array.isArray(payload.passkeys) ? (payload.passkeys as StoredPasskey[]) : [];
      const stored = encryptPayload(
        'identities',
        row.id,
        tenantId,
        row.household_id,
        { ...payload, passkeys: update(passkeys) },
        this.fieldEncryptionKey,
        {
          emailLookup: String((row.payload as Record<string, unknown>).emailLookup),
          userId,
        },
      );
      await client.query(
        'UPDATE identities SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
        [stored, row.id],
      );
    });
  }

  async processBillingEvent(
    event: VerifiedBillingEvent,
  ): Promise<'processed' | 'duplicate' | 'stale'> {
    const context: RequestContext = {
      tenantId: event.tenantId,
      householdId: event.householdId,
      actorId: '00000000-0000-4000-8000-000000000000',
      purpose: 'authenticated billing webhook',
    };
    const result = await this.transaction(context, async (client) => {
      const inboxId = randomUUID();
      const inboxPayload = encryptPayload(
        'inbox_events',
        inboxId,
        event.tenantId,
        event.householdId,
        { eventId: event.eventId, type: event.type, created: event.created },
        this.fieldEncryptionKey,
        { idempotencyKey: `stripe:${event.eventId}` },
      );
      const accepted = await client.query(
        'INSERT INTO inbox_events (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id',
        [inboxId, event.tenantId, event.householdId, inboxPayload],
      );
      if (accepted.rowCount === 0) return 'duplicate' as const;
      const existing = await client.query<{
        id: string;
        tenant_id: string;
        household_id: string | null;
        payload: Record<string, unknown>;
      }>(
        "SELECT id, tenant_id, household_id, payload FROM subscriptions WHERE tenant_id=$1 AND payload->>'providerSubscriptionId'=$2 FOR UPDATE",
        [event.tenantId, event.providerSubscriptionId],
      );
      const row = existing.rows[0];
      if (row && Number(row.payload.providerEventCreated ?? -1) > event.created)
        return 'stale' as const;
      const id = row?.id ?? randomUUID();
      const payload = encryptPayload(
        'subscriptions',
        id,
        event.tenantId,
        event.householdId,
        {
          providerCustomerId: event.providerCustomerId,
          status: event.status,
          lastEventType: event.type,
        },
        this.fieldEncryptionKey,
        {
          providerSubscriptionId: event.providerSubscriptionId,
          providerEventCreated: String(event.created),
        },
      );
      if (row)
        await client.query(
          'UPDATE subscriptions SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
          [payload, id],
        );
      else
        await client.query(
          'INSERT INTO subscriptions (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
          [id, event.tenantId, event.householdId, payload],
        );
      return 'processed' as const;
    });
    if (result !== 'duplicate')
      await this.appendAudit(
        context,
        `billing:${result}`,
        event.providerSubscriptionId,
        createHash('sha256').update(event.eventId).digest('hex'),
      );
    return result;
  }

  async recordReleaseEvidence(
    context: RequestContext & { householdId: string },
    accessRequestId: string,
    evidence: Readonly<{
      recipientVerified: boolean;
      packetScopeMatches: boolean;
      verificationSatisfied: boolean;
      providerAmbiguous: boolean;
      providerReference: string;
    }>,
  ): Promise<void> {
    const id = randomUUID();
    await this.transaction(context, async (client) => {
      const request = await client.query('SELECT 1 FROM access_requests WHERE id=$1', [
        accessRequestId,
      ]);
      if (request.rowCount !== 1)
        throw new DomainError('ACCESS_REQUEST_NOT_FOUND', 'Access request not found.');
      const payload = encryptPayload(
        'verification_evidence',
        id,
        context.tenantId,
        context.householdId,
        evidence,
        this.fieldEncryptionKey,
        { accessRequestId },
      );
      await client.query(
        'INSERT INTO verification_evidence (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
        [id, context.tenantId, context.householdId, payload],
      );
    });
    await this.appendAudit(
      context,
      'release:verification-evidence',
      accessRequestId,
      createHash('sha256').update(evidence.providerReference).digest('hex'),
    );
  }

  async recordReleaseChallenge(
    context: RequestContext & { householdId: string },
    accessRequestId: string,
    endsAt: Date,
  ): Promise<void> {
    if (!Number.isFinite(endsAt.getTime())) throw new Error('CHALLENGE_END_INVALID');
    const id = randomUUID();
    await this.transaction(context, async (client) => {
      const payload = encryptPayload(
        'challenges',
        id,
        context.tenantId,
        context.householdId,
        { accessRequestId, endsAt: endsAt.toISOString() },
        this.fieldEncryptionKey,
        { accessRequestId },
      );
      await client.query(
        'INSERT INTO challenges (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
        [id, context.tenantId, context.householdId, payload],
      );
    });
    await this.appendAudit(
      context,
      'release:challenge-recorded',
      accessRequestId,
      createHash('sha256').update(endsAt.toISOString()).digest('hex'),
    );
  }

  async transitionReleaseRequest(
    context: RequestContext & { householdId: string },
    accessRequestId: string,
    next: ReleaseState,
    idempotencyKey: string,
  ): Promise<ReleaseState> {
    const result = await this.transaction(context, async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `release:${context.tenantId}:${accessRequestId}`,
      ]);
      const requestResult = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM access_requests WHERE id=$1 FOR UPDATE',
        [accessRequestId],
      );
      const row = requestResult.rows[0];
      if (!row) throw new DomainError('ACCESS_REQUEST_NOT_FOUND', 'Access request not found.');
      const requestPayload = decryptPayload('access_requests', row, this.fieldEncryptionKey);
      const current = requestPayload.state as ReleaseState;
      if (!current) throw new Error('ACCESS_REQUEST_STATE_INVALID');
      const inputHash = createHash('sha256')
        .update(JSON.stringify({ accessRequestId, next }))
        .digest('hex');
      const inboxId = randomUUID();
      const inboxPayload = encryptPayload(
        'inbox_events',
        inboxId,
        context.tenantId,
        context.householdId,
        { accessRequestId, next },
        this.fieldEncryptionKey,
        { idempotencyKey: `release:${idempotencyKey}`, inputHash },
      );
      const inserted = await client.query(
        'INSERT INTO inbox_events (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id',
        [inboxId, context.tenantId, context.householdId, inboxPayload],
      );
      if (inserted.rowCount === 0) {
        const prior = await client.query(
          "SELECT payload->>'inputHash' AS input_hash FROM inbox_events WHERE payload->>'idempotencyKey'=$1",
          [`release:${idempotencyKey}`],
        );
        if (prior.rows[0]?.input_hash !== inputHash)
          throw new DomainError(
            'IDEMPOTENCY_KEY_REUSED',
            'Idempotency key was reused for different input.',
          );
        return { state: current, changed: false } as const;
      }
      const evidenceResult = await client.query(
        "SELECT id, tenant_id, household_id, payload FROM verification_evidence WHERE payload->>'accessRequestId'=$1 ORDER BY created_at DESC LIMIT 1",
        [accessRequestId],
      );
      const evidenceRow = evidenceResult.rows[0];
      const evidence = evidenceRow
        ? decryptPayload('verification_evidence', evidenceRow, this.fieldEncryptionKey)
        : {};
      const challengeResult = await client.query(
        "SELECT id, tenant_id, household_id, payload FROM challenges WHERE payload->>'accessRequestId'=$1 ORDER BY created_at DESC LIMIT 1",
        [accessRequestId],
      );
      const challenge = challengeResult.rows[0]
        ? decryptPayload('challenges', challengeResult.rows[0], this.fieldEncryptionKey)
        : {};
      const denial = await client.query(
        "SELECT 1 FROM denials WHERE payload->>'accessRequestId'=$1 LIMIT 1",
        [accessRequestId],
      );
      const state = transitionRelease(current, next, {
        recipientVerified: evidence.recipientVerified === true,
        packetScopeMatches: evidence.packetScopeMatches === true,
        verificationSatisfied: evidence.verificationSatisfied === true,
        providerAmbiguous: evidence.providerAmbiguous === true,
        ownerDenied: denial.rowCount === 1,
        takeoverSignal: evidence.takeoverSignal === true,
        challengeEndsAt:
          typeof challenge.endsAt === 'string'
            ? new Date(challenge.endsAt)
            : new Date(8_640_000_000_000_000),
        now: new Date(),
      });
      let manifest:
        Readonly<{ id: string; hash: string; packetId: string; recipientId: string }> | undefined;
      if (state === 'APPROVED_FOR_RELEASE' || state === 'RELEASED') {
        const manifests = await client.query(
          'SELECT id, tenant_id, household_id, payload FROM packet_manifests WHERE household_id=$1',
          [context.householdId],
        );
        for (const manifestRow of manifests.rows) {
          const candidate = decryptPayload(
            'packet_manifests',
            manifestRow,
            this.fieldEncryptionKey,
          );
          if (
            candidate.packetId === requestPayload.packetId &&
            candidate.recipientId === requestPayload.recipientId &&
            typeof candidate.hash === 'string'
          ) {
            manifest = {
              id: manifestRow.id,
              hash: candidate.hash,
              packetId: candidate.packetId as string,
              recipientId: candidate.recipientId as string,
            };
            break;
          }
        }
        if (!manifest)
          throw new DomainError(
            'PACKET_MANIFEST_NOT_FOUND',
            'An approved scoped packet manifest is required.',
          );
      }
      const updatedPayload = encryptPayload(
        'access_requests',
        accessRequestId,
        context.tenantId,
        context.householdId,
        { ...requestPayload, state },
        this.fieldEncryptionKey,
      );
      await client.query(
        'UPDATE access_requests SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
        [updatedPayload, accessRequestId],
      );
      if (state === 'APPROVED_FOR_RELEASE') {
        const authorizationId = randomUUID();
        const authorization = encryptPayload(
          'release_authorizations',
          authorizationId,
          context.tenantId,
          context.householdId,
          {
            accessRequestId,
            evidenceId: evidenceRow.id,
            manifestId: manifest!.id,
            manifestHash: manifest!.hash,
            approvedAt: new Date().toISOString(),
          },
          this.fieldEncryptionKey,
          { accessRequestId },
        );
        await client.query(
          'INSERT INTO release_authorizations (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
          [authorizationId, context.tenantId, context.householdId, authorization],
        );
      }
      if (state === 'RELEASED') {
        const authorization = await client.query(
          "SELECT id FROM release_authorizations WHERE payload->>'accessRequestId'=$1 ORDER BY created_at DESC LIMIT 1",
          [accessRequestId],
        );
        const authorizationId = authorization.rows[0]?.id as string | undefined;
        if (!authorizationId)
          throw new DomainError(
            'RELEASE_AUTHORIZATION_REQUIRED',
            'Release authorization is required.',
          );
        const releasedId = randomUUID();
        const released = encryptPayload(
          'released_packets',
          releasedId,
          context.tenantId,
          context.householdId,
          {
            accessRequestId,
            authorizationId,
            manifestId: manifest!.id,
            manifestHash: manifest!.hash,
            recipientId: manifest!.recipientId,
            releasedAt: new Date().toISOString(),
          },
          this.fieldEncryptionKey,
          { accessRequestId },
        );
        await client.query(
          'INSERT INTO released_packets (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
          [releasedId, context.tenantId, context.householdId, released],
        );
      }
      return { state, changed: true } as const;
    });
    if (result.changed)
      await this.appendAudit(
        context,
        `release:${result.state.toLowerCase()}`,
        accessRequestId,
        createHash('sha256').update(`${idempotencyKey}:${result.state}`).digest('hex'),
      );
    return result.state;
  }

  async createRecipientVerification(
    context: RequestContext & { householdId: string },
    recipientId: string,
    email: string,
  ): Promise<Readonly<{ profileId: string; token: string; email: string; expiresAt: string }>> {
    const profileId = randomUUID();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 48 * 3_600_000).toISOString();
    const normalizedEmail = email.trim().toLowerCase();
    const tokenHash = this.recoveryHash(context.tenantId, profileId, token);
    await this.transaction(context, async (client) => {
      const payload = encryptPayload(
        'recipient_delivery_profiles',
        profileId,
        context.tenantId,
        context.householdId,
        { recipientId, email: normalizedEmail, status: 'PENDING', expiresAt },
        this.fieldEncryptionKey,
        { recipientId, status: 'PENDING', tokenHash },
      );
      await client.query(
        'INSERT INTO recipient_delivery_profiles (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
        [profileId, context.tenantId, context.householdId, payload],
      );
    });
    await this.appendAudit(
      context,
      'continuity-monitor:recipient-verification-requested',
      profileId,
      createHash('sha256').update(recipientId).digest('hex'),
    );
    return { profileId, token, email: normalizedEmail, expiresAt };
  }

  async completeRecipientVerification(input: {
    tenantId: string;
    householdId: string;
    profileId: string;
    token: string;
  }): Promise<void> {
    const context: RequestContext & { householdId: string } = {
      tenantId: input.tenantId,
      householdId: input.householdId,
      actorId: input.profileId,
      purpose: 'recipient delivery verification',
    };
    await this.transaction(context, async (client) => {
      const result = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM recipient_delivery_profiles WHERE id=$1 FOR UPDATE',
        [input.profileId],
      );
      const row = result.rows[0];
      if (!row)
        throw new DomainError(
          'RECIPIENT_VERIFICATION_INVALID',
          'Verification is invalid or expired.',
        );
      const payload = decryptPayload('recipient_delivery_profiles', row, this.fieldEncryptionKey);
      const storedHash = (row.payload as Record<string, unknown>).tokenHash;
      const suppliedHash = this.recoveryHash(input.tenantId, input.profileId, input.token);
      if (
        typeof storedHash !== 'string' ||
        storedHash.length !== suppliedHash.length ||
        !timingSafeEqual(Buffer.from(storedHash), Buffer.from(suppliedHash)) ||
        typeof payload.expiresAt !== 'string' ||
        new Date(payload.expiresAt).getTime() < Date.now() ||
        payload.status !== 'PENDING'
      )
        throw new DomainError(
          'RECIPIENT_VERIFICATION_INVALID',
          'Verification is invalid or expired.',
        );
      const verifiedAt = new Date().toISOString();
      const updated = encryptPayload(
        'recipient_delivery_profiles',
        input.profileId,
        input.tenantId,
        input.householdId,
        { ...payload, status: 'VERIFIED', verifiedAt },
        this.fieldEncryptionKey,
        { recipientId: String(payload.recipientId), status: 'VERIFIED' },
      );
      await client.query(
        'UPDATE recipient_delivery_profiles SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
        [updated, input.profileId],
      );
    });
    await this.appendAudit(
      context,
      'continuity-monitor:recipient-verified',
      input.profileId,
      createHash('sha256').update(input.profileId).digest('hex'),
    );
  }

  async saveVerifiedPostalAddress(
    context: RequestContext & { householdId: string },
    recipientId: string,
    address: VerifiedPostalAddress,
  ): Promise<string> {
    const id = randomUUID();
    await this.transaction(context, async (client) => {
      const payload = encryptPayload(
        'recipient_postal_addresses',
        id,
        context.tenantId,
        context.householdId,
        { recipientId, ...address },
        this.fieldEncryptionKey,
        {
          recipientId,
          provider: address.provider,
          verificationEpochMs: String(new Date(address.verifiedAt).getTime()),
        },
      );
      await client.query(
        'INSERT INTO recipient_postal_addresses (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
        [id, context.tenantId, context.householdId, payload],
      );
    });
    await this.appendAudit(
      context,
      'continuity-monitor:postal-address-verified',
      id,
      createHash('sha256').update(address.providerAddressId).digest('hex'),
    );
    return id;
  }

  async createContinuityMonitor(
    context: RequestContext & { householdId: string },
    input: ContinuityMonitorConfiguration,
  ): Promise<StoredRecord> {
    const policy: ContinuityMonitorPolicy = {
      checkInIntervalDays: input.checkInIntervalDays,
      reminderOffsetsHours: [...input.reminderOffsetsHours],
      gracePeriodHours: input.gracePeriodHours,
      releaseDelayHours: input.releaseDelayHours,
      digitalDelivery: input.digitalDelivery,
      ...(input.physicalMail ? { physicalMailMode: input.physicalMail.mode } : {}),
    };
    validateContinuityMonitorPolicy(policy);
    const id = randomUUID();
    const now = new Date();
    const stored = await this.transaction(context, async (client) => {
      const manifests = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM packet_manifests WHERE household_id=$1',
        [context.householdId],
      );
      const manifestRow = manifests.rows.find((row) => {
        const candidate = decryptPayload('packet_manifests', row, this.fieldEncryptionKey);
        return candidate.packetId === input.packetId && candidate.recipientId === input.recipientId;
      });
      if (!manifestRow)
        throw new DomainError(
          'PACKET_MANIFEST_NOT_FOUND',
          'An approved recipient-scoped packet is required.',
        );
      const manifest = decryptPayload('packet_manifests', manifestRow, this.fieldEncryptionKey);
      const identityResult = await client.query(
        "SELECT id, tenant_id, household_id, payload FROM identities WHERE payload->>'userId'=$1 LIMIT 1",
        [context.actorId],
      );
      const identityRow = identityResult.rows[0];
      const identity = identityRow
        ? decryptPayload('identities', identityRow, this.fieldEncryptionKey)
        : {};
      if (typeof identity.email !== 'string')
        throw new DomainError(
          'OWNER_NOTIFICATION_REQUIRED',
          'An owner notification address is required.',
        );
      let recipientProfileId: string | undefined;
      if (input.digitalDelivery) {
        const profiles = await client.query(
          "SELECT id FROM recipient_delivery_profiles WHERE payload->>'recipientId'=$1 AND payload->>'status'='VERIFIED' ORDER BY updated_at DESC LIMIT 1",
          [input.recipientId],
        );
        recipientProfileId = profiles.rows[0]?.id as string | undefined;
        if (!recipientProfileId)
          throw new DomainError('RECIPIENT_NOT_VERIFIED', 'The recipient email must be verified.');
      }
      let postalAddressId: string | undefined;
      if (input.physicalMail) {
        const address = await client.query(
          "SELECT id FROM recipient_postal_addresses WHERE id=$1 AND payload->>'recipientId'=$2 AND payload->>'provider'=$3",
          [input.physicalMail.addressId, input.recipientId, input.physicalMail.provider],
        );
        postalAddressId = address.rows[0]?.id as string | undefined;
        if (!postalAddressId)
          throw new DomainError(
            'POSTAL_ADDRESS_NOT_VERIFIED',
            'A verified postal address is required.',
          );
      }
      const monitor: StoredContinuityMonitor = {
        state: 'DISABLED',
        policy,
        packetId: input.packetId,
        recipientId: input.recipientId,
        manifestId: manifestRow.id,
        manifestHash: String(manifest.hash),
        ownerEmail: identity.email,
        ...(recipientProfileId ? { recipientProfileId } : {}),
        ...(postalAddressId ? { postalAddressId } : {}),
        ...(input.physicalMail ? { physicalMail: input.physicalMail } : {}),
        nextActionAt: now.toISOString(),
        cycleDueAt: now.toISOString(),
        reminderIndex: 0,
        notificationsHealthy: true,
        ownerDenied: false,
        takeoverSignal: false,
      };
      const encrypted = encryptPayload(
        'continuity_monitors',
        id,
        context.tenantId,
        context.householdId,
        monitor,
        this.fieldEncryptionKey,
        monitorMetadata(monitor),
      );
      await client.query(
        'INSERT INTO continuity_monitors (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
        [id, context.tenantId, context.householdId, encrypted],
      );
      return {
        id,
        tenantId: context.tenantId,
        householdId: context.householdId,
        kind: 'continuityMonitor',
        payload: monitor,
        version: 1,
      } as const;
    });
    await this.appendAudit(
      context,
      'continuity-monitor:created-disabled',
      id,
      createHash('sha256').update(`${input.packetId}:${input.recipientId}`).digest('hex'),
    );
    return stored;
  }

  async markContinuityMonitorTested(
    context: RequestContext & { householdId: string },
    monitorId: string,
  ): Promise<void> {
    const testedAt = new Date().toISOString();
    await this.transaction(context, async (client) => {
      const result = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM continuity_monitors WHERE id=$1 FOR UPDATE',
        [monitorId],
      );
      const row = result.rows[0];
      if (!row)
        throw new DomainError('CONTINUITY_MONITOR_NOT_FOUND', 'Continuity monitor not found.');
      const monitor = decryptPayload(
        'continuity_monitors',
        row,
        this.fieldEncryptionKey,
      ) as StoredContinuityMonitor;
      const updated = { ...monitor, lastTestedAt: testedAt, notificationsHealthy: true };
      await client.query(
        'UPDATE continuity_monitors SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
        [
          encryptPayload(
            'continuity_monitors',
            monitorId,
            context.tenantId,
            context.householdId,
            updated,
            this.fieldEncryptionKey,
            monitorMetadata(updated),
          ),
          monitorId,
        ],
      );
    });
    await this.appendAudit(
      context,
      'continuity-monitor:test-passed',
      monitorId,
      createHash('sha256').update(testedAt).digest('hex'),
    );
  }

  async applyContinuityMonitorAction(
    context: RequestContext & { householdId: string },
    monitorId: string,
    action: 'ARM' | 'CHECK_IN' | 'SNOOZE' | 'CANCEL' | 'DENY',
    snoozeHours?: number,
  ): Promise<Readonly<{ state: ContinuityMonitorState; nextActionAt: string }>> {
    const now = new Date();
    const result = await this.transaction(context, async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `continuity-monitor:${context.tenantId}:${monitorId}`,
      ]);
      const selected = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM continuity_monitors WHERE id=$1 FOR UPDATE',
        [monitorId],
      );
      const row = selected.rows[0];
      if (!row)
        throw new DomainError('CONTINUITY_MONITOR_NOT_FOUND', 'Continuity monitor not found.');
      const monitor = decryptPayload(
        'continuity_monitors',
        row,
        this.fieldEncryptionKey,
      ) as StoredContinuityMonitor;
      const recentSuccessfulTest =
        typeof monitor.lastTestedAt === 'string' &&
        now.getTime() - new Date(monitor.lastTestedAt).getTime() <= 365 * 86_400_000;
      const next = ownerContinuityMonitorAction(monitorSnapshot(monitor), action, now, {
        recentSuccessfulTest,
        ...(snoozeHours === undefined ? {} : { snoozeHours }),
      });
      const updated: StoredContinuityMonitor = {
        ...monitor,
        state: next.state,
        nextActionAt: next.nextActionAt.toISOString(),
        cycleDueAt: next.cycleDueAt.toISOString(),
        reminderIndex: next.reminderIndex,
        ownerDenied: action === 'DENY' ? true : monitor.ownerDenied,
      };
      await client.query(
        'UPDATE continuity_monitors SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
        [
          encryptPayload(
            'continuity_monitors',
            monitorId,
            context.tenantId,
            context.householdId,
            updated,
            this.fieldEncryptionKey,
            monitorMetadata(updated),
          ),
          monitorId,
        ],
      );
      return { state: next.state, nextActionAt: next.nextActionAt.toISOString() } as const;
    });
    await this.appendAudit(
      context,
      `continuity-monitor:${action.toLowerCase()}`,
      monitorId,
      createHash('sha256').update(`${action}:${result.nextActionAt}`).digest('hex'),
    );
    return result;
  }

  async advanceContinuityMonitorForJob(
    context: RequestContext & { householdId: string },
    monitorId: string,
    now = new Date(),
  ): Promise<
    Readonly<{
      state: ContinuityMonitorState;
      effect: DueContinuityMonitorAction['effect'] | 'NONE';
      nextActionAt: string;
      ownerEmail: string;
    }>
  > {
    return this.transaction(context, async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `continuity-monitor:${context.tenantId}:${monitorId}`,
      ]);
      const selected = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM continuity_monitors WHERE id=$1 FOR UPDATE',
        [monitorId],
      );
      const row = selected.rows[0];
      if (!row)
        throw new DomainError('CONTINUITY_MONITOR_NOT_FOUND', 'Continuity monitor not found.');
      const monitor = decryptPayload(
        'continuity_monitors',
        row,
        this.fieldEncryptionKey,
      ) as StoredContinuityMonitor;
      const manifestResult = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM packet_manifests WHERE id=$1',
        [monitor.manifestId],
      );
      const manifestRow = manifestResult.rows[0];
      const manifest = manifestRow
        ? decryptPayload('packet_manifests', manifestRow, this.fieldEncryptionKey)
        : {};
      let recipientVerified = !monitor.policy.digitalDelivery;
      if (monitor.recipientProfileId) {
        const profileResult = await client.query(
          'SELECT id, tenant_id, household_id, payload FROM recipient_delivery_profiles WHERE id=$1',
          [monitor.recipientProfileId],
        );
        const profile = profileResult.rows[0]
          ? decryptPayload(
              'recipient_delivery_profiles',
              profileResult.rows[0],
              this.fieldEncryptionKey,
            )
          : {};
        recipientVerified =
          profile.status === 'VERIFIED' &&
          typeof profile.verifiedAt === 'string' &&
          now.getTime() - new Date(profile.verifiedAt).getTime() <= 365 * 86_400_000;
      }
      let addressVerified = !monitor.physicalMail;
      if (monitor.postalAddressId) {
        const addressResult = await client.query(
          'SELECT id, tenant_id, household_id, payload FROM recipient_postal_addresses WHERE id=$1',
          [monitor.postalAddressId],
        );
        const address = addressResult.rows[0]
          ? decryptPayload(
              'recipient_postal_addresses',
              addressResult.rows[0],
              this.fieldEncryptionKey,
            )
          : {};
        addressVerified =
          typeof address.verifiedAt === 'string' &&
          now.getTime() - new Date(address.verifiedAt).getTime() <= 365 * 86_400_000;
      }
      const decision = advanceContinuityMonitor(
        monitorSnapshot(monitor),
        {
          recipientVerified,
          manifestCurrent:
            manifest.hash === monitor.manifestHash &&
            manifest.packetId === monitor.packetId &&
            manifest.recipientId === monitor.recipientId,
          recentSuccessfulTest:
            typeof monitor.lastTestedAt === 'string' &&
            now.getTime() - new Date(monitor.lastTestedAt).getTime() <= 365 * 86_400_000,
          notificationsHealthy: monitor.notificationsHealthy,
          ownerDenied: monitor.ownerDenied,
          takeoverSignal: monitor.takeoverSignal,
          addressVerified,
        },
        now,
      );
      const updated: StoredContinuityMonitor = {
        ...monitor,
        state: decision.state,
        nextActionAt: decision.nextActionAt.toISOString(),
        cycleDueAt: decision.cycleDueAt.toISOString(),
        reminderIndex: decision.reminderIndex,
      };
      await client.query(
        'UPDATE continuity_monitors SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
        [
          encryptPayload(
            'continuity_monitors',
            monitorId,
            context.tenantId,
            context.householdId,
            updated,
            this.fieldEncryptionKey,
            monitorMetadata(updated),
          ),
          monitorId,
        ],
      );
      return {
        state: decision.state,
        effect: decision.effect,
        nextActionAt: decision.nextActionAt.toISOString(),
        ownerEmail: monitor.ownerEmail,
      };
    });
  }

  async markContinuityMonitorNotificationFailure(
    context: RequestContext & { householdId: string },
    monitorId: string,
  ): Promise<void> {
    await this.transaction(context, async (client) => {
      const selected = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM continuity_monitors WHERE id=$1 FOR UPDATE',
        [monitorId],
      );
      const row = selected.rows[0];
      if (!row) return;
      const monitor = decryptPayload(
        'continuity_monitors',
        row,
        this.fieldEncryptionKey,
      ) as StoredContinuityMonitor;
      if (['AUTOMATICALLY_RELEASED', 'CANCELLED', 'OWNER_DENIED'].includes(monitor.state)) return;
      const updated: StoredContinuityMonitor = {
        ...monitor,
        state: 'SECURITY_LOCKED',
        notificationsHealthy: false,
        nextActionAt: new Date().toISOString(),
      };
      await client.query(
        'UPDATE continuity_monitors SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
        [
          encryptPayload(
            'continuity_monitors',
            monitorId,
            context.tenantId,
            context.householdId,
            updated,
            this.fieldEncryptionKey,
            monitorMetadata(updated),
          ),
          monitorId,
        ],
      );
    });
    await this.appendAudit(
      context,
      'continuity-monitor:notification-failure-locked',
      monitorId,
      createHash('sha256').update(monitorId).digest('hex'),
    );
  }

  async prepareAutomaticRelease(
    context: RequestContext & { householdId: string },
    monitorId: string,
  ): Promise<AutomaticReleaseDelivery> {
    const prepared = await this.transaction(context, async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `continuity-release:${context.tenantId}:${monitorId}`,
      ]);
      const selected = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM continuity_monitors WHERE id=$1 FOR UPDATE',
        [monitorId],
      );
      const row = selected.rows[0];
      if (!row)
        throw new DomainError('CONTINUITY_MONITOR_NOT_FOUND', 'Continuity monitor not found.');
      let monitor = decryptPayload(
        'continuity_monitors',
        row,
        this.fieldEncryptionKey,
      ) as StoredContinuityMonitor;
      if (monitor.state !== 'RELEASE_PENDING' && monitor.state !== 'AUTOMATICALLY_RELEASED')
        throw new DomainError('RELEASE_POLICY_UNSATISFIED', 'Automatic release is not pending.');
      let accessRequestId = monitor.accessRequestId;
      if (!accessRequestId) {
        accessRequestId = randomUUID();
        const requestPayload = encryptPayload(
          'access_requests',
          accessRequestId,
          context.tenantId,
          context.householdId,
          {
            packetId: monitor.packetId,
            recipientId: monitor.recipientId,
            purpose: 'owner-configured continuity monitor',
            state: 'REQUESTED',
            source: 'CONTINUITY_MONITOR',
            monitorId,
          },
          this.fieldEncryptionKey,
        );
        await client.query(
          'INSERT INTO access_requests (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
          [accessRequestId, context.tenantId, context.householdId, requestPayload],
        );
        const evidenceId = randomUUID();
        await client.query(
          'INSERT INTO verification_evidence (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
          [
            evidenceId,
            context.tenantId,
            context.householdId,
            encryptPayload(
              'verification_evidence',
              evidenceId,
              context.tenantId,
              context.householdId,
              {
                recipientVerified: true,
                packetScopeMatches: true,
                verificationSatisfied: true,
                providerAmbiguous: false,
                takeoverSignal: false,
                providerReference: monitor.recipientProfileId ?? monitor.postalAddressId,
                source: 'PREVERIFIED_CONTINUITY_MONITOR',
              },
              this.fieldEncryptionKey,
              { accessRequestId },
            ),
          ],
        );
        const challengeId = randomUUID();
        const endsAt = new Date(Date.now() - 1_000).toISOString();
        await client.query(
          'INSERT INTO challenges (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
          [
            challengeId,
            context.tenantId,
            context.householdId,
            encryptPayload(
              'challenges',
              challengeId,
              context.tenantId,
              context.householdId,
              { accessRequestId, endsAt, source: 'CONTINUITY_MONITOR_GRACE' },
              this.fieldEncryptionKey,
              { accessRequestId },
            ),
          ],
        );
        monitor = { ...monitor, accessRequestId };
        await client.query(
          'UPDATE continuity_monitors SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
          [
            encryptPayload(
              'continuity_monitors',
              monitorId,
              context.tenantId,
              context.householdId,
              monitor,
              this.fieldEncryptionKey,
              monitorMetadata(monitor),
            ),
            monitorId,
          ],
        );
      }
      return { monitor, accessRequestId } as const;
    });

    const currentResult = await this.get(context, 'accessRequest', prepared.accessRequestId);
    let state = currentResult?.payload.state as ReleaseState;
    const sequence: readonly ReleaseState[] = [
      'VERIFYING',
      'CHALLENGE_ACTIVE',
      'APPROVED_FOR_RELEASE',
      'RELEASED',
    ];
    for (const next of sequence) {
      if (state === 'RELEASED') break;
      const currentIndex = ['REQUESTED', ...sequence].indexOf(state);
      const nextIndex = ['REQUESTED', ...sequence].indexOf(next);
      if (nextIndex !== currentIndex + 1) continue;
      state = await this.transitionReleaseRequest(
        context,
        prepared.accessRequestId,
        next,
        `continuity:${monitorId}:${next}`,
      );
    }
    if (state !== 'RELEASED')
      throw new DomainError('AUTOMATIC_RELEASE_INCOMPLETE', 'Automatic release did not complete.');

    return this.transaction(context, async (client) => {
      const monitor = prepared.monitor;
      const manifestResult = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM packet_manifests WHERE id=$1',
        [monitor.manifestId],
      );
      const manifestRow = manifestResult.rows[0];
      if (!manifestRow) throw new Error('PACKET_MANIFEST_NOT_FOUND');
      const manifest = decryptPayload('packet_manifests', manifestRow, this.fieldEncryptionKey);
      const itemIds = Array.isArray(manifest.itemIds)
        ? manifest.itemIds.filter((id): id is string => typeof id === 'string')
        : [];
      const sections: string[] = [];
      for (const table of printablePacketTables) {
        if (itemIds.length === 0) break;
        const records = await client.query(
          `SELECT id, tenant_id, household_id, payload FROM ${table} WHERE id = ANY($1::uuid[])`,
          [itemIds],
        );
        for (const record of records.rows) {
          const value = decryptPayload(table, record, this.fieldEncryptionKey);
          const summary = `${table}: ${JSON.stringify(value)}`;
          assertSafeContent(summary);
          sections.push(summary.slice(0, 2_000));
        }
      }
      if (sections.length === 0) sections.push('No printable packet items were selected.');
      const householdResult = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM households WHERE id=$1',
        [context.householdId],
      );
      const household = householdResult.rows[0]
        ? decryptPayload('households', householdResult.rows[0], this.fieldEncryptionKey)
        : {};
      let recipientEmail: string | undefined;
      if (monitor.recipientProfileId) {
        const profileResult = await client.query(
          'SELECT id, tenant_id, household_id, payload FROM recipient_delivery_profiles WHERE id=$1',
          [monitor.recipientProfileId],
        );
        const profile = profileResult.rows[0]
          ? decryptPayload(
              'recipient_delivery_profiles',
              profileResult.rows[0],
              this.fieldEncryptionKey,
            )
          : {};
        if (profile.status === 'VERIFIED' && typeof profile.email === 'string')
          recipientEmail = profile.email;
      }
      let physicalMail: AutomaticReleaseDelivery['physicalMail'];
      if (monitor.physicalMail && monitor.postalAddressId) {
        const addressResult = await client.query(
          'SELECT id, tenant_id, household_id, payload FROM recipient_postal_addresses WHERE id=$1',
          [monitor.postalAddressId],
        );
        if (addressResult.rows[0]) {
          const address = decryptPayload(
            'recipient_postal_addresses',
            addressResult.rows[0],
            this.fieldEncryptionKey,
          ) as VerifiedPostalAddress & { recipientId: string };
          physicalMail = { address, ...monitor.physicalMail };
        }
      }
      return {
        monitorId,
        tenantId: context.tenantId,
        householdId: context.householdId,
        accessRequestId: prepared.accessRequestId,
        ...(recipientEmail ? { recipientEmail } : {}),
        recipientId: monitor.recipientId,
        packetId: monitor.packetId,
        manifestHash: monitor.manifestHash,
        householdName: typeof household.name === 'string' ? household.name : 'Household',
        sections,
        ...(physicalMail ? { physicalMail } : {}),
      };
    });
  }

  async recordReleaseArtifact(
    context: RequestContext & { householdId: string },
    input: Readonly<{
      monitorId: string;
      accessRequestId: string;
      objectId: string;
      checksumSha256: string;
      manifestHash: string;
      recipientId: string;
    }>,
  ): Promise<Readonly<{ tokenId: string; token: string; expiresAt: string }>> {
    const artifactId = randomUUID();
    const tokenId = randomUUID();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const tokenHash = this.recoveryHash(context.tenantId, tokenId, token);
    const result = await this.transaction(context, async (client) => {
      const existing = await client.query(
        "SELECT id, tenant_id, household_id, payload FROM release_artifacts WHERE payload->>'accessRequestId'=$1 LIMIT 1",
        [input.accessRequestId],
      );
      if (existing.rows[0]) {
        const prior = decryptPayload(
          'release_artifacts',
          existing.rows[0],
          this.fieldEncryptionKey,
        );
        if (
          typeof prior.tokenId !== 'string' ||
          typeof prior.deliveryToken !== 'string' ||
          typeof prior.expiresAt !== 'string' ||
          prior.checksumSha256 !== input.checksumSha256
        )
          throw new DomainError(
            'RELEASE_ARTIFACT_CONFLICT',
            'Existing release artifact does not match this delivery.',
          );
        return {
          artifactId: existing.rows[0].id as string,
          tokenId: prior.tokenId,
          token: prior.deliveryToken,
          expiresAt: prior.expiresAt,
          created: false,
        } as const;
      }
      await client.query(
        'INSERT INTO release_artifacts (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
        [
          artifactId,
          context.tenantId,
          context.householdId,
          encryptPayload(
            'release_artifacts',
            artifactId,
            context.tenantId,
            context.householdId,
            {
              ...input,
              mediaType: 'application/pdf',
              createdAt: new Date().toISOString(),
              tokenId,
              deliveryToken: token,
              expiresAt,
            },
            this.fieldEncryptionKey,
            { accessRequestId: input.accessRequestId, monitorId: input.monitorId },
          ),
        ],
      );
      await client.query(
        'INSERT INTO release_delivery_tokens (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
        [
          tokenId,
          context.tenantId,
          context.householdId,
          encryptPayload(
            'release_delivery_tokens',
            tokenId,
            context.tenantId,
            context.householdId,
            {
              artifactId,
              recipientId: input.recipientId,
              expiresAt,
              revokedAt: null,
              accessCount: 0,
            },
            this.fieldEncryptionKey,
            { tokenHash, artifactId, monitorId: input.monitorId },
          ),
        ],
      );
      return { artifactId, tokenId, token, expiresAt, created: true } as const;
    });
    if (result.created)
      await this.appendAudit(
        context,
        'continuity-monitor:release-artifact-created',
        result.artifactId,
        input.checksumSha256,
      );
    return { tokenId: result.tokenId, token: result.token, expiresAt: result.expiresAt };
  }

  async redeemReleaseArtifact(input: {
    tenantId: string;
    householdId: string;
    tokenId: string;
    token: string;
  }): Promise<Readonly<{ objectId: string; checksumSha256: string; mediaType: string }>> {
    const context: RequestContext & { householdId: string } = {
      tenantId: input.tenantId,
      householdId: input.householdId,
      actorId: input.tokenId,
      purpose: 'recipient packet redemption',
    };
    const result = await this.transaction(context, async (client) => {
      const selected = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM release_delivery_tokens WHERE id=$1 FOR UPDATE',
        [input.tokenId],
      );
      const row = selected.rows[0];
      if (!row)
        throw new DomainError('RELEASE_TOKEN_INVALID', 'Release link is invalid or expired.');
      const expectedHash = (row.payload as Record<string, unknown>).tokenHash;
      const suppliedHash = this.recoveryHash(input.tenantId, input.tokenId, input.token);
      const tokenPayload = decryptPayload('release_delivery_tokens', row, this.fieldEncryptionKey);
      if (
        typeof expectedHash !== 'string' ||
        expectedHash.length !== suppliedHash.length ||
        !timingSafeEqual(Buffer.from(expectedHash), Buffer.from(suppliedHash)) ||
        typeof tokenPayload.expiresAt !== 'string' ||
        new Date(tokenPayload.expiresAt).getTime() < Date.now() ||
        tokenPayload.revokedAt !== null
      )
        throw new DomainError('RELEASE_TOKEN_INVALID', 'Release link is invalid or expired.');
      const artifactResult = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM release_artifacts WHERE id=$1',
        [tokenPayload.artifactId],
      );
      const artifactRow = artifactResult.rows[0];
      if (!artifactRow)
        throw new DomainError('RELEASE_TOKEN_INVALID', 'Release link is invalid or expired.');
      const artifact = decryptPayload('release_artifacts', artifactRow, this.fieldEncryptionKey);
      const updatedToken = encryptPayload(
        'release_delivery_tokens',
        input.tokenId,
        input.tenantId,
        input.householdId,
        {
          ...tokenPayload,
          accessCount: Number(tokenPayload.accessCount ?? 0) + 1,
          lastAccessedAt: new Date().toISOString(),
        },
        this.fieldEncryptionKey,
        {
          tokenHash: expectedHash,
          artifactId: String(tokenPayload.artifactId),
          monitorId: String((row.payload as Record<string, unknown>).monitorId),
        },
      );
      await client.query(
        'UPDATE release_delivery_tokens SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
        [updatedToken, input.tokenId],
      );
      if (
        typeof artifact.objectId !== 'string' ||
        typeof artifact.checksumSha256 !== 'string' ||
        artifact.mediaType !== 'application/pdf'
      )
        throw new Error('RELEASE_ARTIFACT_INVALID');
      return {
        objectId: artifact.objectId,
        checksumSha256: artifact.checksumSha256,
        mediaType: artifact.mediaType,
      };
    });
    await this.appendAudit(
      context,
      'continuity-monitor:release-artifact-accessed',
      input.tokenId,
      createHash('sha256').update(input.tokenId).digest('hex'),
    );
    return result;
  }

  async reservePhysicalMailOrder(
    context: RequestContext & { householdId: string },
    input: Readonly<{
      monitorId: string;
      accessRequestId: string;
      provider: 'lob' | 'postgrid';
      idempotencyKey: string;
      contentSha256: string;
    }>,
  ): Promise<Readonly<{ reserved: boolean; status: string; providerOrderId?: string }>> {
    return this.transaction(context, async (client) => {
      const existing = await client.query(
        "SELECT id, tenant_id, household_id, payload FROM physical_mail_orders WHERE payload->>'idempotencyKey'=$1 FOR UPDATE",
        [input.idempotencyKey],
      );
      if (existing.rows[0]) {
        const payload = decryptPayload(
          'physical_mail_orders',
          existing.rows[0],
          this.fieldEncryptionKey,
        );
        return {
          reserved: false,
          status:
            typeof payload.providerOrderId === 'string'
              ? 'ACCEPTED'
              : String(payload.submissionStatus ?? payload.status),
          ...(typeof payload.providerOrderId === 'string'
            ? { providerOrderId: payload.providerOrderId }
            : {}),
        } as const;
      }
      const id = randomUUID();
      const payload = encryptPayload(
        'physical_mail_orders',
        id,
        context.tenantId,
        context.householdId,
        { ...input, status: 'SUBMITTING', reservedAt: new Date().toISOString() },
        this.fieldEncryptionKey,
        {
          idempotencyKey: input.idempotencyKey,
          provider: input.provider,
          monitorId: input.monitorId,
        },
      );
      await client.query(
        'INSERT INTO physical_mail_orders (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
        [id, context.tenantId, context.householdId, payload],
      );
      return { reserved: true, status: 'SUBMITTING' } as const;
    });
  }

  async recordPhysicalMailOrder(
    context: RequestContext & { householdId: string },
    input: Readonly<{
      monitorId: string;
      accessRequestId: string;
      provider: 'lob' | 'postgrid';
      providerOrderId: string;
      status: string;
      acceptedAt: string;
      trackingNumber?: string;
      idempotencyKey: string;
      contentSha256: string;
    }>,
  ): Promise<void> {
    await this.transaction(context, async (client) => {
      const selected = await client.query(
        "SELECT id FROM physical_mail_orders WHERE payload->>'idempotencyKey'=$1 FOR UPDATE",
        [input.idempotencyKey],
      );
      const id = selected.rows[0]?.id as string | undefined;
      if (!id) throw new Error('PHYSICAL_MAIL_RESERVATION_REQUIRED');
      await client.query(
        'UPDATE physical_mail_orders SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
        [
          encryptPayload(
            'physical_mail_orders',
            id,
            context.tenantId,
            context.householdId,
            { ...input, submissionStatus: 'ACCEPTED' },
            this.fieldEncryptionKey,
            {
              idempotencyKey: input.idempotencyKey,
              provider: input.provider,
              providerOrderId: input.providerOrderId,
              monitorId: input.monitorId,
            },
          ),
          id,
        ],
      );
    });
    await this.appendAudit(
      context,
      'continuity-monitor:physical-mail-accepted',
      input.providerOrderId,
      input.contentSha256,
    );
  }

  async processPhysicalMailEvent(
    context: RequestContext & { householdId: string },
    event: VerifiedPhysicalMailEvent,
  ): Promise<'processed' | 'duplicate'> {
    const id = randomUUID();
    const providerEventKey = `${event.provider}:${event.eventId}`;
    const result = await this.transaction(context, async (client) => {
      const order = await client.query(
        "SELECT id, tenant_id, household_id, payload FROM physical_mail_orders WHERE payload->>'provider'=$1 AND payload->>'providerOrderId'=$2 FOR UPDATE",
        [event.provider, event.providerOrderId],
      );
      const orderRow = order.rows[0];
      if (!orderRow)
        throw new DomainError('PHYSICAL_MAIL_ORDER_NOT_FOUND', 'Physical mail order not found.');
      const accepted = await client.query(
        'INSERT INTO physical_mail_events (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id',
        [
          id,
          context.tenantId,
          context.householdId,
          encryptPayload(
            'physical_mail_events',
            id,
            context.tenantId,
            context.householdId,
            event,
            this.fieldEncryptionKey,
            { providerEventKey, providerOrderId: event.providerOrderId },
          ),
        ],
      );
      if (!accepted.rowCount) return 'duplicate' as const;
      const orderPayload = decryptPayload(
        'physical_mail_orders',
        orderRow,
        this.fieldEncryptionKey,
      );
      const updated = encryptPayload(
        'physical_mail_orders',
        orderRow.id,
        context.tenantId,
        context.householdId,
        {
          ...orderPayload,
          status: event.status,
          submissionStatus: 'ACCEPTED',
          lastEventType: event.type,
          lastEventAt: event.occurredAt,
          ...(event.trackingNumber ? { trackingNumber: event.trackingNumber } : {}),
        },
        this.fieldEncryptionKey,
        {
          idempotencyKey: String((orderRow.payload as Record<string, unknown>).idempotencyKey),
          provider: event.provider,
          providerOrderId: event.providerOrderId,
          monitorId: String((orderRow.payload as Record<string, unknown>).monitorId),
        },
      );
      await client.query(
        'UPDATE physical_mail_orders SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
        [updated, orderRow.id],
      );
      return 'processed' as const;
    });
    if (result === 'processed')
      await this.appendAudit(
        context,
        `continuity-monitor:physical-mail-${event.status}`,
        event.providerOrderId,
        createHash('sha256').update(event.eventId).digest('hex'),
      );
    return result;
  }

  async completeAutomaticReleaseDelivery(
    context: RequestContext & { householdId: string },
    monitorId: string,
    delivery: Readonly<{ digitalDelivered: boolean; physicalMailAccepted: boolean }>,
  ): Promise<void> {
    await this.transaction(context, async (client) => {
      const selected = await client.query(
        'SELECT id, tenant_id, household_id, payload FROM continuity_monitors WHERE id=$1 FOR UPDATE',
        [monitorId],
      );
      const row = selected.rows[0];
      if (!row)
        throw new DomainError('CONTINUITY_MONITOR_NOT_FOUND', 'Continuity monitor not found.');
      const monitor = decryptPayload(
        'continuity_monitors',
        row,
        this.fieldEncryptionKey,
      ) as StoredContinuityMonitor;
      const requiredDigital = monitor.policy.digitalDelivery;
      const requiredPhysical = Boolean(monitor.physicalMail);
      const success =
        (!requiredDigital || delivery.digitalDelivered) &&
        (!requiredPhysical || delivery.physicalMailAccepted);
      const updated: StoredContinuityMonitor = {
        ...monitor,
        state: success ? 'AUTOMATICALLY_RELEASED' : 'DELIVERY_FAILED',
        nextActionAt: new Date().toISOString(),
      };
      await client.query(
        'UPDATE continuity_monitors SET payload=$1, version=version+1, updated_at=now() WHERE id=$2',
        [
          encryptPayload(
            'continuity_monitors',
            monitorId,
            context.tenantId,
            context.householdId,
            updated,
            this.fieldEncryptionKey,
            monitorMetadata(updated),
          ),
          monitorId,
        ],
      );
    });
    await this.appendAudit(
      context,
      delivery.digitalDelivered || delivery.physicalMailAccepted
        ? 'continuity-monitor:delivery-completed'
        : 'continuity-monitor:delivery-failed',
      monitorId,
      createHash('sha256').update(JSON.stringify(delivery)).digest('hex'),
    );
  }

  private emailLookup(tenantId: string, email: string): string {
    return createHmac('sha256', this.authLookupSecret)
      .update(`${tenantId}:${email.trim().toLowerCase()}`)
      .digest('hex');
  }
  async ready(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1 AS ready');
      return result.rows[0]?.ready === 1;
    } catch {
      return false;
    }
  }
  private async transaction<T>(
    context: RequestContext,
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [context.tenantId]);
      await client.query("SELECT set_config('app.household_id', $1, true)", [
        context.householdId ?? '',
      ]);
      const value = await operation(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async create(
    context: RequestContext,
    kind: string,
    payload: Readonly<Record<string, unknown>>,
  ): Promise<StoredRecord> {
    const table = kindTable[kind];
    if (!table) throw new Error('UNKNOWN_RECORD_KIND');
    const id = randomUUID();
    return this.transaction(context, async (client) => {
      const householdId = table === 'households' ? id : (context.householdId ?? null);
      if (table === 'households')
        await client.query("SELECT set_config('app.household_id', $1, true)", [id]);
      const storedPayload = encryptPayload(
        table,
        id,
        context.tenantId,
        householdId,
        payload,
        this.fieldEncryptionKey,
      );
      const result = await client.query(
        `INSERT INTO ${table} (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4) RETURNING version`,
        [id, context.tenantId, householdId, storedPayload],
      );
      return {
        id,
        tenantId: context.tenantId,
        ...(householdId ? { householdId } : {}),
        kind,
        payload,
        version: Number(result.rows[0].version),
      };
    });
  }
  async get(context: RequestContext, kind: string, id: string): Promise<StoredRecord | null> {
    const table = kindTable[kind];
    if (!table) throw new Error('UNKNOWN_RECORD_KIND');
    return this.transaction(context, async (client) => {
      const result = await client.query(
        `SELECT id, tenant_id, household_id, payload, version FROM ${table} WHERE id=$1`,
        [id],
      );
      const row = result.rows[0];
      return row
        ? {
            id: row.id,
            tenantId: row.tenant_id,
            ...(row.household_id ? { householdId: row.household_id } : {}),
            kind,
            payload: decryptPayload(table, row, this.fieldEncryptionKey),
            version: row.version,
          }
        : null;
    });
  }
  async list(context: RequestContext, kind: string): Promise<readonly StoredRecord[]> {
    const table = kindTable[kind];
    if (!table) throw new Error('UNKNOWN_RECORD_KIND');
    return this.transaction(context, async (client) => {
      const result = await client.query(
        `SELECT id, tenant_id, household_id, payload, version FROM ${table} WHERE ($1::uuid IS NULL OR household_id=$1) ORDER BY created_at`,
        [context.householdId ?? null],
      );
      return result.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        ...(row.household_id ? { householdId: row.household_id } : {}),
        kind,
        payload: decryptPayload(table, row, this.fieldEncryptionKey),
        version: row.version,
      }));
    });
  }
  async appendAudit(
    context: RequestContext,
    operation: string,
    targetId: string,
    evidenceHash: string,
  ): Promise<void> {
    await this.transaction(context, async (client) => {
      const chainScope = `${context.tenantId}:${context.householdId ?? 'tenant'}`;
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [chainScope]);
      const previous = await client.query(
        "SELECT payload->>'chainHash' AS chain_hash FROM audit_events WHERE household_id IS NOT DISTINCT FROM $1 ORDER BY created_at DESC, id DESC LIMIT 1",
        [context.householdId ?? null],
      );
      const previousHash = (previous.rows[0]?.chain_hash as string | undefined) ?? 'GENESIS';
      const chainHash = auditChainHash({
        tenantId: context.tenantId,
        householdId: context.householdId ?? null,
        actorId: context.actorId,
        purpose: context.purpose,
        operation,
        targetId,
        evidenceHash,
        previousHash,
      });
      const id = randomUUID();
      const payload = encryptPayload(
        'audit_events',
        id,
        context.tenantId,
        context.householdId ?? null,
        {
          actorId: context.actorId,
          purpose: context.purpose,
          operation,
          targetId,
          evidenceHash,
          previousHash,
          chainHash,
        },
        this.fieldEncryptionKey,
        { previousHash, chainHash },
      );
      await client.query(
        'INSERT INTO audit_events (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
        [id, context.tenantId, context.householdId ?? null, payload],
      );
    });
  }
  async savePacket(context: RequestContext, manifest: PacketManifest): Promise<void> {
    await this.transaction(context, async (client) => {
      const payload = encryptPayload(
        'packet_manifests',
        manifest.id,
        manifest.tenantId,
        manifest.householdId,
        { ...manifest, approvedAt: manifest.approvedAt.toISOString() },
        this.fieldEncryptionKey,
        { hash: manifest.hash },
      );
      await client.query(
        'INSERT INTO packet_manifests (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
        [manifest.id, manifest.tenantId, manifest.householdId, payload],
      );
    });
  }
}

export async function migrateDatabase(
  connectionString: string,
  path = 'migrations/001_initial.sql',
  appPassword = process.env.POSTGRES_APP_PASSWORD,
  fieldEncryptionKey = process.env.FIELD_ENCRYPTION_KEY,
): Promise<void> {
  if (!appPassword || !/^[a-f0-9]{48}$/.test(appPassword))
    throw new Error('POSTGRES_APP_PASSWORD_INVALID');
  assertFieldEncryptionKey(fieldEncryptionKey ?? '');
  const pool = new Pool({ connectionString, max: 1 });
  try {
    const role = await pool.query("SELECT 1 FROM pg_roles WHERE rolname='tomorrowready_app'");
    if (role.rowCount === 0)
      await pool.query(
        `CREATE ROLE tomorrowready_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${appPassword}'`,
      );
    else await pool.query(`ALTER ROLE tomorrowready_app PASSWORD '${appPassword}'`);
    const migrationPaths =
      path === 'migrations/001_initial.sql'
        ? [
            path,
            'migrations/002_security_hardening.sql',
            'migrations/003_auth_lookup.sql',
            'migrations/004_billing_idempotency.sql',
            'migrations/005_release_idempotency.sql',
            'migrations/006_passkey_lookup.sql',
            'migrations/007_automated_release.sql',
          ]
        : [path];
    await pool.query('CREATE SCHEMA IF NOT EXISTS app');
    await pool.query(
      'CREATE TABLE IF NOT EXISTS app.schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const migrationPath of migrationPaths) {
      const version = basename(migrationPath, '.sql');
      const applied = await pool.query('SELECT 1 FROM app.schema_migrations WHERE version=$1', [
        version,
      ]);
      if (applied.rowCount === 0) await pool.query(await readFile(migrationPath, 'utf8'));
    }
    await scopeLegacyHouseholds(pool, fieldEncryptionKey!);
    await encryptLegacyPayloads(pool, fieldEncryptionKey!);
  } finally {
    await pool.end();
  }
}

async function scopeLegacyHouseholds(pool: Pool, fieldEncryptionKey: string): Promise<void> {
  const result = await pool.query(
    'SELECT id, tenant_id, household_id, payload FROM households WHERE household_id IS NULL',
  );
  for (const row of result.rows) {
    let payload = row.payload;
    if (payload && typeof payload === 'object' && encryptedPayloadKey in payload) {
      const plaintext = decryptPayload('households', row, fieldEncryptionKey);
      payload = encryptPayload(
        'households',
        row.id,
        row.tenant_id,
        row.id,
        plaintext,
        fieldEncryptionKey,
      );
    }
    await pool.query('UPDATE households SET household_id=$1, payload=$2 WHERE id=$1', [
      row.id,
      payload,
    ]);
  }
}

async function encryptLegacyPayloads(pool: Pool, fieldEncryptionKey: string): Promise<void> {
  await pool.query('BEGIN');
  try {
    for (const table of appendOnlyTables)
      await pool.query(`ALTER TABLE ${table} DISABLE TRIGGER USER`);
    for (const table of canonicalPayloadTables) {
      const result = await pool.query(
        `SELECT id, tenant_id, household_id, payload FROM ${table} WHERE NOT (payload ? $1)`,
        [encryptedPayloadKey],
      );
      for (const row of result.rows) {
        const indexedMetadata: Record<string, string> = {};
        if (
          table === 'packet_manifests' &&
          row.payload &&
          typeof row.payload === 'object' &&
          typeof row.payload.hash === 'string'
        )
          indexedMetadata.hash = row.payload.hash;
        if (
          (table === 'inbox_events' || table === 'outbox_events') &&
          row.payload &&
          typeof row.payload === 'object' &&
          typeof row.payload.idempotencyKey === 'string'
        )
          indexedMetadata.idempotencyKey = row.payload.idempotencyKey;
        const payload = encryptPayload(
          table,
          row.id,
          row.tenant_id,
          row.household_id,
          row.payload,
          fieldEncryptionKey,
          indexedMetadata,
        );
        await pool.query(`UPDATE ${table} SET payload=$1 WHERE id=$2`, [payload, row.id]);
      }
    }
    await backfillAndVerifyAuditChains(pool, fieldEncryptionKey);
    for (const table of appendOnlyTables)
      await pool.query(`ALTER TABLE ${table} ENABLE TRIGGER USER`);
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

async function backfillAndVerifyAuditChains(pool: Pool, fieldEncryptionKey: string): Promise<void> {
  const result = await pool.query(
    'SELECT id, tenant_id, household_id, payload FROM audit_events ORDER BY tenant_id, household_id NULLS FIRST, created_at, id',
  );
  const previousByScope = new Map<string, string>();
  for (const row of result.rows) {
    const scope = `${row.tenant_id}:${row.household_id ?? 'tenant'}`;
    const previousHash = previousByScope.get(scope) ?? 'GENESIS';
    const plaintext = decryptPayload('audit_events', row, fieldEncryptionKey);
    const chainHash = auditChainHash({
      tenantId: row.tenant_id,
      householdId: row.household_id,
      actorId: plaintext.actorId,
      purpose: plaintext.purpose,
      operation: plaintext.operation,
      targetId: plaintext.targetId,
      evidenceHash: plaintext.evidenceHash,
      previousHash,
    });
    const existingPrevious = row.payload.previousHash as string | undefined;
    const existingHash = row.payload.chainHash as string | undefined;
    if (
      (existingPrevious && existingPrevious !== previousHash) ||
      (existingHash && existingHash !== chainHash)
    )
      throw new Error('AUDIT_CHAIN_INVALID');
    if (!existingHash)
      await pool.query(
        "UPDATE audit_events SET payload=jsonb_set(jsonb_set(payload, '{previousHash}', to_jsonb($1::text)), '{chainHash}', to_jsonb($2::text)) WHERE id=$3",
        [previousHash, chainHash, row.id],
      );
    previousByScope.set(scope, chainHash);
  }
}
