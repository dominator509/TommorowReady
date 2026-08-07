# Rollback

Trigger on security breach, authorization bypass, data corruption, elevated duplicate actions, migration failure, or critical regression. Stop dispatch queues, disable provider actions, preserve evidence, roll back images, reconcile unknown actions, verify health and invariants, communicate, and conduct postmortem.

## Rehearsed order

1. Pause release mutation and outbound dispatch at the smallest affected scope; preserve immutable request, receipt, and audit evidence.
2. Record current deployment revisions and image digests. Never use a mutable tag as the rollback target.
3. Roll back API, web, and worker images to the latest genuine green digest. Do not contract the database.
4. Run database readiness, migrations in compatibility-check mode, `pnpm smoke:production`, packet-isolation checks, release-safety properties, and action reconciliation.
5. Resume queues only after unknown or ambiguous external actions are reconciled with their original idempotency keys.
6. Keep the incident open until authorization, privacy, integrity, notification, and monitoring evidence are reviewed.

Locally, `sh scripts/backup.sh`, `sh scripts/restore-drill.sh`, and `sh infrastructure/rehearse-containers.sh` prove the recoverable data artifact and prior/current image startup mechanics. They do not prove a production cluster rollback, registry availability, external action reconciliation, regional failover, or production RTO.
