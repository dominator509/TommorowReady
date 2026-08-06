import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type EncryptedEnvelope = Readonly<{
  algorithm: 'aes-256-gcm';
  keyVersion: number;
  iv: string;
  ciphertext: string;
  tag: string;
}>;
export function encryptRestricted(
  value: string,
  base64Key: string,
  keyVersion = 1,
): EncryptedEnvelope {
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY_INVALID');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return {
    algorithm: 'aes-256-gcm',
    keyVersion,
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}
export function decryptRestricted(envelope: EncryptedEnvelope, base64Key: string): string {
  const key = Buffer.from(base64Key, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
