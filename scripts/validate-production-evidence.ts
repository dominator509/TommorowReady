import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const requiredEvidence = [
  'legalApproval',
  'vendorRiskApproval',
  'insuranceCoverage',
  'penetrationTest',
  'policyPublication',
  'productionKmsProbe',
  'productionBackupRestore',
  'monitoringAlertDelivery',
  'stagingSmoke',
  'rollbackDrill',
  'dnsTlsWafReview',
  'providerLiveFire',
  'incidentExercise',
  'rpoRtoExercise',
  'deploymentPlanApproval',
] as const;

const evidenceRecord = z
  .object({
    reference: z.string().trim().min(8).max(500),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    approvedAt: z.iso.datetime({ offset: true }),
    validUntil: z.iso.datetime({ offset: true }).optional(),
  })
  .strict();
const evidenceManifest = z
  .object({
    version: z.literal(1),
    releaseCommit: z.string().regex(/^[a-f0-9]{40}$/),
    records: z.object(
      Object.fromEntries(requiredEvidence.map((key) => [key, evidenceRecord])) as {
        [Key in (typeof requiredEvidence)[number]]: typeof evidenceRecord;
      },
    ),
  })
  .strict();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

function productionUrl(
  name: string,
  protocols: readonly string[],
  allowInlineCredentials = false,
): URL {
  const url = new URL(required(name));
  if (!protocols.includes(url.protocol)) throw new Error(`${name}_PROTOCOL_INVALID`);
  if (['localhost', '127.0.0.1', '::1'].includes(url.hostname))
    throw new Error(`${name}_LOCALHOST_FORBIDDEN`);
  if (!allowInlineCredentials && (url.username || url.password))
    throw new Error(`${name}_INLINE_CREDENTIAL_FORBIDDEN`);
  return url;
}

const baseUrl = productionUrl('PRODUCTION_BASE_URL', ['https:']);
const appUrl = productionUrl('APP_BASE_URL', ['https:']);
if (baseUrl.origin !== appUrl.origin) throw new Error('PRODUCTION_APP_ORIGIN_MISMATCH');
const passkeyOrigin = productionUrl('PASSKEY_ORIGIN', ['https:']);
if (passkeyOrigin.origin !== appUrl.origin) throw new Error('PASSKEY_ORIGIN_MISMATCH');
if (required('PASSKEY_RP_ID') !== appUrl.hostname) throw new Error('PASSKEY_RP_ID_MISMATCH');

const databaseUrl = productionUrl('DATABASE_URL', ['postgres:', 'postgresql:'], true);
if (
  !['require', 'verify-ca', 'verify-full'].includes(databaseUrl.searchParams.get('sslmode') ?? '')
)
  throw new Error('DATABASE_TLS_REQUIRED');
const migrationDatabaseUrl = productionUrl(
  'DATABASE_MIGRATION_URL',
  ['postgres:', 'postgresql:'],
  true,
);
if (
  !['require', 'verify-ca', 'verify-full'].includes(
    migrationDatabaseUrl.searchParams.get('sslmode') ?? '',
  )
)
  throw new Error('DATABASE_MIGRATION_TLS_REQUIRED');
productionUrl('REDIS_URL', ['rediss:'], true);
productionUrl('S3_ENDPOINT', ['https:']);
productionUrl('SMTP_URL', ['smtps:'], true);
required('KMS_KEY_ID');

for (const name of [
  'POSTGRES_APP_PASSWORD',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_BUCKET',
] as const) {
  required(name);
}

for (const name of ['SESSION_SECRET', 'AUTH_LOOKUP_SECRET', 'RECOVERY_TOKEN_SECRET'] as const) {
  if (Buffer.byteLength(required(name), 'utf8') < 32) throw new Error(`${name}_INVALID`);
}
for (const name of ['FIELD_ENCRYPTION_KEY', 'BACKUP_ENCRYPTION_KEY'] as const) {
  const value = required(name);
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== 32 || decoded.toString('base64') !== value)
    throw new Error(`${name}_INVALID`);
}

const path = required('PRODUCTION_EVIDENCE_FILE');
const raw = await readFile(path, 'utf8');
const manifest = evidenceManifest.parse(JSON.parse(raw) as unknown);
if (manifest.releaseCommit !== required('RELEASE_COMMIT'))
  throw new Error('EVIDENCE_COMMIT_MISMATCH');
if (manifest.records.legalApproval.reference !== required('LEGAL_APPROVAL_RECORD'))
  throw new Error('LEGAL_APPROVAL_REFERENCE_MISMATCH');
if (manifest.records.vendorRiskApproval.reference !== required('VENDOR_RISK_APPROVAL_RECORD'))
  throw new Error('VENDOR_APPROVAL_REFERENCE_MISMATCH');
if (manifest.records.insuranceCoverage.reference !== required('INSURANCE_EVIDENCE_RECORD'))
  throw new Error('INSURANCE_EVIDENCE_REFERENCE_MISMATCH');
const now = Date.now();
for (const key of requiredEvidence) {
  const record = manifest.records[key];
  if (
    /placeholder|replace|example/i.test(record.reference) ||
    /^([a-f0-9])\1{63}$/.test(record.sha256)
  )
    throw new Error(`EVIDENCE_${key}_PLACEHOLDER`);
  const approvedAt = new Date(record.approvedAt).getTime();
  if (approvedAt > now + 300_000) throw new Error(`EVIDENCE_${key}_FUTURE_DATED`);
  if (record.validUntil && new Date(record.validUntil).getTime() <= now)
    throw new Error(`EVIDENCE_${key}_EXPIRED`);
}
const canonicalHash = createHash('sha256').update(raw).digest('hex');
if (canonicalHash !== required('PRODUCTION_EVIDENCE_SHA256'))
  throw new Error('EVIDENCE_MANIFEST_SHA256_MISMATCH');
console.log('production evidence: ok');
