# TomorrowReady Operations

Health endpoints cover web, API, database, Valkey, storage, workers, KMS readiness, notification adapters, and queue age. Provider failures are isolated and visible.

Runbooks are required for database outage, storage outage, queue backlog, malware event, owner-notification failure during challenge, fraudulent emergency request, compromised recipient, unauthorized packet exposure, account takeover, KMS failure, AI-provider leak concern, deletion failure, backup failure, and regional outage.

Emergency release operations may pause releases globally or per household, but support cannot bypass an absent policy or expand packet scope. Manual review requires two-person approval, documented evidence, and immutable audit. Every incident protects packet confidentiality before availability.

Backups are encrypted, restoration is tested quarterly, and release evidence is included. Scheduled jobs cover reminders, annual reviews, challenge timers, packet expiry, access revocation, retention, purge, integrity checks, and cache cleanup.

## Local operating evidence

Run all commands from the repository root using the non-interactive environment in `COMMANDS.md`.

| Control | Command | Required sentinel |
|---|---|---|
| Dependency readiness | `docker compose ps` | every required service is healthy |
| API and dependency smoke | `sh scripts/smoke-test.sh` | `smoke test: ok` |
| Complete verification | `sh scripts/verify.sh` | `verify: ok` |
| Local backup | `sh scripts/backup.sh` | `backup: ok` |
| Isolated restore | `sh scripts/restore-drill.sh` | `restore drill: ok` |
| Production readiness | `sh scripts/production-readiness-check.sh` | must fail closed until all external evidence exists |

The local backup artifact is independently AES-256-GCM encrypted at `.agent/state/backups/tomorrowready-local.dump.enc` with the ignored local-only `BACKUP_ENCRYPTION_KEY`. The restore drill authenticates and decrypts it into an ignored, mode-restricted temporary file, creates an isolated database, verifies the canonical schema, and removes both the drill database and plaintext temporary file on exit. This local proof is not production KMS, retention, RPO, or off-site durability evidence.

Durable jobs use a Redis Stream consumer group. Enqueue and idempotency-marker creation are one atomic server-side operation; workers claim opaque-ID-only jobs and acknowledge only after the handler succeeds. Attempts are bounded, stale claims are explicitly reclaimed, and exhausted jobs move to a dead-letter stream containing only opaque job identity and a normalized error code. The hosted worker must wire these primitives to handlers, metrics, and alerts before its deployment gate can pass.

The incident procedures are maintained in `runbooks/README.md`. During an incident, select the row matching the alert-to-runbook mapping in the observability package, preserve append-only evidence, and pause only the smallest safe release scope. No operator or support role may bypass deterministic policy, customer approval, two-person review, or packet scope.
