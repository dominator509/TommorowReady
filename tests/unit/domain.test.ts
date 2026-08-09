import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  advanceContinuityMonitor,
  authorizeHelper,
  buildPacketManifest,
  calculateReadiness,
  canAccessPacket,
  containsProhibitedSecret,
  ownerContinuityMonitorAction,
  transitionRelease,
} from '../../packages/domain/src/index.js';

describe('domain invariants', () => {
  it('blocks prohibited secrets without returning the value', () => {
    expect(containsProhibitedSecret('password: correct horse battery staple')).toBe(true);
    expect(
      containsProhibitedSecret('Credentials are in the family password manager under Utilities.'),
    ).toBe(false);
    expect(containsProhibitedSecret('recipient 12345678-1234-1234-1234-123456789012')).toBe(false);
  });
  it('isolates packet recipients and tenants', () => {
    const manifest = buildPacketManifest({
      tenantId: crypto.randomUUID(),
      householdId: crypto.randomUUID(),
      packetId: crypto.randomUUID(),
      recipientId: crypto.randomUUID(),
      purpose: 'childcare',
      itemIds: [crypto.randomUUID()],
      version: 1,
    });
    expect(canAccessPacket(manifest, manifest)).toBe(true);
    expect(canAccessPacket(manifest, { ...manifest, recipientId: crypto.randomUUID() })).toBe(
      false,
    );
    expect(canAccessPacket(manifest, { ...manifest, tenantId: crypto.randomUUID() })).toBe(false);
  });
  it('requires exact active helper scope', () => {
    const now = new Date();
    const grant = {
      tenantId: crypto.randomUUID(),
      householdId: crypto.randomUUID(),
      helperId: crypto.randomUUID(),
      categories: ['pets'],
      actions: ['edit'],
      purpose: 'continuity help',
      startsAt: new Date(now.getTime() - 1_000),
      expiresAt: new Date(now.getTime() + 1_000),
    };
    expect(authorizeHelper(grant, { ...grant, category: 'pets', action: 'edit', now })).toBe(true);
    expect(authorizeHelper(grant, { ...grant, category: 'assets', action: 'edit', now })).toBe(
      false,
    );
  });
  it('calculates readiness only from confirmed evidence-backed fresh facts', () => {
    const tenantId = crypto.randomUUID();
    const householdId = crypto.randomUUID();
    const rules = [
      { id: 'people', category: 'people', weight: 60, maxAgeDays: 365, required: true },
      { id: 'pets', category: 'pets', weight: 40, maxAgeDays: 30, required: true },
    ];
    const result = calculateReadiness(
      'v1',
      rules,
      [
        {
          id: crypto.randomUUID(),
          tenantId,
          householdId,
          category: 'people',
          confirmed: true,
          reviewedAt: new Date(),
          evidenceIds: [crypto.randomUUID()],
        },
      ],
      new Date(),
    );
    expect(result).toEqual({
      version: 'v1',
      score: 60,
      completed: ['people'],
      missing: ['pets'],
      stale: [],
    });
  });
  it('never approves release when any predicate is false', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (recipientVerified, packetScopeMatches, verificationSatisfied, ownerDenied) => {
          const context = {
            recipientVerified,
            packetScopeMatches,
            verificationSatisfied,
            ownerDenied,
            challengeEndsAt: new Date(0),
            now: new Date(),
            takeoverSignal: false,
            providerAmbiguous: false,
          };
          const safe =
            recipientVerified && packetScopeMatches && verificationSatisfied && !ownerDenied;
          if (safe)
            expect(transitionRelease('CHALLENGE_ACTIVE', 'APPROVED_FOR_RELEASE', context)).toBe(
              'APPROVED_FOR_RELEASE',
            );
          else
            expect(() =>
              transitionRelease('CHALLENGE_ACTIVE', 'APPROVED_FOR_RELEASE', context),
            ).toThrow();
        },
      ),
    );
  });
  it('routes ambiguity to manual review', () => {
    const context = {
      recipientVerified: true,
      packetScopeMatches: true,
      verificationSatisfied: true,
      ownerDenied: false,
      challengeEndsAt: new Date(0),
      now: new Date(),
      takeoverSignal: false,
      providerAmbiguous: true,
    };
    expect(transitionRelease('VERIFYING', 'MANUAL_REVIEW_REQUIRED', context)).toBe(
      'MANUAL_REVIEW_REQUIRED',
    );
    expect(() => transitionRelease('CHALLENGE_ACTIVE', 'APPROVED_FOR_RELEASE', context)).toThrow();
  });
  it('requires an explicit recent test before arming a continuity monitor', () => {
    const now = new Date('2026-08-08T12:00:00Z');
    const snapshot = {
      state: 'DISABLED' as const,
      policy: {
        checkInIntervalDays: 30,
        reminderOffsetsHours: [0, 24, 72],
        gracePeriodHours: 168,
        releaseDelayHours: 24,
        digitalDelivery: true,
      },
      nextActionAt: now,
      cycleDueAt: now,
      reminderIndex: 0,
    };
    expect(() => ownerContinuityMonitorAction(snapshot, 'ARM', now)).toThrow(
      'A recent successful monitor test is required.',
    );
    const armed = ownerContinuityMonitorAction(snapshot, 'ARM', now, {
      recentSuccessfulTest: true,
    });
    expect(armed.state).toBe('ARMED');
    expect(armed.nextActionAt.toISOString()).toBe('2026-09-07T12:00:00.000Z');
  });
  it('moves missed check-ins through reminders and grace but locks on any unsafe predicate', () => {
    const due = new Date('2026-08-08T12:00:00Z');
    const policy = {
      checkInIntervalDays: 30,
      reminderOffsetsHours: [0],
      gracePeriodHours: 24,
      releaseDelayHours: 0,
      digitalDelivery: true,
    };
    const safety = {
      recipientVerified: true,
      manifestCurrent: true,
      recentSuccessfulTest: true,
      notificationsHealthy: true,
      ownerDenied: false,
      takeoverSignal: false,
      addressVerified: true,
    };
    const checkInDue = advanceContinuityMonitor(
      { state: 'ARMED', policy, nextActionAt: due, cycleDueAt: due, reminderIndex: 0 },
      safety,
      due,
    );
    expect(checkInDue).toMatchObject({ state: 'CHECK_IN_DUE', effect: 'OWNER_CHECK_IN_DUE' });
    const reminder = advanceContinuityMonitor(checkInDue, safety, due);
    expect(reminder).toMatchObject({ state: 'REMINDERS_ACTIVE', effect: 'OWNER_REMINDER' });
    const grace = advanceContinuityMonitor(reminder, safety, new Date('2026-08-09T12:00:00Z'));
    expect(grace).toMatchObject({ state: 'GRACE_PERIOD', effect: 'OWNER_GRACE_NOTICE' });
    const locked = advanceContinuityMonitor(
      grace,
      { ...safety, notificationsHealthy: false },
      new Date('2026-08-09T12:00:01Z'),
    );
    expect(locked).toMatchObject({ state: 'SECURITY_LOCKED', effect: 'SECURITY_LOCK' });
  });
  it('releases only the selected monitor after every deterministic safety predicate passes', () => {
    const now = new Date('2026-08-10T12:00:00Z');
    const result = advanceContinuityMonitor(
      {
        state: 'GRACE_PERIOD',
        policy: {
          checkInIntervalDays: 30,
          reminderOffsetsHours: [0, 24],
          gracePeriodHours: 48,
          releaseDelayHours: 24,
          digitalDelivery: true,
          physicalMailMode: 'SECURE_ACCESS_LETTER',
        },
        nextActionAt: now,
        cycleDueAt: new Date('2026-08-07T12:00:00Z'),
        reminderIndex: 2,
      },
      {
        recipientVerified: true,
        manifestCurrent: true,
        recentSuccessfulTest: true,
        notificationsHealthy: true,
        ownerDenied: false,
        takeoverSignal: false,
        addressVerified: true,
      },
      now,
    );
    expect(result).toMatchObject({ state: 'RELEASE_PENDING', effect: 'RELEASE_PACKET' });
  });
});
