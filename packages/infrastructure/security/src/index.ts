import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export type EncryptedEnvelope = Readonly<{
  algorithm: 'aes-256-gcm';
  keyVersion: number;
  iv: string;
  ciphertext: string;
  tag: string;
}>;
export function assertFieldEncryptionKey(base64Key: string): void {
  const key = decodeBase64(base64Key, 'FIELD_ENCRYPTION_KEY_INVALID');
  if (key.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY_INVALID');
}
export function encryptRestricted(
  value: string,
  base64Key: string,
  associatedData: string,
  keyVersion = 1,
): EncryptedEnvelope {
  assertFieldEncryptionKey(base64Key);
  const key = Buffer.from(base64Key, 'base64');
  if (!associatedData) throw new Error('FIELD_ENCRYPTION_CONTEXT_REQUIRED');
  if (!Number.isSafeInteger(keyVersion) || keyVersion < 1)
    throw new Error('FIELD_ENCRYPTION_KEY_VERSION_INVALID');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(associatedData, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return {
    algorithm: 'aes-256-gcm',
    keyVersion,
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}
export function decryptRestricted(
  envelope: EncryptedEnvelope,
  base64Key: string,
  associatedData: string,
): string {
  assertFieldEncryptionKey(base64Key);
  const key = Buffer.from(base64Key, 'base64');
  if (!associatedData) throw new Error('FIELD_ENCRYPTION_CONTEXT_REQUIRED');
  if (envelope.algorithm !== 'aes-256-gcm') throw new Error('FIELD_ENCRYPTION_ALGORITHM_INVALID');
  if (!Number.isSafeInteger(envelope.keyVersion) || envelope.keyVersion < 1)
    throw new Error('FIELD_ENCRYPTION_KEY_VERSION_INVALID');
  const iv = decodeBase64(envelope.iv, 'FIELD_ENCRYPTION_IV_INVALID');
  const tag = decodeBase64(envelope.tag, 'FIELD_ENCRYPTION_TAG_INVALID');
  const ciphertext = decodeBase64(envelope.ciphertext, 'FIELD_ENCRYPTION_CIPHERTEXT_INVALID');
  if (iv.length !== 12) throw new Error('FIELD_ENCRYPTION_IV_INVALID');
  if (tag.length !== 16) throw new Error('FIELD_ENCRYPTION_TAG_INVALID');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function decodeBase64(value: string, errorCode: string): Buffer {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
    throw new Error(errorCode);
  const decoded = Buffer.from(value, 'base64');
  if (decoded.toString('base64') !== value) throw new Error(errorCode);
  return decoded;
}

export type UploadPolicy = Readonly<{
  maxBytes: number;
  allowedMimeTypes: Readonly<Record<string, readonly string[]>>;
}>;

export type QuarantinedUpload = Readonly<{
  filename: string;
  declaredMimeType: string;
  bytes: Buffer;
  checksumSha256: string;
  malwareStatus: 'pending' | 'clean' | 'infected' | 'error';
}>;

const executableMagic = [Buffer.from('4d5a', 'hex'), Buffer.from('7f454c46', 'hex')];

export function validateQuarantinedUpload(
  upload: QuarantinedUpload,
  policy: UploadPolicy,
): Readonly<{ accepted: true; detectedType: string }> {
  if (upload.bytes.length === 0 || upload.bytes.length > policy.maxBytes)
    throw new Error('UPLOAD_SIZE_REJECTED');
  if (executableMagic.some((magic) => upload.bytes.subarray(0, magic.length).equals(magic)))
    throw new Error('UPLOAD_EXECUTABLE_REJECTED');
  const extension = upload.filename.includes('.')
    ? `.${upload.filename.split('.').pop()!.toLowerCase()}`
    : '';
  const allowedExtensions = policy.allowedMimeTypes[upload.declaredMimeType];
  if (!allowedExtensions?.includes(extension)) throw new Error('UPLOAD_TYPE_REJECTED');
  const detectedType = detectMimeType(upload.bytes);
  if (detectedType !== upload.declaredMimeType) throw new Error('UPLOAD_MAGIC_MISMATCH');
  const checksum = createHash('sha256').update(upload.bytes).digest('hex');
  if (checksum !== upload.checksumSha256) throw new Error('UPLOAD_CHECKSUM_MISMATCH');
  if (upload.malwareStatus !== 'clean') throw new Error('UPLOAD_NOT_MALWARE_CLEARED');
  return { accepted: true, detectedType };
}

function detectMimeType(bytes: Buffer): string {
  if (bytes.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
  if (bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'image/jpeg';
  throw new Error('UPLOAD_MAGIC_UNSUPPORTED');
}
