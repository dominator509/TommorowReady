import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { pathToFileURL } from 'node:url';

try {
  loadEnvFile('.env');
} catch {}

const magic = Buffer.from('TRBACKUP1', 'ascii');
const associatedData = Buffer.from('tomorrowready-local-backup-v1', 'utf8');

function backupKey(encodedKey: string): Buffer {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encodedKey))
    throw new Error('BACKUP_ENCRYPTION_KEY_INVALID');
  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encodedKey)
    throw new Error('BACKUP_ENCRYPTION_KEY_INVALID');
  return key;
}

export function encryptBackup(input: Buffer, encodedKey: string): Buffer {
  const key = backupKey(encodedKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(associatedData);
  const ciphertext = Buffer.concat([cipher.update(input), cipher.final()]);
  return Buffer.concat([magic, iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptBackup(input: Buffer, encodedKey: string): Buffer {
  const key = backupKey(encodedKey);
  if (input.length <= magic.length + 12 + 16 || !input.subarray(0, magic.length).equals(magic))
    throw new Error('BACKUP_ENVELOPE_INVALID');
  const ivStart = magic.length;
  const tagStart = ivStart + 12;
  const ciphertextStart = tagStart + 16;
  const decipher = createDecipheriv('aes-256-gcm', key, input.subarray(ivStart, tagStart));
  decipher.setAAD(associatedData);
  decipher.setAuthTag(input.subarray(tagStart, ciphertextStart));
  return Buffer.concat([decipher.update(input.subarray(ciphertextStart)), decipher.final()]);
}

async function main(): Promise<void> {
  const [operation, inputPath, outputPath] = process.argv.slice(2);
  if ((operation !== 'encrypt' && operation !== 'decrypt') || !inputPath || !outputPath)
    throw new Error('BACKUP_CRYPTO_USAGE');
  const encodedKey = process.env.BACKUP_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error('BACKUP_ENCRYPTION_KEY_INVALID');
  const input = await readFile(inputPath);
  const output =
    operation === 'encrypt' ? encryptBackup(input, encodedKey) : decryptBackup(input, encodedKey);
  await writeFile(outputPath, output, { mode: 0o600 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
