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
export type ContinuityMonitorState =
  | 'DISABLED'
  | 'ARMED'
  | 'CHECK_IN_DUE'
  | 'REMINDERS_ACTIVE'
  | 'GRACE_PERIOD'
  | 'RELEASE_PENDING'
  | 'AUTOMATICALLY_RELEASED'
  | 'SNOOZED'
  | 'CANCELLED'
  | 'OWNER_DENIED'
  | 'SECURITY_LOCKED'
  | 'DELIVERY_FAILED';
export type PhysicalMailMode =
  'SECURE_ACCESS_LETTER' | 'SELECTED_INSTRUCTIONS' | 'FULL_ELIGIBLE_PACKET';
export type ContinuityMonitorPolicy = Readonly<{
  checkInIntervalDays: number;
  reminderOffsetsHours: readonly number[];
  gracePeriodHours: number;
  releaseDelayHours: number;
  digitalDelivery: boolean;
  physicalMailMode?: PhysicalMailMode;
}>;
export type ContinuityMonitorSnapshot = Readonly<{
  state: ContinuityMonitorState;
  policy: ContinuityMonitorPolicy;
  nextActionAt: Date;
  cycleDueAt: Date;
  reminderIndex: number;
}>;
export type ContinuityMonitorSafety = Readonly<{
  recipientVerified: boolean;
  manifestCurrent: boolean;
  recentSuccessfulTest: boolean;
  notificationsHealthy: boolean;
  ownerDenied: boolean;
  takeoverSignal: boolean;
  addressVerified: boolean;
}>;
export type ContinuityMonitorEffect =
  | 'NONE'
  | 'OWNER_CHECK_IN_DUE'
  | 'OWNER_REMINDER'
  | 'OWNER_GRACE_NOTICE'
  | 'RELEASE_PACKET'
  | 'SECURITY_LOCK';
export type ContinuityMonitorDecision = Readonly<
  ContinuityMonitorSnapshot & { effect: ContinuityMonitorEffect }
>;
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

const hours = (value: number): number => value * 3_600_000;
const days = (value: number): number => value * 86_400_000;

export function validateContinuityMonitorPolicy(policy: ContinuityMonitorPolicy): void {
  if (
    !Number.isInteger(policy.checkInIntervalDays) ||
    policy.checkInIntervalDays < 1 ||
    policy.checkInIntervalDays > 365
  )
    throw new DomainError('CHECK_IN_INTERVAL_INVALID', 'Check-in interval must be 1 to 365 days.');
  if (
    !Number.isInteger(policy.gracePeriodHours) ||
    policy.gracePeriodHours < 24 ||
    policy.gracePeriodHours > 720
  )
    throw new DomainError('GRACE_PERIOD_INVALID', 'Grace period must be 24 to 720 hours.');
  if (
    !Number.isInteger(policy.releaseDelayHours) ||
    policy.releaseDelayHours < 0 ||
    policy.releaseDelayHours > 168
  )
    throw new DomainError('RELEASE_DELAY_INVALID', 'Release delay must be 0 to 168 hours.');
  if (policy.reminderOffsetsHours.length < 1 || policy.reminderOffsetsHours.length > 12)
    throw new DomainError(
      'REMINDER_SCHEDULE_INVALID',
      'One to twelve reminder offsets are required.',
    );
  let previous = -1;
  for (const offset of policy.reminderOffsetsHours) {
    if (
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset >= policy.gracePeriodHours ||
      offset <= previous
    )
      throw new DomainError(
        'REMINDER_SCHEDULE_INVALID',
        'Reminder offsets must be unique, increasing, and inside the grace period.',
      );
    previous = offset;
  }
  if (!policy.digitalDelivery && !policy.physicalMailMode)
    throw new DomainError(
      'DELIVERY_CHANNEL_REQUIRED',
      'At least one delivery channel is required.',
    );
}

export function advanceContinuityMonitor(
  snapshot: ContinuityMonitorSnapshot,
  safety: ContinuityMonitorSafety,
  now: Date,
): ContinuityMonitorDecision {
  validateContinuityMonitorPolicy(snapshot.policy);
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(snapshot.nextActionAt.getTime()))
    throw new DomainError('MONITOR_TIME_INVALID', 'Continuity monitor time is invalid.');
  if (now < snapshot.nextActionAt) return Object.freeze({ ...snapshot, effect: 'NONE' });
  if (snapshot.state === 'ARMED' || snapshot.state === 'SNOOZED')
    return Object.freeze({
      ...snapshot,
      state: 'CHECK_IN_DUE',
      nextActionAt: now,
      cycleDueAt: snapshot.nextActionAt,
      reminderIndex: 0,
      effect: 'OWNER_CHECK_IN_DUE',
    });
  if (snapshot.state === 'CHECK_IN_DUE' || snapshot.state === 'REMINDERS_ACTIVE') {
    const index = snapshot.reminderIndex;
    const offsets = snapshot.policy.reminderOffsetsHours;
    if (index < offsets.length) {
      const nextIndex = index + 1;
      const nextActionAt =
        nextIndex < offsets.length
          ? new Date(snapshot.cycleDueAt.getTime() + hours(offsets[nextIndex]!))
          : new Date(snapshot.cycleDueAt.getTime() + hours(snapshot.policy.gracePeriodHours));
      return Object.freeze({
        ...snapshot,
        state: 'REMINDERS_ACTIVE',
        nextActionAt,
        reminderIndex: nextIndex,
        effect: 'OWNER_REMINDER',
      });
    }
    return Object.freeze({
      ...snapshot,
      state: 'GRACE_PERIOD',
      nextActionAt: new Date(
        snapshot.cycleDueAt.getTime() +
          hours(snapshot.policy.gracePeriodHours + snapshot.policy.releaseDelayHours),
      ),
      effect: 'OWNER_GRACE_NOTICE',
    });
  }
  if (snapshot.state === 'GRACE_PERIOD') {
    const safe =
      safety.recipientVerified &&
      safety.manifestCurrent &&
      safety.recentSuccessfulTest &&
      safety.notificationsHealthy &&
      !safety.ownerDenied &&
      !safety.takeoverSignal &&
      (!snapshot.policy.physicalMailMode || safety.addressVerified);
    return Object.freeze({
      ...snapshot,
      state: safe ? 'RELEASE_PENDING' : 'SECURITY_LOCKED',
      nextActionAt: now,
      effect: safe ? 'RELEASE_PACKET' : 'SECURITY_LOCK',
    });
  }
  return Object.freeze({ ...snapshot, effect: 'NONE' });
}

export function ownerContinuityMonitorAction(
  snapshot: ContinuityMonitorSnapshot,
  action: 'ARM' | 'CHECK_IN' | 'SNOOZE' | 'CANCEL' | 'DENY',
  now: Date,
  options: Readonly<{ recentSuccessfulTest?: boolean; snoozeHours?: number }> = {},
): ContinuityMonitorSnapshot {
  validateContinuityMonitorPolicy(snapshot.policy);
  if (!Number.isFinite(now.getTime()))
    throw new DomainError('MONITOR_TIME_INVALID', 'Continuity monitor time is invalid.');
  if (action === 'ARM') {
    if (!['DISABLED', 'SECURITY_LOCKED', 'DELIVERY_FAILED'].includes(snapshot.state))
      throw new DomainError(
        'MONITOR_ACTION_INVALID',
        'The monitor cannot be armed from its current state.',
      );
    if (!options.recentSuccessfulTest)
      throw new DomainError(
        'MONITOR_TEST_REQUIRED',
        'A recent successful monitor test is required.',
      );
    const due = new Date(now.getTime() + days(snapshot.policy.checkInIntervalDays));
    return Object.freeze({
      ...snapshot,
      state: 'ARMED',
      nextActionAt: due,
      cycleDueAt: due,
      reminderIndex: 0,
    });
  }
  if (action === 'CHECK_IN') {
    if (['AUTOMATICALLY_RELEASED', 'CANCELLED', 'OWNER_DENIED'].includes(snapshot.state))
      throw new DomainError('MONITOR_ACTION_INVALID', 'The monitor can no longer be checked in.');
    const due = new Date(now.getTime() + days(snapshot.policy.checkInIntervalDays));
    return Object.freeze({
      ...snapshot,
      state: 'ARMED',
      nextActionAt: due,
      cycleDueAt: due,
      reminderIndex: 0,
    });
  }
  if (action === 'SNOOZE') {
    const snoozeHours = options.snoozeHours ?? 24;
    if (!Number.isInteger(snoozeHours) || snoozeHours < 1 || snoozeHours > 168)
      throw new DomainError('SNOOZE_INVALID', 'Snooze must be 1 to 168 hours.');
    if (!['CHECK_IN_DUE', 'REMINDERS_ACTIVE', 'GRACE_PERIOD'].includes(snapshot.state))
      throw new DomainError(
        'MONITOR_ACTION_INVALID',
        'The monitor cannot be snoozed from its current state.',
      );
    const due = new Date(now.getTime() + hours(snoozeHours));
    return Object.freeze({
      ...snapshot,
      state: 'SNOOZED',
      nextActionAt: due,
      cycleDueAt: due,
      reminderIndex: 0,
    });
  }
  if (action === 'CANCEL') {
    if (['AUTOMATICALLY_RELEASED', 'OWNER_DENIED'].includes(snapshot.state))
      throw new DomainError('MONITOR_ACTION_INVALID', 'The monitor can no longer be cancelled.');
    return Object.freeze({ ...snapshot, state: 'CANCELLED', nextActionAt: now });
  }
  if (['AUTOMATICALLY_RELEASED', 'CANCELLED'].includes(snapshot.state))
    throw new DomainError('MONITOR_ACTION_INVALID', 'The monitor can no longer be denied.');
  return Object.freeze({ ...snapshot, state: 'OWNER_DENIED', nextActionAt: now });
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
  /\b(?:\d{4}[ -]){3}\d{4}\b|\b\d{13,19}\b/,
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
