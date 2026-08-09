# TomorrowReady Runbooks

Every incident begins by protecting packet confidentiality, pausing the smallest affected release scope, preserving append-only evidence, and assigning an incident commander. Support cannot create policy or expand packet scope.

| Condition | Immediate containment | Evidence and recovery | Exit criteria |
|---|---|---|---|
| Database outage | Fail readiness; pause writes and release evaluation | Preserve database and queue telemetry; restore only from an encrypted verified backup | RLS, migrations, outbox reconciliation, and smoke pass |
| Storage outage | Block uploads, packet generation, and release downloads | Preserve object identifiers and checksums; reconcile incomplete multipart uploads | Private bucket, checksum, quarantine, and signed access pass |
| Queue backlog | Stop new non-critical jobs; retain authoritative outbox | Measure oldest job; scale workers; replay idempotently | Queue age is below five minutes and duplicates are absent |
| Malware event | Quarantine object and derivatives; revoke URLs | Preserve hash and scanner evidence; review adjacent objects | No unscanned object is accessible and rules are updated |
| Owner notice failure | Freeze the affected challenge and require manual review | Retain provider receipt/ambiguity; retry only with same idempotency key | Owner receives notice or request is denied/expired |
| Continuity scheduler lag | Set the global continuity kill switch to `no`; preserve scheduled and stream state | Measure oldest due monitor, restore worker/Valkey capacity, and reconcile each stable monitor slot without manual state advancement | Queue age is below five minutes, no monitor advanced early, and a controlled monitor resumes from authoritative state |
| Physical mail ambiguity | Stop new physical-mail submission for the affected provider; do not fail over or blindly retry | Query the provider by the stored idempotency key/content hash, preserve request timing and transport evidence, and bind any recovered order ID to its opaque webhook route | Exactly one accepted order or a definitive non-acceptance is proven; affected monitor delivery state is reconciled and audited |
| Physical mail delivery failure | Pause physical mail for the affected monitor/provider while leaving authorized digital delivery intact | Preserve signed webhook, order, tracking, address-verification, and content-hash evidence; use provider support without exposing packet content | Provider disposition is final, recipient/owner notice is sent where policy allows, and retry or cancellation is explicitly authorized |
| Fraudulent emergency request | Deny or pause; revoke requestor sessions | Preserve request, device, velocity, and verifier evidence | Two-person review closes the case without disclosure |
| Compromised recipient | Revoke links and sessions; stop packet access | Preserve access evidence and notify owner/security | New identity proof and owner authorization are recorded |
| Unauthorized packet exposure | Severity 0; globally pause affected release path | Revoke objects, rotate keys, preserve immutable evidence, invoke counsel | Exposure is contained, impact known, required notices complete |
| Account takeover | Revoke sessions, reset factors, freeze policy changes | Review device, IP, step-up, and notification evidence | Owner identity is re-established and policies reviewed |
| KMS failure | Block restricted-field writes, packet and export creation | Preserve key version and provider status; never fall back to plaintext | Encrypt/decrypt, rotation, restore, and readiness pass |
| AI-provider leak concern | Disable provider and preserve minimized metadata | Review DLP, consent, provider terms, and outbound hashes | Security/privacy approval explicitly re-enables provider |
| Deletion failure | Stop completion claim; quarantine retry | Reconcile database, object, cache, queue, backup lifecycle and tombstone | Purge evidence proves every in-scope copy handled |
| Backup failure | Alert and stop production release | Repair destination/key/retention, take new backup, run isolated restore | RPO evidence and restore drill pass |
| Regional outage | Disable release mutation in affected region | Fail over only with current database and key evidence | RTO exercise, reconciliation, and user communication complete |
