# TomorrowReady Security

## Security goals
Protect children, family members, household records, media, account and asset metadata, release policies, and recipient packets from account takeover, coercion, cross-tenant access, overbroad helper access, malicious uploads, prompt injection, unauthorized release, duplicate release, support misuse, and secret leakage.

## Threat model summary
Primary threats include credential stuffing, session theft, compromised email, fraudulent emergency claims, forged death or incapacity documents, coercion of an owner, malicious or overreaching relatives, helper privilege escalation, packet enumeration, link forwarding, object-store exposure, insider access, malware uploads, prompt injection, and provider ambiguity.

## Authentication
Passkeys are preferred. Password fallback uses an approved memory-hard hash. TOTP MFA is required for trusted helpers with restricted categories and for owners changing emergency policies. Step-up authentication is required for arming a policy, adding or replacing a release recipient, approving a release, exporting the full archive, changing encryption settings, or deleting the household.

## Authorization
Deny by default. Every request carries user, tenant, household, role, category grants, packet grants, action grants, purpose, and session assurance. Trusted-helper access is category-specific, time-bounded, revocable, and audited. Recipient access is packet-specific and cannot enumerate unrelated resources. Support access is customer-approved, just-in-time, reason-coded, time-limited, and visible to the household owner.

## Emergency release defenses
- No release based solely on one uploaded document or one requestor assertion.
- Configurable challenge period and multi-channel owner notification.
- Secondary verifier where configured.
- Recipient identity verification and step-up authentication.
- Device, IP, velocity, and account-takeover signals.
- Manual review for conflict, coercion signal, provider ambiguity, or policy mismatch.
- Immutable packet manifest locked before approval.
- One-time or expiring encrypted links; reauthentication before download.
- Immediate revocation where legally and technically possible.
- No automatic release of the entire household.
- Rate limits and cool-down after denied or failed requests.

## Secret handling
TomorrowReady is not a password manager. Do not collect raw passwords, PINs, seed phrases, recovery codes, private keys, safe combinations, or full card numbers. Store locator instructions such as "credentials are in the family password manager under X" rather than the secret itself. Full SSNs and government identifiers are excluded unless a later approved specification proves necessity and protection.

## Upload security
Direct signed uploads enter quarantine. Verify size, MIME, extension, magic bytes, checksum, and media structure. Scan malware. Reject executables, macros, encrypted archives, unsupported polyglots, and active content. Normalize allowed documents and media. Serve private files through short-lived signed URLs with packet and tenant authorization plus download audit.

## AI security
Treat documents and retrieved text as untrusted data, never instructions. Apply prompt-injection detection, fixed tool allowlists, schema validation, DLP, pseudonymization, and outbound policy. Block prohibited secrets. Raw prompts and outputs are excluded from ordinary logs. AI cannot determine emergency status, recipient rights, legal authority, score completion, or release eligibility.

## Encryption
TLS in transit. Provider encryption at rest. Household data-encryption keys wrapped by production KMS. Application-level encryption for restricted fields. Object-level encryption for packets and exports. Key versioning, rotation, backup, and restore tests. Secrets are loaded from environment or secret manager only.

## Logging and audit
Structured logs use opaque IDs and exclude document bodies, raw prompts, full identifiers, message contents, and packet contents. Security, consent, policy, release, access, export, support, and deletion events are append-only and tamper-evident. Audit access is itself audited.

## Minor data
Collect only information required for continuity. Child records are private, never discoverable, never used for advertising, and never used for model training. Guardian and helper authority is recorded without claiming legal determination. Public sharing is unavailable. Exports and packets use purpose-based minimization.

## Security gates
Secret scan; static analysis; dependency audit; tenant and packet isolation tests; authz matrix; session and step-up tests; malware and upload tests; webhook-signature tests; DLP and prompt-injection tests; release state-machine property tests; forged-evidence tests; link-forwarding tests; idempotency and ambiguous-outcome tests; backup/restore; deletion proof; and all live-fire proofs.

## Security stop conditions
Stop before destructive production data operations, unauthorized external disclosure, unresolved legal authority, a release path not covered by policy and tests, or any irreversible action not explicitly authorized.
