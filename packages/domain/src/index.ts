import { createHash, randomUUID } from 'node:crypto';

export type OpaqueId = string;
export type ReleaseState =
  | 'DRAFT'
  | 'ARMED'
  | 'REQUESTED'
  | 'VERIFYING'
  | 'CHALLENGE_ACTIVE'
  | 'APPROVED_FOR_RELEASE'
  | 'RELEASED'
  | 'DENIED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'MANUAL_REVIEW_REQUIRED';
export type ConfirmedFact = Readonly<{
  id: OpaqueId;
  tenantId: OpaqueId;
  householdId: OpaqueId;
  category: string;
  confirmed: boolean;
  reviewedAt: Date;
  evidenceIds: readonly OpaqueId[];
}>;
export type HelperGrant = Readonly<{
  tenantId: OpaqueId;
  householdId: OpaqueId;
  helperId: OpaqueId;
  categories: readonly string[];
  actions: readonly string[];
  purpose: string;
  startsAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
}>;
export type PacketManifest = Readonly<{
  id: OpaqueId;
  tenantId: OpaqueId;
  householdId: OpaqueId;
  packetId: OpaqueId;
  recipientId: OpaqueId;
  purpose: string;
  itemIds: readonly OpaqueId[];
  version: number;
  hash: string;
  approvedAt: Date;
}>;
export type ReleaseContext = Readonly<{
  recipientVerified: boolean;
  packetScopeMatches: boolean;
  challengeEndsAt: Date;
  now: Date;
  ownerDenied: boolean;
  takeoverSignal: boolean;
  verificationSatisfied: boolean;
  providerAmbiguous: boolean;
}>;
export type ReadinessRule = Readonly<{
  id: string;
  category: string;
  weight: number;
  maxAgeDays: number;
  required: boolean;
}>;
export type ReadinessResult = Readonly<{
  version: string;
  score: number;
  completed: readonly string[];
  missing: readonly string[];
  stale: readonly string[];
}>;

const transitions: Readonly<Record<ReleaseState, readonly ReleaseState[]>> = {
  DRAFT: ['ARMED', 'CANCELLED'],
  ARMED: ['REQUESTED', 'CANCELLED'],
  REQUESTED: ['VERIFYING', 'DENIED', 'CANCELLED'],
  VERIFYING: ['CHALLENGE_ACTIVE', 'DENIED', 'MANUAL_REVIEW_REQUIRED', 'EXPIRED'],
  CHALLENGE_ACTIVE: [
    'APPROVED_FOR_RELEASE',
    'DENIED',
    'EXPIRED',
    'CANCELLED',
    'MANUAL_REVIEW_REQUIRED',
  ],
  APPROVED_FOR_RELEASE: ['RELEASED', 'DENIED', 'EXPIRED', 'MANUAL_REVIEW_REQUIRED'],
  RELEASED: [],
  DENIED: [],
  EXPIRED: [],
  CANCELLED: [],
  MANUAL_REVIEW_REQUIRED: ['DENIED', 'CANCELLED', 'CHALLENGE_ACTIVE'],
};

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function transitionRelease(
  current: ReleaseState,
  next: ReleaseState,
  context: ReleaseContext,
): ReleaseState {
  if (!transitions[current].includes(next))
    throw new DomainError('INVALID_RELEASE_TRANSITION', `${current} cannot transition to ${next}`);
  if (context.providerAmbiguous && next !== 'MANUAL_REVIEW_REQUIRED' && next !== 'DENIED')
    throw new DomainError(
      'AMBIGUOUS_VERIFICATION',
      'Ambiguous verification requires manual review or denial.',
    );
  if (next === 'APPROVED_FOR_RELEASE' || next === 'RELEASED') {
    const safe =
      context.recipientVerified &&
      context.packetScopeMatches &&
      context.verificationSatisfied &&
      context.now >= context.challengeEndsAt &&
      !context.ownerDenied &&
      !context.takeoverSignal &&
      !context.providerAmbiguous;
    if (!safe)
      throw new DomainError(
        'RELEASE_POLICY_UNSATISFIED',
        'Release policy predicates are not satisfied.',
      );
  }
  return next;
}

export function authorizeHelper(
  grant: HelperGrant,
  input: {
    tenantId: string;
    householdId: string;
    helperId: string;
    category: string;
    action: string;
    purpose: string;
    now: Date;
  },
): boolean {
  return (
    grant.tenantId === input.tenantId &&
    grant.householdId === input.householdId &&
    grant.helperId === input.helperId &&
    grant.categories.includes(input.category) &&
    grant.actions.includes(input.action) &&
    grant.purpose === input.purpose &&
    input.now >= grant.startsAt &&
    input.now < grant.expiresAt &&
    grant.revokedAt === undefined
  );
}

export function buildPacketManifest(
  input: Omit<PacketManifest, 'id' | 'hash' | 'approvedAt'> & { approvedAt?: Date },
): PacketManifest {
  const approvedAt = input.approvedAt ?? new Date();
  const canonical = JSON.stringify({
    tenantId: input.tenantId,
    householdId: input.householdId,
    packetId: input.packetId,
    recipientId: input.recipientId,
    purpose: input.purpose,
    itemIds: [...input.itemIds].sort(),
    version: input.version,
  });
  return Object.freeze({
    ...input,
    id: randomUUID(),
    itemIds: Object.freeze([...input.itemIds].sort()),
    approvedAt,
    hash: createHash('sha256').update(canonical).digest('hex'),
  });
}

export function canAccessPacket(
  manifest: PacketManifest,
  request: { tenantId: string; householdId: string; recipientId: string; packetId: string },
): boolean {
  return (
    manifest.tenantId === request.tenantId &&
    manifest.householdId === request.householdId &&
    manifest.recipientId === request.recipientId &&
    manifest.packetId === request.packetId
  );
}

export function calculateReadiness(
  version: string,
  rules: readonly ReadinessRule[],
  facts: readonly ConfirmedFact[],
  now: Date,
): ReadinessResult {
  const confirmed = facts.filter((fact) => fact.confirmed && fact.evidenceIds.length > 0);
  let earned = 0;
  let possible = 0;
  const completed: string[] = [];
  const missing: string[] = [];
  const stale: string[] = [];
  for (const rule of rules) {
    possible += rule.weight;
    const matching = confirmed.filter((fact) => fact.category === rule.category);
    const fresh = matching.some(
      (fact) => now.getTime() - fact.reviewedAt.getTime() <= rule.maxAgeDays * 86_400_000,
    );
    if (fresh) {
      earned += rule.weight;
      completed.push(rule.id);
    } else if (matching.length > 0) stale.push(rule.id);
    else if (rule.required) missing.push(rule.id);
  }
  return Object.freeze({
    version,
    score: possible === 0 ? 0 : Math.round((earned / possible) * 100),
    completed: Object.freeze(completed),
    missing: Object.freeze(missing),
    stale: Object.freeze(stale),
  });
}

const prohibitedPatterns: readonly RegExp[] = [
  /\b(?:password|passcode|pin|seed phrase|recovery code|private key|safe combination)\s*[:=]\s*\S+/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:\d[ -]*?){13,19}\b/,
  /\b\d{3}-\d{2}-\d{4}\b/,
];
export function containsProhibitedSecret(value: string): boolean {
  return prohibitedPatterns.some((pattern) => pattern.test(value));
}
export function assertSafeContent(value: string): void {
  if (containsProhibitedSecret(value))
    throw new DomainError(
      'PROHIBITED_SECRET',
      'Use a locator instruction instead of storing a secret.',
    );
}
export function evidenceHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
