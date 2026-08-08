import {
  signSession,
  type SessionAssurance,
} from '../../packages/infrastructure/auth/src/index.js';

type TestSession = Readonly<{
  tenantId: string;
  householdId?: string;
  actorId?: string;
  role?:
    | 'owner'
    | 'co-owner'
    | 'trusted-helper'
    | 'packet-recipient'
    | 'professional-viewer'
    | 'support-agent'
    | 'platform-administrator';
  assurance?: SessionAssurance;
  actionGrants?: readonly string[];
  categoryGrants?: readonly string[];
  packetGrants?: readonly string[];
  purpose?: string;
}>;

export function sessionHeaders(input: TestSession): Readonly<Record<string, string>> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET_REQUIRED');
  const token = signSession(
    {
      sub: input.actorId ?? crypto.randomUUID(),
      tenantId: input.tenantId,
      ...(input.householdId ? { householdId: input.householdId } : {}),
      role: input.role ?? 'owner',
      assurance: input.assurance ?? 'passkey',
      actionGrants: input.actionGrants ?? [],
      categoryGrants: input.categoryGrants ?? [],
      packetGrants: input.packetGrants ?? [],
      purpose: input.purpose ?? 'test verification',
    },
    secret,
    new Date(Date.now() + 60_000),
  );
  return { authorization: `Bearer ${token}` };
}
