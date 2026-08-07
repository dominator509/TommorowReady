import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { buildPacketManifest, transitionRelease } from '../../packages/domain/src/index.js';

describe('emergency release safety properties', () => {
  it('never approves unless every independent release predicate is satisfied', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (
          recipientVerified,
          packetScopeMatches,
          verificationSatisfied,
          challengeElapsed,
          ownerDenied,
          takeoverSignal,
          providerAmbiguous,
        ) => {
          const now = new Date('2026-08-07T12:00:00Z');
          const context = {
            recipientVerified,
            packetScopeMatches,
            verificationSatisfied,
            ownerDenied,
            takeoverSignal,
            providerAmbiguous,
            now,
            challengeEndsAt: new Date(now.getTime() + (challengeElapsed ? -1 : 1)),
          };
          const safe =
            recipientVerified &&
            packetScopeMatches &&
            verificationSatisfied &&
            challengeElapsed &&
            !ownerDenied &&
            !takeoverSignal &&
            !providerAmbiguous;
          if (safe) {
            expect(transitionRelease('CHALLENGE_ACTIVE', 'APPROVED_FOR_RELEASE', context)).toBe(
              'APPROVED_FOR_RELEASE',
            );
          } else {
            expect(() =>
              transitionRelease('CHALLENGE_ACTIVE', 'APPROVED_FOR_RELEASE', context),
            ).toThrow();
          }
        },
      ),
    );
  });

  it('hashes packet contents canonically regardless of input item order', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.uuid(), { minLength: 1 }), (itemIds) => {
        const common = {
          tenantId: crypto.randomUUID(),
          householdId: crypto.randomUUID(),
          packetId: crypto.randomUUID(),
          recipientId: crypto.randomUUID(),
          purpose: 'emergency packet',
          version: 1,
        };
        const forward = buildPacketManifest({ ...common, itemIds });
        const reverse = buildPacketManifest({ ...common, itemIds: [...itemIds].reverse() });
        expect(forward.hash).toBe(reverse.hash);
        expect(forward.itemIds).toEqual(reverse.itemIds);
      }),
    );
  });
});
