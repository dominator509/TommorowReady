# Deployment

Build immutable web, API, and worker images. Apply expand migrations before application rollout. Deploy staging, run migration checks, health, smoke, E2E subset, provider probes, and action reconciliation test. Production deployment is MANUAL because auto-deploy is not authorized.

## Locally verified release path

1. `sh scripts/verify.sh` must emit `verify: ok`.
2. Build all targets using the container command in `COMMANDS.md`.
3. `sh infrastructure/rehearse-containers.sh` must emit `container rehearsal: ok`. It runs the API and web images as their declared non-root user, proves web availability, and proves API readiness against the real local PostgreSQL service. It removes only its two named rehearsal containers on exit.
4. Inspect immutable local digests with `docker images --digests --format '{{.Repository}} {{.Digest}}'` and update the local-rehearsal manifest only after a clean rebuild. Local builds disable BuildKit provenance so cached input produces a stable rehearsal digest; the production registry must generate and retain its reviewed provenance attestation.
5. `sh scripts/backup.sh` and `sh scripts/restore-drill.sh` must pass before any migration or rollout rehearsal.

Current locally built digests from the 2026-08-07 verified tree are recorded in `infrastructure/kubernetes/tomorrowready.yaml`. They are local Docker evidence, not registry-push or production provenance evidence.

## Production boundary

The Kubernetes file is a hardened local-rehearsal baseline: non-root containers, read-only filesystems, dropped capabilities, resource bounds, probes, immutable digests, service-account token disablement, services, and default-deny networking. A reviewed platform overlay must supply registry-qualified digests, namespace/ingress, DNS/TLS, secret-manager integration, production database/Valkey/storage/KMS/provider endpoints, explicit network-policy allowlists, disruption budgets, autoscaling, and monitoring destinations.

After those values and every external approval are supplied, run `sh scripts/production-readiness-check.sh`. Only its genuine success permits the manual command `pnpm deploy:production`. Post-deploy run `pnpm smoke:production`. The deployment command intentionally remains fail-closed until the platform adapter and authorization exist.
