import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool, type PoolClient } from 'pg';
import type {
  ContinuityRepository,
  RequestContext,
  StoredRecord,
} from '../../../application/src/index.js';
import type { PacketManifest } from '../../../domain/src/index.js';

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
  constructor(connectionString: string) {
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
  private async transaction<T>(
    context: RequestContext,
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [context.tenantId]);
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
      const result = await client.query(
        `INSERT INTO ${table} (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4) RETURNING version`,
        [id, context.tenantId, context.householdId ?? null, payload],
      );
      return {
        id,
        tenantId: context.tenantId,
        ...(context.householdId ? { householdId: context.householdId } : {}),
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
            payload: row.payload,
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
        payload: row.payload,
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
      await client.query(
        'INSERT INTO audit_events (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
        [
          randomUUID(),
          context.tenantId,
          context.householdId ?? null,
          { actorId: context.actorId, purpose: context.purpose, operation, targetId, evidenceHash },
        ],
      );
    });
  }
  async savePacket(context: RequestContext, manifest: PacketManifest): Promise<void> {
    await this.transaction(context, async (client) => {
      await client.query(
        'INSERT INTO packet_manifests (id, tenant_id, household_id, payload) VALUES ($1,$2,$3,$4)',
        [
          manifest.id,
          manifest.tenantId,
          manifest.householdId,
          { ...manifest, approvedAt: manifest.approvedAt.toISOString() },
        ],
      );
    });
  }
}

export async function migrateDatabase(
  connectionString: string,
  path = 'migrations/001_initial.sql',
  appPassword = process.env.POSTGRES_APP_PASSWORD,
): Promise<void> {
  if (!appPassword || !/^[a-f0-9]{48}$/.test(appPassword))
    throw new Error('POSTGRES_APP_PASSWORD_INVALID');
  const pool = new Pool({ connectionString, max: 1 });
  try {
    const role = await pool.query("SELECT 1 FROM pg_roles WHERE rolname='tomorrowready_app'");
    if (role.rowCount === 0)
      await pool.query(
        `CREATE ROLE tomorrowready_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${appPassword}'`,
      );
    else await pool.query(`ALTER ROLE tomorrowready_app PASSWORD '${appPassword}'`);
    await pool.query(await readFile(path, 'utf8'));
  } finally {
    await pool.end();
  }
}
