import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  signSession,
  totp,
  verifyPassword,
  verifySession,
  verifyTotp,
} from '../../packages/infrastructure/auth/src/index.js';
import {
  decryptRestricted,
  encryptRestricted,
} from '../../packages/infrastructure/security/src/index.js';

describe('authentication and encryption', () => {
  it('hashes passwords with unique memory-hard hashes', async () => {
    const one = await hashPassword('this is a strong local password');
    const two = await hashPassword('this is a strong local password');
    expect(one).not.toBe(two);
    expect(await verifyPassword('this is a strong local password', one)).toBe(true);
    expect(await verifyPassword('wrong password', one)).toBe(false);
  });
  it('verifies TOTP inside a bounded window', () => {
    const secret = crypto.getRandomValues(new Uint8Array(20));
    const now = Date.now();
    const code = totp(Buffer.from(secret), now);
    expect(verifyTotp(code, Buffer.from(secret), now)).toBe(true);
  });
  it('signs expiring tamper-evident sessions', () => {
    const secret = 'a'.repeat(64);
    const token = signSession(
      { actorId: crypto.randomUUID(), assurance: 'mfa' },
      secret,
      new Date(Date.now() + 60_000),
    );
    expect(verifySession(token, secret)).not.toBeNull();
    expect(verifySession(`${token}x`, secret)).toBeNull();
  });
  it('round-trips restricted fields with authenticated encryption', () => {
    const key = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
    const context = 'tenant/household/person/record';
    const envelope = encryptRestricted('restricted value', key, context);
    expect(decryptRestricted(envelope, key, context)).toBe('restricted value');
    expect(() =>
      decryptRestricted({ ...envelope, tag: Buffer.alloc(16).toString('base64') }, key, context),
    ).toThrow();
    expect(() => decryptRestricted(envelope, key, `${context}/transplanted`)).toThrow();
  });
});
