import { describe, expect, it } from 'vitest';
import { decryptBackup, encryptBackup } from '../../scripts/backup-crypto.js';

describe('backup encryption', () => {
  it('authenticates encrypted artifacts and rejects the wrong key', () => {
    const key = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
    const wrongKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
    const plaintext = Buffer.from('restricted local database backup', 'utf8');
    const encrypted = encryptBackup(plaintext, key);
    expect(encrypted.subarray(0, 9).toString('ascii')).toBe('TRBACKUP1');
    expect(encrypted.includes(plaintext)).toBe(false);
    expect(decryptBackup(encrypted, key)).toEqual(plaintext);
    expect(() => decryptBackup(encrypted, wrongKey)).toThrow();
  });
});
