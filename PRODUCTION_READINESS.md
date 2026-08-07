# TomorrowReady Production Readiness

Production is permitted only when every item below has a current evidence command or approved artifact.

## Functional
- LF-01 through LF-14 pass in one fresh run.
- Every specification behavior is implemented.
- Packet recipients cannot enumerate or access unrelated packets.
- Emergency release follows the exact deterministic state machine.
- Annual review and readiness results use confirmed records only.

## Testing and reality
- `sh scripts/verify.sh` prints `verify: ok` from a clean state.
- `sh scripts/reality-gate.sh` prints `reality gate: ok`.
- `sh scripts/live-fire.sh` prints `live-fire: ok`.
- No test-double leakage or demo mode exists in production paths.

## Security
- Secret scan and dependency audit pass.
- Tenant, household, helper, and packet isolation pass.
- Passkey/password/MFA/session/step-up flows pass.
- Malicious upload, DLP, prompt injection, forged evidence, challenge, denial, expiry, ambiguous provider, replay, idempotency, link forwarding, and support-access tests pass.
- Penetration test and threat-model review have approved evidence.

## Privacy and legal
- Privacy Policy, Terms, AI Notice, Emergency Access Policy, Child and Dependent Data Policy, Digital Secrets Policy, Media Policy, Trusted Helper Policy, retention schedule, DPIA, and subprocessor register are counsel-approved and match implementation.
- Data-access, correction, export, deletion, consent withdrawal, and recipient revocation pass.
- Vendor risk, transfer, retention, training, and region claims are evidenced.
- Cyber/E&O insurance evidence exists.

## Reliability and operations
- Backup and restore are proven.
- Queue replay does not duplicate release.
- Notification failure during challenge alerts operations and does not silently continue.
- Incident, compromised-recipient, fraudulent-request, and unauthorized-release runbooks are exercised.
- RPO and RTO are documented and tested.

## Performance and accessibility
- Ordinary API and dashboard targets pass.
- Packet generation target passes.
- WCAG 2.2 AA keyboard, zoom, labels, contrast, focus, errors, and non-color checks pass.

## Deployment
- Build artifact is reproducible.
- Migrations use expand-migrate-contract.
- Staging smoke and rollback drill pass.
- Production secrets, KMS, domain, WAF, storage lifecycle, alerting, and backups are verified.
- `AUTO_DEPLOY_AUTHORIZED` remains `no` until the operator explicitly changes it after all gates.

The ship gate is: clean state -> `sh scripts/verify.sh` -> `sh scripts/production-readiness-check.sh` -> release tag -> exact MANUAL deploy command -> `RUN_COMPLETE`. No lesser state is production ready.

## Current evidence — 2026-08-07

| Gate | Current evidence | Status |
|---|---|---|
| Complete local verification | `verify: ok`; 27 unit/security, 8 integration/contract, 3 API/performance E2E, 3 browser accessibility tests | Passed locally |
| Core outcomes | LF-01 through LF-14 each emitted `ok`; aggregate `live-fire: ok` | Passed against real local dependencies |
| Backup and restore | `backup: ok`; `restore drill: ok` against an isolated PostgreSQL database | Passed locally |
| Container release rehearsal | `container rehearsal: ok` on repeated runs; API and web ran non-root and API queried real PostgreSQL | Passed locally |
| Immutable local images | API `a02406d473db...`; web `40379c2e3ab5...`; worker `9f9385ee3e48...` match the rehearsal manifest | Passed locally |
| Production ship gate | `production readiness: FAIL - legal approval evidence missing` after a complete green verification | Blocked externally |

No production release tag exists. `green/EP-009` is the latest genuine graph checkpoint. The externally dependent items are consolidated in `.agent/state/DEFERRED_EXTERNALS.md` and `REMOTE_SESSION_HANDOFF.md`.
