import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) throw new Error('PASSWORD_TOO_SHORT');
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltText, hashText] = encoded.split('$');
  if (algorithm !== 'scrypt' || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, 'base64');
  const actual = (await scrypt(
    password,
    Buffer.from(saltText, 'base64'),
    expected.length,
  )) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function totp(secret: Buffer, at = Date.now(), stepSeconds = 30): string {
  const counter = Math.floor(at / 1000 / stepSeconds);
  const data = Buffer.alloc(8);
  data.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secret).update(data).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, '0');
}
export function verifyTotp(code: string, secret: Buffer, at = Date.now()): boolean {
  return [-1, 0, 1].some((window) => {
    const candidate = totp(secret, at + window * 30_000);
    return (
      code.length === candidate.length && timingSafeEqual(Buffer.from(code), Buffer.from(candidate))
    );
  });
}
export function signSession(
  payload: Readonly<Record<string, unknown>>,
  secret: string,
  expiresAt: Date,
): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: expiresAt.getTime() })).toString(
    'base64url',
  );
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}
export function verifySession(
  token: string,
  secret: string,
  now = new Date(),
): Readonly<Record<string, unknown>> | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return null;
  const value = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;
  return typeof value.exp === 'number' && value.exp > now.getTime() ? value : null;
}
