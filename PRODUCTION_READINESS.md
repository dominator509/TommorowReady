# TomorrowReady Production Readiness

Production is permitted only when every item below has a current evidence command or approved artifact.

## Functional
- LF-01 through LF-15 pass in one fresh run; LF-15 exercises the owner-armed continuity release through real PostgreSQL, Valkey scheduling, deterministic PDF rendering, private MinIO storage, and Mailpit delivery.
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
- Queue replay, worker restart, and repeated check-in scheduling do not duplicate release or postal submission.
- `CONTINUITY_AUTOMATION_ENABLED=no` blocks new arming and defers existing timers without state advancement; production starts paused until staging evidence is approved.
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

## Evidence manifest contract

`PRODUCTION_EVIDENCE_FILE` must point to an operator-controlled JSON file that is not committed with application source, and `PRODUCTION_EVIDENCE_SHA256` must equal its independently approved lowercase SHA-256. It binds `releaseCommit` to the clean checkout's exact `RELEASE_COMMIT` and contains version `1` plus a `records` object. Every record requires a non-placeholder artifact reference, the artifact's lowercase SHA-256, and an offset-aware approval time; expiring evidence also supplies `validUntil`. The legal, vendor, and insurance record references must exactly match their corresponding release environment references.

Required record keys are `legalApproval`, `vendorRiskApproval`, `insuranceCoverage`, `penetrationTest`, `policyPublication`, `productionKmsProbe`, `productionBackupRestore`, `monitoringAlertDelivery`, `stagingSmoke`, `rollbackDrill`, `dnsTlsWafReview`, `providerLiveFire`, `incidentExercise`, `rpoRtoExercise`, and `deploymentPlanApproval`. Configuration presence alone is not proof: the hashes and references must resolve to the genuine scoped evidence reviewed by the release owner.

## Current evidence — 2026-08-09

| Gate | Current evidence | Status |
|---|---|---|
| Complete local verification | `verify: ok`; 51 unit/security, 20 integration/contract, 5 API/performance E2E, 12 Chromium accessibility/WebAuthn tests | Passed locally |
| Automated continuity release | LF-15 completed through real PostgreSQL, Valkey scheduling, deterministic PDF rendering, immutable MinIO storage, and Mailpit delivery; staged scan covered 235 tracked files | Passed locally |
| Physical-mail adapters | Lob and PostGrid deterministic HTTP contracts and both signed webhook formats pass; partial configuration fails closed | Engineering complete; authenticated sandbox/live delivery deferred |
| Core outcomes | LF-01 through LF-15 each emitted `ok`; aggregate `live-fire: ok` | Passed against real local dependencies |
| Backup and restore | `backup: ok`; `restore drill: ok` against an isolated PostgreSQL database | Passed locally |
| Container release rehearsal | `container rehearsal: ok`; API, web, and active Redis Streams worker ran non-root with dependency-aware readiness against real PostgreSQL and Valkey | Passed locally |
| Immutable local images | API `3b4eddb70894...`; web `51abfab7a521...`; worker `9e5eac162883...` match the final rehearsal manifest; test/compiler packages are not runtime-resolvable | Passed locally |
| Kubernetes baseline | `kubectl kustomize infrastructure/kubernetes` emitted a complete migration/API/web/worker/network-policy resource set | Passed offline |
| Production ship gate | Fresh sourced local-environment run emitted `verify: ok`, then `production readiness: FAIL - NODE_ENV must be production` before evidence validation or mutation | Blocked externally |
| Legal/business/security attestations | Operator reports counsel/policy approval, vendor reviews/DPAs, insurance, and an issue-free independent penetration test; no immutable artifact references are configured | Attested, evidence references pending |

No production release tag exists. `green/EP-009` is the latest genuine graph checkpoint. The externally dependent items are consolidated in `.agent/state/DEFERRED_EXTERNALS.md` and `REMOTE_SESSION_HANDOFF.md`.
