# TomorrowReady Remote Session Handoff

## Executive status

| Field | Status |
|---|---|
| Project | TomorrowReady family continuity SaaS |
| Repository | `C:\dev\TommorowReady` |
| Current commit | This handoff is committed at repository `HEAD`; resolve the immutable value with `git rev-parse HEAD` |
| Latest genuine green tag | `green/EP-009` |
| Graph | EP-000 through EP-009 done; EP-010 engineering gates pass but ship evidence is externally unverified |
| Engineering completion | 91% by green graph nodes (10 of 11); 100% of locally executable graph engineering and verification is complete |
| Production release | Blocked; no release tag, registry push, staging deployment, DNS mutation, or production deployment occurred |
| Why `RUN_COMPLETE` is unavailable | Qualified-counsel approval, vendor and penetration-test evidence, insurance, production KMS/infrastructure/domain/monitoring, authenticated provider probes, staging/rollback evidence, and explicit manual authorization are absent |

The unchanged ship gate ran after a complete green verification and exited 1 with `production readiness: FAIL - legal approval evidence missing`. Nothing converts that failure into approval.

## Subsystem status

| Subsystem | Status | Completed and passing | External verification remaining | Known risk |
|---|---|---|---|---|
| Toolchain and repository | Green | Pinned Node/pnpm workspace, ignored local secrets, CI, preflight | Hosted CI has not run in this local-only session | GitHub runner/environment drift |
| Domain and invariants | Green locally | Confirmed-only readiness, scoped helpers, canonical packet hashes, deterministic release state machine, property tests | Independent threat-model and penetration-test approval | Real adversarial assessment absent |
| PostgreSQL and persistence | Green locally | Canonical schema, migrations, forced RLS, distinct non-superuser app role, append-only evidence, backup/restore | Managed database, production backups, RPO/RTO | Local single-host durability only |
| API and application | Green locally | Versioned routes, schema/context validation, safe errors, audit, real readiness | Staging ingress, production auth traffic, provider callbacks | Production edge and identity not exercised |
| Web and accessibility | Green locally | Production build, overview/guided plan, keyboard, zoom, reduced motion, axe checks | Real-user/device accessibility review | Browser matrix is Chromium only |
| Authentication and permissions | Green locally | Memory-hard passwords, TOTP, signed sessions, step-up decisions, tenant/packet/support authorization | Live passkey/OAuth/device and production session verification | External identity/device behavior unverified |
| Upload and cryptography | Green locally | AES-GCM fields, checksum/MIME/magic/malware-clear gates | Production KMS, scanner, lifecycle, signed URL verification | Local key and scanner-state contracts only |
| AI boundary | Green with provider disabled | Consent, DLP, tenant cache isolation, stable prefix, schema validation, disabled-provider failure | Approved DeepSeek credential and authenticated live probe if AI enabled | No live model output was credited |
| Notifications and storage | Green locally | Real Mailpit SMTP and MinIO S3-compatible round trips | Production email/domain and cloud storage lifecycle probes | Provider-specific delivery/lifecycle unknown |
| Observability and operations | Green locally | Redacted structured logs, bounded metrics, alert/runbook mapping, fail-closed readiness | Production sink, alert delivery, incident exercises | SLOs/RPO/RTO not production-evidenced |
| Testing | Green locally | 27 unit/security, 8 integration/contract, 3 E2E, 3 browser tests, LF-01–LF-14 | Provider sandbox and staging live-fire | External effects not live-tested |
| Deployment and rollback | Green locally | Stable non-root images, health checks, immutable rehearsal digests, repeated container rehearsal | Registry, platform overlay, staging deploy/rollback, DNS/TLS/WAF | Kubernetes file is a local-rehearsal baseline only |
| Legal, privacy, and business | Technical mechanisms only | Draft policies, consent/privacy request records, retention boundaries, deferred inventory | Counsel, entity/contact text, vendor review, insurance, publication | Production launch prohibited |

## Graph status

| Node | Status | Evidence or exact reason |
|---|---|---|
| EP-000 Discovery and toolchain | Done | `green/EP-000`; extraction, manifest, toolchain, external inventory, preflight |
| EP-001 Foundation | Done | `green/EP-001`; workspace, real local infrastructure, CI, application shell |
| EP-002 Core domain | Done | `green/EP-002`; invariant/property tests and DLP regression |
| EP-003 Data and persistence | Done | `green/EP-003`; RLS, migrations, append-only evidence, real PostgreSQL |
| EP-004 API/service | Done | `green/EP-004`; versioned API, contracts, privacy/release routes |
| EP-005 UI/client | Done | `green/EP-005`; production web build and browser accessibility |
| EP-006 Auth/security/permissions | Done | `green/EP-006`; step-up, scoped authorization, DLP, upload boundary |
| EP-007 Testing hardening | Done | `green/EP-007`; expanded sentinel, live-fire, browser, backup/restore |
| EP-008 Observability/operations | Done | `green/EP-008`; redaction, metrics, alerts, readiness, runbooks |
| EP-009 Deployment/release | Done | `green/EP-009`; stable images and repeated container rehearsal |
| EP-010 Production readiness/ship | Engineering complete but externally unverified | Local `verify: ok`; ship gate exits 1 on missing legal evidence; no `NODE_DONE` or green tag permitted |

## Deferred external requirements

| ID | Service or approval | Environment variables | Minimum scope / how to obtain | Exact read-only probe | Exact validation | Features affected | Production blocked |
|---|---|---|---|---|---|---|---|
| EXT-001 | Managed PostgreSQL | `DATABASE_URL` | Dedicated production owner/app roles from approved platform | `sh scripts/probes/database_url.sh` | `pnpm db:migrate && sh scripts/test-integration.sh` | Authoritative data, RLS, audit | Yes |
| EXT-002 | Managed Valkey/Redis | `REDIS_URL` | Dedicated namespace and TLS credential | `sh scripts/probes/redis_url.sh` | `sh scripts/test-integration.sh && sh scripts/live-fire.sh` | Queue, locks, throttles, cache | Yes |
| EXT-003 | Private cloud object storage | `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` | Scoped private-bucket CRUD/metadata role | `sh scripts/probes/s3_endpoint.sh` | `sh scripts/test-integration.sh && sh scripts/live-fire.sh` | Uploads, originals, packets, exports | Yes |
| EXT-004 | Transactional email and verified domain | `SMTP_URL` | Approved sender limited to one verified domain | `sh scripts/probes/smtp_url.sh` | `sh scripts/live-fire.sh` | Verification, alerts, challenges | Yes |
| EXT-005 | DeepSeek API if AI enabled | `DEEPSEEK_API_KEY` | Restricted inference key after vendor/privacy approval | `sh scripts/probes/deepseek_api_key.sh` | `sh scripts/test-integration.sh` plus reviewed authenticated model probe | Optional drafting/organization | Yes only if AI enabled |
| EXT-006 | SMS provider if enabled | `SMS_PROVIDER_TOKEN` | Restricted sandbox then production messaging role | `test -n "$SMS_PROVIDER_TOKEN"` | `sh scripts/live-fire.sh` plus delivery receipt reconciliation | Optional high-risk notices | No if disabled |
| EXT-007 | Stripe if paid launch | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Restricted test key and webhook secret, then approved production role | `sh scripts/probes/stripe_secret_key.sh` | `sh scripts/test-integration.sh && sh scripts/live-fire.sh` | Billing and entitlements | Yes for paid launch |
| EXT-008 | Production KMS | `KMS_KEY_ID` | One dedicated key; app encrypt/decrypt only | `test -n "$KMS_KEY_ID"` | `sh scripts/production-readiness-check.sh` plus production restore | Restricted data and exports | Yes |
| EXT-009 | Error-monitoring sink | `SENTRY_DSN` | Content-free ingest project after privacy approval | `test -n "$SENTRY_DSN"` | `sh scripts/verify.sh` plus external redaction/ingest probe | Error telemetry | No if disabled |
| EXT-010 | Qualified-counsel approval | `LEGAL_APPROVAL_RECORD` | Signed review covering named policies and launch jurisdictions | `test -n "$LEGAL_APPROVAL_RECORD"` | `sh scripts/production-readiness-check.sh` | Terms, privacy, child data, emergency release | Yes |
| EXT-011 | Vendor risk, DPAs, transfers, retention, training, regions | `VENDOR_RISK_APPROVAL_RECORD` | Signed approval for every enabled vendor | `test -n "$VENDOR_RISK_APPROVAL_RECORD"` | `sh scripts/production-readiness-check.sh` | All external providers | Yes |
| EXT-012 | Cyber and E&O insurance | `INSURANCE_EVIDENCE_RECORD` | Active suitable policies with immutable evidence reference | `test -n "$INSURANCE_EVIDENCE_RECORD"` | `sh scripts/production-readiness-check.sh` | Business release | Yes |
| EXT-013 | Independent penetration test and threat-model approval | None | Commission scoped assessment and approve all dispositions | `git grep -n "penetration test" PRODUCTION_READINESS.md REMOTE_SESSION_HANDOFF.md` | `sh scripts/security-check.sh && sh scripts/production-readiness-check.sh` | Security ship gate | Yes |
| EXT-014 | Domain, DNS, CDN, TLS, WAF | None | Provide approved zone and least-privilege edge access | `git grep -n "manual" DEPLOYMENT.md` | `pnpm smoke:production` | Public routing and edge defense | Yes |
| EXT-015 | Production compute/database/cache/storage platform | None | Select approved platform and provide scoped staging/production deploy roles | `git grep -n "MANUAL" DEPLOYMENT.md` | `pnpm deploy:production && pnpm smoke:production` | Hosted web, API, workers, renderer | Yes |
| EXT-016 | Manual deployment authorization | `AUTO_DEPLOY_AUTHORIZED` | Set `yes` only after every other gate and reviewed mutation plan | `test "${AUTO_DEPLOY_AUTHORIZED:-no}" = yes` | `sh scripts/production-readiness-check.sh` | Production release | Yes |
| EXT-017 | Optional media/transcription/print vendors | None | Select only approved vendors with restricted scopes | `git grep -n "transcription\|print fulfillment" BLUEPRINT_INPUT.md SUBPROCESSOR_REGISTER.md` | `sh scripts/live-fire.sh` plus provider contract/live probe | Optional derivatives/fulfillment | No if disabled |
| EXT-018 | Legal entity, privacy contact, jurisdiction, policy publication | None | Counsel-approved entity/address/contact text and publication records | `git grep -n "must be inserted\|requires counsel" PRIVACY_POLICY_DRAFT.md TERMS_OF_SERVICE_DRAFT.md` | `sh scripts/production-readiness-check.sh` | Notices, rights, contracts | Yes |

The authoritative detailed inventory is `.agent/state/DEFERRED_EXTERNALS.md`. Never change `DEFERRED` to `VERIFIED` from configuration presence alone.

## Commands to resume

```sh
cd /c/dev/TommorowReady
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
docker compose up -d --wait
set -a; . ./.env; set +a
pnpm db:migrate
sh scripts/preflight.sh
sh scripts/graph-next.sh
```

Rerun all local and deferred gates:

```sh
sh scripts/external-requirements.sh
sh scripts/verify.sh
sh infrastructure/rehearse-containers.sh
sh scripts/production-readiness-check.sh
```

After approved production credentials and evidence are supplied, execute each affected row's probe and validation first. Then:

```sh
sh scripts/production-readiness-check.sh
pnpm deploy:production
pnpm smoke:production
```

Rollback sequence after a real deployment:

```sh
pnpm smoke:production
# Pause release mutation and dispatch using the selected platform's reviewed command.
# Roll back to the recorded prior registry digests; do not contract the database.
pnpm smoke:production
```

Provider-specific deploy, pause, image-rollback, and reconciliation commands cannot be written truthfully until EXT-015 selects the production platform. Add them to `COMMANDS.md`, `DEPLOYMENT.md`, and `ROLLBACK.md` through a reviewed ADR before first staging mutation.

## Legal and business actions

1. Obtain qualified-counsel approval for every named policy, DPIA conclusion, child/dependent treatment, emergency-access design, jurisdiction, and publication text.
2. Insert the approved legal entity, address, privacy contact, support contact, governing jurisdiction, and effective dates; publish versioned policies and retain publication evidence.
3. Complete vendor risk, DPA, transfer, retention, training, data-residency, and subprocessor review for every enabled vendor.
4. Obtain active cyber and E&O insurance evidence.
5. Commission the independent penetration test and threat-model review; resolve or formally disposition every finding.
6. Approve the production platform, regions, domain, DNS/TLS/CDN/WAF configuration, backup policy, KMS key, monitoring sink, and incident contacts.
7. Grant manual deployment authorization only after the production-readiness script and human evidence review pass.

## Known risks

- No production provider, registry, cloud, edge, KMS, monitoring, alert, backup, staging, or rollback behavior has been verified.
- Local live-fire proves protocol-compatible services, not provider-specific delivery, lifecycle, billing, AI, or regional semantics.
- Legal documents remain drafts and may contain placeholders; no counsel, regulatory, rights, guardian, copyright, voice/likeness, or business authority is implied.
- The Kubernetes manifest deliberately defaults network traffic to deny and requires a reviewed platform allowlist overlay; applying it alone is not a production deployment.
- The worker image is built and non-root, but production queue throughput and provider-backed job execution require staging evidence.
- SLO, RPO, RTO, incident-response, regional failover, and production data-deletion claims remain unproven.

## Final operator checklist

1. Select EXT-015's production platform and regions; provide staging-only roles first and add exact provider commands through ADR review.
2. Complete EXT-010, EXT-011, EXT-012, EXT-013, and EXT-018 evidence before enabling any provider or public route.
3. Provision staging database, Valkey, private storage, KMS, monitoring, alerting, backup, and edge controls; run every row's probe and validation.
4. Push newly rebuilt images to the approved registry with signed provenance; replace local digests with registry-qualified digests.
5. Deploy staging manually; execute migrations, smoke, E2E subset, provider probes, incident exercise, backup/restore, and image rollback.
6. Reconcile every ambiguous external action and close all security/privacy findings.
7. Run `sh scripts/verify.sh` and `sh scripts/production-readiness-check.sh` from a clean commit.
8. Set `AUTO_DEPLOY_AUTHORIZED=yes` only after the full human review, then run `pnpm deploy:production` and `pnpm smoke:production`.
