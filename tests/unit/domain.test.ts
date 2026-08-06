import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  authorizeHelper,
  buildPacketManifest,
  calculateReadiness,
  canAccessPacket,
  containsProhibitedSecret,
  transitionRelease,
} from '../../packages/domain/src/index.js';

describe('domain invariants', () => {
  it('blocks prohibited secrets without returning the value', () => {
    expect(containsProhibitedSecret('password: correct horse battery staple')).toBe(true);
    expect(
      containsProhibitedSecret('Credentials are in the family password manager under Utilities.'),
    ).toBe(false);
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
});
