import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import type {
  ContinuityRepository,
  RequestContext,
  StoredRecord,
} from '../../../application/src/index.js';
import type { PacketManifest } from '../../../domain/src/index.js';
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
};

export class PostgresContinuityRepository implements ContinuityRepository {
  readonly pool: Pool;
  private readonly fieldEncryptionKey: string;
  private readonly authLookupSecret: string;
  constructor(
    connectionString: string,
    fieldEncryptionKey = process.env.FIELD_ENCRYPTION_KEY ?? '',
    authLookupSecret = process.env.AUTH_LOOKUP_SECRET ?? '',
  ) {
    assertFieldEncryptionKey(fieldEncryptionKey);
    if (Buffer.byteLength(authLookupSecret, 'utf8') < 32)
      throw new Error('AUTH_LOOKUP_SECRET_INVALID');
    this.fieldEncryptionKey = fieldEncryptionKey;
    this.authLookupSecret = authLookupSecret;
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
          metadata: { emailLookup: this.emailLookup(tenantId, input.email) },
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
        ? [path, 'migrations/002_security_hardening.sql', 'migrations/003_auth_lookup.sql']
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
