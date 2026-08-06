# Emergency Access and Release Policy

## Purpose
Define the only permitted mechanism for releasing TomorrowReady packets when an owner cannot perform a normal owner-initiated share.

## Principles
- Emergency access is compartmentalized, never whole-vault by default.
- The owner configures recipients, packet scopes, challenge periods, and verification requirements in advance.
- The platform does not determine legal death, incapacity, guardianship, or inheritance.
- AI never approves, denies, or scores an emergency request.
- Ambiguity becomes manual review or denial, never automatic release.

## Policy components
Each armed policy records owner, household, packet manifest selector, recipient, purpose, challenge duration, required verification methods, secondary verifiers, notification channels, expiry, revocation state, jurisdictional disclosures, and version.

## Request workflow
1. Requestor authenticates and verifies the intended recipient identity.
2. System records purpose and request evidence.
3. Deterministic policy evaluator confirms an armed matching policy.
4. Owner and configured verifiers receive multi-channel notice.
5. Challenge period begins.
6. Owner may deny, cancel, or report coercion/account takeover.
7. Verification providers return evidence; conflicting or ambiguous evidence triggers manual review.
8. Final evaluator locks the exact packet manifest and checks policy predicates again.
9. Approved packet is encrypted and released through an expiring, recipient-bound channel.
10. Every view and download is audited; access expires and can be revoked where possible.

## Prohibited release grounds
A single death certificate upload; an obituary; social-media content; an AI inference; inactivity alone; missed check-ins alone; a family relationship alone; possession of the owner's device; an unverified email request; or a support employee's discretion.

## Denial and appeal
Denial does not expose household content. Repeated requests are rate-limited. A documented manual review may resolve identity or provider ambiguity but cannot override an absent owner-configured policy without separately approved legal process.

## Testing
Property tests cover every transition. Live-fire verifies owner notice, challenge, denial, expiry, recipient isolation, one-packet release, idempotency, ambiguous-provider handling, and audit evidence.
