=== FILE: PREFLIGHT.md ===
# TomorrowReady Preflight

Preflight is the sole interactive bootstrap boundary. Auto-deploy is not authorized. Engineering may continue with real local services when production credentials or approvals are unavailable, but no external verification or legal approval may be fabricated.

## Required operator-controlled evidence

| Service or evidence | Purpose | Minimum scope | Obtain and verify |
|---|---|---|---|
| PostgreSQL | Authoritative household, packet, consent, audit, and release records | Dedicated database owner | `DATABASE_URL`; probe runs `SELECT 1` |
| Valkey/Redis | Queues, locks, throttles, cache | Dedicated namespace | `REDIS_URL`; probe sends `PING` |
| Private S3 storage | Originals, media, packets, exports | Dedicated private bucket CRUD | S3 variables; metadata-read probe |
| DeepSeek | Optional AI assistance | Inference only | `DEEPSEEK_API_KEY`; read-only/minimal authorized probe |
| Transactional email | Verification, alerts, challenge notices | One verified sending domain | `SMTP_URL`; connection/auth probe |
| SMS | Optional high-risk challenge notices | Restricted messaging service | Optional presence and sandbox probe |
| Stripe | Subscription billing | Restricted test key | Account-metadata probe |
| KMS | Production envelope encryption | Encrypt/decrypt for dedicated key only | Required for production, optional local development |
| Legal approval | Terms, privacy, child-data, release, consent | Written qualified-counsel approval | Evidence reference only after approval |
| Vendor risk approval | AI, email, SMS, storage, monitoring, media | Signed internal review | Evidence reference only after approval |
| Cyber/E&O insurance | Residual liability | Active suitable policy | Evidence reference only after confirmation |
| Production authorization | Prevent irreversible release | Explicit operator approval | `AUTO_DEPLOY_AUTHORIZED=no` by default |

PREFLIGHT-TABLE-BEGIN
DATABASE_URL|REQUIRED|scripts/probes/database_url.sh
REDIS_URL|REQUIRED|scripts/probes/redis_url.sh
S3_ENDPOINT|REQUIRED|scripts/probes/s3_endpoint.sh
S3_ACCESS_KEY_ID|REQUIRED|-
S3_SECRET_ACCESS_KEY|REQUIRED|-
S3_BUCKET|REQUIRED|-
SESSION_SECRET|REQUIRED|-
FIELD_ENCRYPTION_KEY|REQUIRED|-
DEEPSEEK_API_KEY|OPTIONAL|scripts/probes/deepseek_api_key.sh
SMTP_URL|OPTIONAL|scripts/probes/smtp_url.sh
SMS_PROVIDER_TOKEN|OPTIONAL|-
STRIPE_SECRET_KEY|OPTIONAL|scripts/probes/stripe_secret_key.sh
STRIPE_WEBHOOK_SECRET|OPTIONAL|-
KMS_KEY_ID|OPTIONAL|-
SENTRY_DSN|OPTIONAL|-
LEGAL_APPROVAL_RECORD|OPTIONAL|-
VENDOR_RISK_APPROVAL_RECORD|OPTIONAL|-
INSURANCE_EVIDENCE_RECORD|OPTIONAL|-
AUTO_DEPLOY_AUTHORIZED|REQUIRED|-
PREFLIGHT-TABLE-END

## Fail-closed rules
Missing optional providers do not justify fabricated success. Local real services may satisfy engineering tests. Production remains blocked until required legal, vendor, insurance, KMS, domain, deployment, and policy evidence exists. Prohibited secrets are never sent to external AI or included in packets.
=== END FILE ===

=== FILE: .env.example ===
# TomorrowReady environment template. Copy to .env and replace local values. Never commit .env.
DATABASE_URL=postgresql://tomorrowready:local_only@127.0.0.1:5432/tomorrowready
REDIS_URL=redis://127.0.0.1:6379/0
S3_ENDPOINT=http://127.0.0.1:9000
S3_ACCESS_KEY_ID=local_tomorrowready
S3_SECRET_ACCESS_KEY=replace_with_secure_local_secret
S3_BUCKET=tomorrowready-private
SESSION_SECRET=replace_with_32_plus_random_bytes
FIELD_ENCRYPTION_KEY=replace_with_base64_32_byte_key
DEEPSEEK_API_KEY=
SMTP_URL=smtp://127.0.0.1:1025
SMS_PROVIDER_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
KMS_KEY_ID=
SENTRY_DSN=
LEGAL_APPROVAL_RECORD=
VENDOR_RISK_APPROVAL_RECORD=
INSURANCE_EVIDENCE_RECORD=
AUTO_DEPLOY_AUTHORIZED=no
NODE_ENV=development
LOG_LEVEL=info
APP_BASE_URL=http://127.0.0.1:3000
API_BASE_URL=http://127.0.0.1:3001
=== END FILE ===

=== FILE: .agent/MANIFEST.md ===
# 6LAYER Manifest

Every file belongs to one layer.
- `.agent/EXECUTION_RULES.md` - L1 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/GRAPH.md` - L3 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/LOOPS.md` - L1 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/MANIFEST.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/PLANS.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/adapters/RECIPE.md` - L1 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/checklists/agent-readiness.md` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/checklists/final-review.md` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/checklists/implementation.md` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/checklists/incident-response.md` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/checklists/preflight.md` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/checklists/production-readiness.md` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/checklists/release.md` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/checklists/rollback.md` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/checklists/validation.md` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/execplans/EP-000-discovery-and-toolchain.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/execplans/EP-001-foundation.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/execplans/EP-002-core-domain.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/execplans/EP-003-data-and-persistence.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/execplans/EP-004-api-or-service-layer.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/execplans/EP-005-user-interface-or-client.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/execplans/EP-006-auth-security-and-permissions.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/execplans/EP-007-testing-hardening.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/execplans/EP-008-observability-and-operations.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/execplans/EP-009-deployment-and-release.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/execplans/EP-010-production-readiness-and-ship.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/prompts/continue-execplan.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/prompts/debug-validation-failure.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/prompts/execute-active-execplan.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/prompts/final-review.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/prompts/run-graph.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/reality-allow` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/reality-patterns` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/specs/SPEC-000-product-scope.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/specs/SPEC-001-core-domain.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/specs/SPEC-002-data-model.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/specs/SPEC-003-api-contracts.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/specs/SPEC-004-ui-ux-behavior.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/specs/SPEC-005-auth-and-permissions.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/specs/SPEC-006-error-handling.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/specs/SPEC-007-observability.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/specs/SPEC-008-production-readiness.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/state/LEDGER.md` - L6 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/templates/adr-template.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/templates/execplan-template.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/templates/runbook-template.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/templates/spec-template.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.agent/templates/test-case-template.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `.env.example` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `.gitignore` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `AGENTS.md` - L1 - project control, specification, execution, verification, policy, or state artifact.
- `AI_PROCESSING_NOTICE.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `ARCHITECTURE.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `ASSUMPTIONS.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `AUTOMATION_AND_AUTHORIZATION_POLICY.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `BLUEPRINT_INPUT.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `BLUEPRINT_PACK.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `CHILD_AND_DEPENDENT_DATA_POLICY.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `CLAUDE.md` - L1 - project control, specification, execution, verification, policy, or state artifact.
- `COMMANDS.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `CONTRIBUTING.md` - L4 - project control, specification, execution, verification, policy, or state artifact.
- `DATA_RETENTION_SCHEDULE.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `DECISIONS.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `DELEGATED_ACCESS_POLICY.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `DEPLOYMENT.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `DIGITAL_SECRETS_POLICY.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `DPIA.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `EMERGENCY_ACCESS_AND_RELEASE_POLICY.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `ENVIRONMENT.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `FAMILY_READINESS_SCORE_POLICY.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `HERMES.md` - L1 - project control, specification, execution, verification, policy, or state artifact.
- `HOW_TO_USE.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `INCIDENT_RESPONSE_PLAN.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `MEDIA_MESSAGES_AND_LEGACY_POLICY.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `OBSERVABILITY.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `OPENCLAW.md` - L1 - project control, specification, execution, verification, policy, or state artifact.
- `OPERATIONS.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `PREFLIGHT.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `PRIVACY_POLICY_DRAFT.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `PRODUCTION_READINESS.md` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `PROJECT_BRIEF.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `RELEASE.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `ROADMAP.md` - L3 - project control, specification, execution, verification, policy, or state artifact.
- `ROLLBACK.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `SECURITY.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `SUBPROCESSOR_REGISTER.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `TERMS_OF_SERVICE_DRAFT.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `TESTING.md` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `TRUSTED_HELPER_AND_RECIPIENT_POLICY.md` - L2 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/build.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/dependency-audit.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/format-check.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/graph-next.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/install.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/ledger.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/lint.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/live-fire.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/preflight.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/probes/database_url.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/probes/deepseek_api_key.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/probes/redis_url.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/probes/s3_endpoint.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/probes/smtp_url.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/probes/stripe_secret_key.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/production-readiness-check.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/reality-gate.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/security-check.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/smoke-test.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/test-e2e.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/test-integration.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/test-unit.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/typecheck.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.
- `scripts/verify.sh` - L5 - project control, specification, execution, verification, policy, or state artifact.

TOTAL FILES: 113
=== END FILE ===

=== FILE: AGENTS.md ===
# TomorrowReady Control Plane

## 1. Mission
Build a trustworthy, accessible SaaS that helps households inventory continuity records, organize evidence, schedule recurring administration, collaborate with trusted caregivers, and safely prepare or execute explicitly authorized actions without silently creating financial, legal, medical, privacy, or account consequences.

## 2. The Boot Sequence
PRIME-BLOCK-BEGIN
This repository is governed by a 6LAYER blueprint pack. AGENTS.md is the authoritative control plane; if anything here conflicts with AGENTS.md, AGENTS.md wins.
On every session start, execute THE BOOT SEQUENCE:
1. Read AGENTS.md fully. 2. Read COMMANDS.md. 3. Read .agent/GRAPH.md and .agent/LOOPS.md. 4. Run: sh scripts/ledger.sh tail 30. 5. Run: sh scripts/preflight.sh -- it MUST print "preflight: ok"; if it fails, report the exact missing items from PREFLIGHT.md and stop (this is the only legitimate pre-run stop). 6. Run: sh scripts/graph-next.sh and dispatch on its one-line output exactly as .agent/GRAPH.md specifies. 7. Repeat step 6 after every completed node until ALL_DONE, then run the ship gate in AGENTS.md.
Hard rules: do not ask the user questions; choose the smallest reversible option, record it, continue. Use only commands from COMMANDS.md. Never invent an API, route, table, flag, or env var -- verify in-repo or transcribe from the pack. One node at a time; milestones in order; commit after every milestone; append ledger events as .agent/LOOPS.md requires. Bounded retries per .agent/LOOPS.md -- never repeat a failed fix. No mocks, stubs, demo modes, or placeholder code in production paths; scripts/reality-gate.sh and scripts/live-fire.sh must genuinely pass. Never weaken a gate, skip a test, or claim an unrun result. Stop only at NODE_BLOCKED (with the full evidence report) or ALL_DONE.
PRIME-BLOCK-END

## 3. Source of truth
Current explicit user instruction > L1 control > L2 specification > L3 graph > L4 execution > repository code and tests > L5 gate output as fact > L6 state as history. Code changes when it conflicts with specifications. Gates never weaken to fit code.

## 4. Graph protocol
One node equals one ExecPlan. At most one node is IN_PROGRESS. Run `sh scripts/graph-next.sh` for every dispatch. A node is DONE only after all milestones pass, node verification prints its sentinel, expected-files audit passes, `NODE_DONE` is appended, and `green/EP-XXX` exists. Commit every milestone. Never cross a completed green tag during rollback.

## 5. Stop conditions
Stop only when: (a) preflight fails before the run; (b) an action would destroy user or production data or cause an unspecified irreversible external effect; (c) a legal, financial, medical, or security judgment is unanswered by the specifications; (d) the complete retry ladder ends in a documented `NODE_BLOCKED`; or (e) production deployment is reached while auto-deploy is not authorized. Do not ask the user for next steps, preferences, or confirmation. Proceed.

## 6. Anti-drift
At every milestone re-read its scope and non-goals. Change only declared paths. Revert unrelated changes. No broad refactors or unrelated cleanup. Audit expected files.

## 7. Anti-hallucination
Never invent package APIs, commands, environment variables, routes, tables, queues, config keys, or provider behavior. Read repository evidence or transcribe the pack. Commands come only from COMMANDS.md. Record assumptions and decisions.

## 8. Anti-fixation
Use the bounded ladder in `.agent/LOOPS.md`. Never repeat the same fix. Isolate before changing approach. Use declared fallback. Roll back, then block with evidence.

## 9. Reality law
Software that appears to work is a failure state. Only software proven by live-fire counts. No stubs, fake effects, demo paths, or placeholder implementations in production code.

## 10. Dependency rules
Prefer existing dependencies. Add only what is necessary, pin exact versions, update lockfiles and documentation, and run audits.

## 11. Commits
Use `[EP-XXX][M#] imperative summary`. Leave no unexplained changes between milestones.

## 12. Testing
Follow TESTING.md. Never skip, weaken, or rewrite a gate to pass implementation.

## 13. Layer edits
L1 is immutable during a run. L2 and L3 require documented evidence. L4 progress regions change at milestone boundaries. L5 gates only strengthen. L6 ledger is append-only.

## 14. Security
Follow SECURITY.md. Never use production data for development. Never log secrets or raw sensitive documents.

## 15. Done
Node done requires the five graph conditions. Run done requires fresh `verify.sh`, production-readiness sentinel, release tag, and either authorized deploy plus smoke or an exact manual deploy instruction.

## 16. Final response
Report nodes, expected versus changed files, commands and observed sentinels, acceptance status, decisions, assumptions, risks, deferred externals, and ship-gate status.
=== END FILE ===

=== FILE: CLAUDE.md ===
PRIME-BLOCK-BEGIN
This repository is governed by a 6LAYER blueprint pack. AGENTS.md is the authoritative control plane; if anything here conflicts with AGENTS.md, AGENTS.md wins.
On every session start, execute THE BOOT SEQUENCE:
1. Read AGENTS.md fully. 2. Read COMMANDS.md. 3. Read .agent/GRAPH.md and .agent/LOOPS.md. 4. Run: sh scripts/ledger.sh tail 30. 5. Run: sh scripts/preflight.sh -- it MUST print "preflight: ok"; if it fails, report the exact missing items from PREFLIGHT.md and stop (this is the only legitimate pre-run stop). 6. Run: sh scripts/graph-next.sh and dispatch on its one-line output exactly as .agent/GRAPH.md specifies. 7. Repeat step 6 after every completed node until ALL_DONE, then run the ship gate in AGENTS.md.
Hard rules: do not ask the user questions; choose the smallest reversible option, record it, continue. Use only commands from COMMANDS.md. Never invent an API, route, table, flag, or env var -- verify in-repo or transcribe from the pack. One node at a time; milestones in order; commit after every milestone; append ledger events as .agent/LOOPS.md requires. Bounded retries per .agent/LOOPS.md -- never repeat a failed fix. No mocks, stubs, demo modes, or placeholder code in production paths; scripts/reality-gate.sh and scripts/live-fire.sh must genuinely pass. Never weaken a gate, skip a test, or claim an unrun result. Stop only at NODE_BLOCKED (with the full evidence report) or ALL_DONE.
PRIME-BLOCK-END
Platform: Claude Code. All authority remains in AGENTS.md.
=== END FILE ===

=== FILE: HERMES.md ===
PRIME-BLOCK-BEGIN
This repository is governed by a 6LAYER blueprint pack. AGENTS.md is the authoritative control plane; if anything here conflicts with AGENTS.md, AGENTS.md wins.
On every session start, execute THE BOOT SEQUENCE:
1. Read AGENTS.md fully. 2. Read COMMANDS.md. 3. Read .agent/GRAPH.md and .agent/LOOPS.md. 4. Run: sh scripts/ledger.sh tail 30. 5. Run: sh scripts/preflight.sh -- it MUST print "preflight: ok"; if it fails, report the exact missing items from PREFLIGHT.md and stop (this is the only legitimate pre-run stop). 6. Run: sh scripts/graph-next.sh and dispatch on its one-line output exactly as .agent/GRAPH.md specifies. 7. Repeat step 6 after every completed node until ALL_DONE, then run the ship gate in AGENTS.md.
Hard rules: do not ask the user questions; choose the smallest reversible option, record it, continue. Use only commands from COMMANDS.md. Never invent an API, route, table, flag, or env var -- verify in-repo or transcribe from the pack. One node at a time; milestones in order; commit after every milestone; append ledger events as .agent/LOOPS.md requires. Bounded retries per .agent/LOOPS.md -- never repeat a failed fix. No mocks, stubs, demo modes, or placeholder code in production paths; scripts/reality-gate.sh and scripts/live-fire.sh must genuinely pass. Never weaken a gate, skip a test, or claim an unrun result. Stop only at NODE_BLOCKED (with the full evidence report) or ALL_DONE.
PRIME-BLOCK-END
Platform: Hermes. All authority remains in AGENTS.md.
=== END FILE ===

=== FILE: OPENCLAW.md ===
PRIME-BLOCK-BEGIN
This repository is governed by a 6LAYER blueprint pack. AGENTS.md is the authoritative control plane; if anything here conflicts with AGENTS.md, AGENTS.md wins.
On every session start, execute THE BOOT SEQUENCE:
1. Read AGENTS.md fully. 2. Read COMMANDS.md. 3. Read .agent/GRAPH.md and .agent/LOOPS.md. 4. Run: sh scripts/ledger.sh tail 30. 5. Run: sh scripts/preflight.sh -- it MUST print "preflight: ok"; if it fails, report the exact missing items from PREFLIGHT.md and stop (this is the only legitimate pre-run stop). 6. Run: sh scripts/graph-next.sh and dispatch on its one-line output exactly as .agent/GRAPH.md specifies. 7. Repeat step 6 after every completed node until ALL_DONE, then run the ship gate in AGENTS.md.
Hard rules: do not ask the user questions; choose the smallest reversible option, record it, continue. Use only commands from COMMANDS.md. Never invent an API, route, table, flag, or env var -- verify in-repo or transcribe from the pack. One node at a time; milestones in order; commit after every milestone; append ledger events as .agent/LOOPS.md requires. Bounded retries per .agent/LOOPS.md -- never repeat a failed fix. No mocks, stubs, demo modes, or placeholder code in production paths; scripts/reality-gate.sh and scripts/live-fire.sh must genuinely pass. Never weaken a gate, skip a test, or claim an unrun result. Stop only at NODE_BLOCKED (with the full evidence report) or ALL_DONE.
PRIME-BLOCK-END
Platform: OpenClaw. All authority remains in AGENTS.md.
=== END FILE ===

=== FILE: .agent/adapters/RECIPE.md ===
# Adapter Recipe
Find the platform's standing-instruction file and place the following block byte-for-byte. Add only one platform-identification line after it. Never place volatile state in adapters.

PRIME-BLOCK-BEGIN
This repository is governed by a 6LAYER blueprint pack. AGENTS.md is the authoritative control plane; if anything here conflicts with AGENTS.md, AGENTS.md wins.
On every session start, execute THE BOOT SEQUENCE:
1. Read AGENTS.md fully. 2. Read COMMANDS.md. 3. Read .agent/GRAPH.md and .agent/LOOPS.md. 4. Run: sh scripts/ledger.sh tail 30. 5. Run: sh scripts/preflight.sh -- it MUST print "preflight: ok"; if it fails, report the exact missing items from PREFLIGHT.md and stop (this is the only legitimate pre-run stop). 6. Run: sh scripts/graph-next.sh and dispatch on its one-line output exactly as .agent/GRAPH.md specifies. 7. Repeat step 6 after every completed node until ALL_DONE, then run the ship gate in AGENTS.md.
Hard rules: do not ask the user questions; choose the smallest reversible option, record it, continue. Use only commands from COMMANDS.md. Never invent an API, route, table, flag, or env var -- verify in-repo or transcribe from the pack. One node at a time; milestones in order; commit after every milestone; append ledger events as .agent/LOOPS.md requires. Bounded retries per .agent/LOOPS.md -- never repeat a failed fix. No mocks, stubs, demo modes, or placeholder code in production paths; scripts/reality-gate.sh and scripts/live-fire.sh must genuinely pass. Never weaken a gate, skip a test, or claim an unrun result. Stop only at NODE_BLOCKED (with the full evidence report) or ALL_DONE.
PRIME-BLOCK-END
=== END FILE ===

=== FILE: COMMANDS.md ===
# Commands
Run from repository root. Coding agents must not invent commands. If a command is missing or stale, update this file first, citing repository evidence, with a Decision Log entry.

```sh
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
```

- Install: `sh scripts/install.sh`
- Preflight: `sh scripts/preflight.sh`
- Lint: `sh scripts/lint.sh`
- Format check: `sh scripts/format-check.sh`
- Typecheck: `sh scripts/typecheck.sh`
- Unit: `sh scripts/test-unit.sh`
- Integration: `sh scripts/test-integration.sh`
- E2E: `sh scripts/test-e2e.sh`
- Build: `sh scripts/build.sh`
- Security: `sh scripts/security-check.sh`
- Dependency audit: `sh scripts/dependency-audit.sh`
- Smoke: `sh scripts/smoke-test.sh`
- Live-fire: `sh scripts/live-fire.sh`
- Verify: `sh scripts/verify.sh`
- Production readiness: `sh scripts/production-readiness-check.sh`
- Local infrastructure: `docker compose up -d --wait`
- Local start: `pnpm start > .agent/state/local.log 2>&1 & echo $! > .agent/state/local.pid; i=0; until curl -fsS http://127.0.0.1:4000/health/ready >/dev/null; do i=$((i+1)); [ "$i" -lt 30 ] || exit 1; sleep 2; done`
- Local stop: `test ! -f .agent/state/local.pid || kill "$(cat .agent/state/local.pid)"; docker compose down`
- Database migration: `pnpm db:migrate`
- Adapter parity: `for f in AGENTS.md CLAUDE.md HERMES.md OPENCLAW.md; do awk '/PRIME-BLOCK-BEGIN/,/PRIME-BLOCK-END/' "$f" | cksum; done`

Forbidden: interactive REPLs, editors, pagers, foreground watch mode, force push, history rewrite, destructive database commands outside reviewed migrations, and credential prompts.
=== END FILE ===

=== FILE: .agent/GRAPH.md ===
# Graph
One node is one bounded ExecPlan. One writer. Status derives from the append-only ledger. Commit every milestone and tag every completed node.

GRAPH-TABLE-BEGIN
NODE EP-000 DEPS -
NODE EP-001 DEPS EP-000
NODE EP-002 DEPS EP-001
NODE EP-003 DEPS EP-002
NODE EP-004 DEPS EP-003
NODE EP-005 DEPS EP-004
NODE EP-006 DEPS EP-004
NODE EP-007 DEPS EP-005,EP-006
NODE EP-008 DEPS EP-007
NODE EP-009 DEPS EP-008
NODE EP-010 DEPS EP-009
GRAPH-TABLE-END

Dispatch: `NEXT` lease and run; `RESUME` continue active lease or take over after 90 stale minutes; `BLOCKED` stop; `STALL` record graph defect and block; `ALL_DONE` run ship gate. Rollback never crosses a completed green tag. Agents coordinate only through Git and ledger.
=== END FILE ===

=== FILE: .agent/LOOPS.md ===
# Loops
Run loop repeatedly calls graph-next until ALL_DONE or BLOCKED. Node loop executes milestones in order, verifies, audits files, appends NODE_DONE, and tags green. Milestone loop allows six total attempts: first targeted fix; second isolate with narrow diagnostic; third take declared fallback; if fallback exhausts, roll back and try once clean; then NODE_BLOCKED with evidence. Same fix may not repeat. New signature resets rung but not total cap.

Readiness loops use at most 30 probes separated by 2 seconds and record a kill command. Watchdogs force rung escalation after identical command/output three times, heartbeat after ten silent actions, revert undeclared paths, and treat budget overrun as rung three. At every milestone re-read milestone, node non-goals, and ledger tail. Commands are non-interactive. Blocked reports include exact blocker, outputs, exit codes, signatures, hypotheses, diffs, smallest human decision, and recommended default.
=== END FILE ===

=== FILE: .agent/state/LEDGER.md ===
2026-08-05T19:46:20Z | forge | - | RUN_INIT | pack generated
=== END FILE ===

=== FILE: .agent/reality-patterns ===
TODO|FIXME|XXX|HACK
todo!\(|unimplemented!\(|unreachable!\("not
NotImplementedError|raise NotImplemented
not implemented|Not implemented|NOT IMPLEMENTED
PLACEHOLDER|__REPLACE__|CHANGEME|changeme
\{\{[A-Z_]+\}\}
lorem ipsum|Lorem Ipsum
example\.com/api|sk-test-|xxxx-xxxx
=== END FILE ===

=== FILE: .agent/reality-allow ===
^__6L_ALLOW_NONE__$
=== END FILE ===

=== FILE: .agent/EXECUTION_RULES.md ===
# Execution Rules
One active node. Boot first. Continue by default. Stop only per AGENTS.md. Evidence before edits and done. Commands only from COMMANDS.md. No mocks in production. Scope-fence every milestone. Commit and ledger every milestone. Never repeat a failed fix.
=== END FILE ===

=== FILE: .agent/PLANS.md ===
# ExecPlan Standard
An ExecPlan is self-contained. It contains machine metadata, purpose, scope, non-goals, orientation, reads, expected files, contracts, milestones with GOAL READ CHANGE CONTENT RUN EXPECT EVIDENCE FALLBACK COMMIT, validation, recovery, progress, discoveries, decisions, and retrospective.
=== END FILE ===

=== FILE: .agent/checklists/agent-readiness.md ===
# Agent Readiness Checklist
- Open AGENTS.md and the applicable ExecPlan.
- Run `sh scripts/ledger.sh tail 30`.
- Run the relevant command from COMMANDS.md and record its sentinel.
- Inspect `git status --short` and the milestone change list.
- Record evidence, decisions, failures, and recovery in repository state.
- Do not claim success without observed output.
=== END FILE ===

=== FILE: .agent/checklists/final-review.md ===
# Final Review Checklist
- Open AGENTS.md and the applicable ExecPlan.
- Run `sh scripts/ledger.sh tail 30`.
- Run the relevant command from COMMANDS.md and record its sentinel.
- Inspect `git status --short` and the milestone change list.
- Record evidence, decisions, failures, and recovery in repository state.
- Do not claim success without observed output.
=== END FILE ===

=== FILE: .agent/checklists/implementation.md ===
# Implementation Checklist
- Open AGENTS.md and the applicable ExecPlan.
- Run `sh scripts/ledger.sh tail 30`.
- Run the relevant command from COMMANDS.md and record its sentinel.
- Inspect `git status --short` and the milestone change list.
- Record evidence, decisions, failures, and recovery in repository state.
- Do not claim success without observed output.
=== END FILE ===

=== FILE: .agent/checklists/incident-response.md ===
# Incident Response Checklist
- Open AGENTS.md and the applicable ExecPlan.
- Run `sh scripts/ledger.sh tail 30`.
- Run the relevant command from COMMANDS.md and record its sentinel.
- Inspect `git status --short` and the milestone change list.
- Record evidence, decisions, failures, and recovery in repository state.
- Do not claim success without observed output.
=== END FILE ===

=== FILE: .agent/checklists/preflight.md ===
# Preflight Checklist
- Open AGENTS.md and the applicable ExecPlan.
- Run `sh scripts/ledger.sh tail 30`.
- Run the relevant command from COMMANDS.md and record its sentinel.
- Inspect `git status --short` and the milestone change list.
- Record evidence, decisions, failures, and recovery in repository state.
- Do not claim success without observed output.
=== END FILE ===

=== FILE: .agent/checklists/production-readiness.md ===
# Production Readiness Checklist
- Open AGENTS.md and the applicable ExecPlan.
- Run `sh scripts/ledger.sh tail 30`.
- Run the relevant command from COMMANDS.md and record its sentinel.
- Inspect `git status --short` and the milestone change list.
- Record evidence, decisions, failures, and recovery in repository state.
- Do not claim success without observed output.
=== END FILE ===

=== FILE: .agent/checklists/release.md ===
# Release Checklist
- Open AGENTS.md and the applicable ExecPlan.
- Run `sh scripts/ledger.sh tail 30`.
- Run the relevant command from COMMANDS.md and record its sentinel.
- Inspect `git status --short` and the milestone change list.
- Record evidence, decisions, failures, and recovery in repository state.
- Do not claim success without observed output.
=== END FILE ===

=== FILE: .agent/checklists/rollback.md ===
# Rollback Checklist
- Open AGENTS.md and the applicable ExecPlan.
- Run `sh scripts/ledger.sh tail 30`.
- Run the relevant command from COMMANDS.md and record its sentinel.
- Inspect `git status --short` and the milestone change list.
- Record evidence, decisions, failures, and recovery in repository state.
- Do not claim success without observed output.
=== END FILE ===

=== FILE: .agent/checklists/validation.md ===
# Validation Checklist
- Open AGENTS.md and the applicable ExecPlan.
- Run `sh scripts/ledger.sh tail 30`.
- Run the relevant command from COMMANDS.md and record its sentinel.
- Inspect `git status --short` and the milestone change list.
- Record evidence, decisions, failures, and recovery in repository state.
- Do not claim success without observed output.
=== END FILE ===

=== FILE: .agent/execplans/EP-000-discovery-and-toolchain.md ===
NODE-META-BEGIN
ID: EP-000
DEPS: -
MAX_ATTEMPTS_PER_MILESTONE: 6
VERIFY: sh scripts/verify.sh
VERIFY_SENTINEL: verify: ok
GREEN_TAG: green/EP-000
NODE-META-END

# 1. Purpose / Big Picture
Verify toolchain, local real services, project structure, commands, and every external requirement before graph execution.

# 2. Scope
Only the capabilities and paths declared by this node and its linked specifications.

# 3. Non-goals
No unrelated refactors, speculative integrations, production deployment, fabricated effects, or weakening of gates.

# 4. Context and Orientation
Read PROJECT_BRIEF.md, ARCHITECTURE.md, SECURITY.md, TESTING.md, and the relevant specs. Preserve INV-01 through INV-15.

# 5. Files to Read First
AGENTS.md; COMMANDS.md; .agent/GRAPH.md; .agent/LOOPS.md; PROJECT_BRIEF.md; ARCHITECTURE.md; SECURITY.md; TESTING.md.

# 6. Expected Changed Files
- COMMANDS.md
- ENVIRONMENT.md
- ASSUMPTIONS.md
- scripts/preflight.sh

# 7. Interfaces and Contracts
Use only vocabulary and contracts in SPEC-001, SPEC-002, SPEC-003, SPEC-005, and SPEC-006. Every external effect uses authorization, idempotency, receipt, reconciliation, and audit.

# 8. Milestones
### M1: Implement scoped capability
GOAL: Complete the node's implement scoped capability with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-000-discovery-and-toolchain.md
CHANGE: COMMANDS.md ENVIRONMENT.md ASSUMPTIONS.md scripts/preflight.sh
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-000 MILESTONE_PASS "M1 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-000][M1] implement scoped capability"

### M2: Verify real behavior
GOAL: Complete the node's verify real behavior with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-000-discovery-and-toolchain.md
CHANGE: COMMANDS.md ENVIRONMENT.md ASSUMPTIONS.md scripts/preflight.sh
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-000 MILESTONE_PASS "M2 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-000][M2] verify real behavior"

### M3: Harden and document
GOAL: Complete the node's harden and document with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-000-discovery-and-toolchain.md
CHANGE: COMMANDS.md ENVIRONMENT.md ASSUMPTIONS.md scripts/preflight.sh
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-000 MILESTONE_PASS "M3 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-000][M3] harden and document"

# 9. Validation and Acceptance
Run node verification, expected-files audit, scope diff, and relevant live-fire proofs. Observe the sentinel in the current session.

# 10. Idempotence and Recovery
Re-enter from the last milestone commit. Read ledger and progress. Re-run the last sentinel. Use the bounded ladder and rollback without crossing a green tag.

# 11. Progress
- [ ] M1 complete with evidence and commit.
- [ ] M2 complete with evidence and commit.
- [ ] M3 complete with evidence and commit.

# 12. Surprises & Discoveries
Append dated evidence only.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.
=== END FILE ===

=== FILE: .agent/execplans/EP-001-foundation.md ===
NODE-META-BEGIN
ID: EP-001
DEPS: EP-000
MAX_ATTEMPTS_PER_MILESTONE: 6
VERIFY: sh scripts/verify.sh
VERIFY_SENTINEL: verify: ok
GREEN_TAG: green/EP-001
NODE-META-END

# 1. Purpose / Big Picture
Establish the monorepo, pinned dependencies, local infrastructure, ci, configuration validation, and accessible application shell.

# 2. Scope
Only the capabilities and paths declared by this node and its linked specifications.

# 3. Non-goals
No unrelated refactors, speculative integrations, production deployment, fabricated effects, or weakening of gates.

# 4. Context and Orientation
Read PROJECT_BRIEF.md, ARCHITECTURE.md, SECURITY.md, TESTING.md, and the relevant specs. Preserve INV-01 through INV-15.

# 5. Files to Read First
AGENTS.md; COMMANDS.md; .agent/GRAPH.md; .agent/LOOPS.md; PROJECT_BRIEF.md; ARCHITECTURE.md; SECURITY.md; TESTING.md.

# 6. Expected Changed Files
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- docker-compose.yml
- apps/api
- apps/web
- apps/worker
- .github/workflows/ci.yml

# 7. Interfaces and Contracts
Use only vocabulary and contracts in SPEC-001, SPEC-002, SPEC-003, SPEC-005, and SPEC-006. Every external effect uses authorization, idempotency, receipt, reconciliation, and audit.

# 8. Milestones
### M1: Implement scoped capability
GOAL: Complete the node's implement scoped capability with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-001-foundation.md
CHANGE: package.json pnpm-lock.yaml pnpm-workspace.yaml docker-compose.yml apps/api apps/web apps/worker .github/workflows/ci.yml
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-001 MILESTONE_PASS "M1 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-001][M1] implement scoped capability"

### M2: Verify real behavior
GOAL: Complete the node's verify real behavior with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-001-foundation.md
CHANGE: package.json pnpm-lock.yaml pnpm-workspace.yaml docker-compose.yml apps/api apps/web apps/worker .github/workflows/ci.yml
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-001 MILESTONE_PASS "M2 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-001][M2] verify real behavior"

### M3: Harden and document
GOAL: Complete the node's harden and document with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-001-foundation.md
CHANGE: package.json pnpm-lock.yaml pnpm-workspace.yaml docker-compose.yml apps/api apps/web apps/worker .github/workflows/ci.yml
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-001 MILESTONE_PASS "M3 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-001][M3] harden and document"

# 9. Validation and Acceptance
Run node verification, expected-files audit, scope diff, and relevant live-fire proofs. Observe the sentinel in the current session.

# 10. Idempotence and Recovery
Re-enter from the last milestone commit. Read ledger and progress. Re-run the last sentinel. Use the bounded ladder and rollback without crossing a green tag.

# 11. Progress
- [ ] M1 complete with evidence and commit.
- [ ] M2 complete with evidence and commit.
- [ ] M3 complete with evidence and commit.

# 12. Surprises & Discoveries
Append dated evidence only.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.
=== END FILE ===

=== FILE: .agent/execplans/EP-002-core-domain.md ===
NODE-META-BEGIN
ID: EP-002
DEPS: EP-001
MAX_ATTEMPTS_PER_MILESTONE: 6
VERIFY: sh scripts/verify.sh
VERIFY_SENTINEL: verify: ok
GREEN_TAG: green/EP-002
NODE-META-END

# 1. Purpose / Big Picture
Implement family continuity entities, deterministic readiness rules, packet compartmentalization, helper grants, emergency policy state machine, and invariants.

# 2. Scope
Only the capabilities and paths declared by this node and its linked specifications.

# 3. Non-goals
No unrelated refactors, speculative integrations, production deployment, fabricated effects, or weakening of gates.

# 4. Context and Orientation
Read PROJECT_BRIEF.md, ARCHITECTURE.md, SECURITY.md, TESTING.md, and the relevant specs. Preserve INV-01 through INV-15.

# 5. Files to Read First
AGENTS.md; COMMANDS.md; .agent/GRAPH.md; .agent/LOOPS.md; PROJECT_BRIEF.md; ARCHITECTURE.md; SECURITY.md; TESTING.md.

# 6. Expected Changed Files
- packages/domain
- packages/contracts
- tests/unit

# 7. Interfaces and Contracts
Use only vocabulary and contracts in SPEC-001, SPEC-002, SPEC-003, SPEC-005, and SPEC-006. Every external effect uses authorization, idempotency, receipt, reconciliation, and audit.

# 8. Milestones
### M1: Implement scoped capability
GOAL: Complete the node's implement scoped capability with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-002-core-domain.md
CHANGE: packages/domain packages/contracts tests/unit
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-002 MILESTONE_PASS "M1 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-002][M1] implement scoped capability"

### M2: Verify real behavior
GOAL: Complete the node's verify real behavior with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-002-core-domain.md
CHANGE: packages/domain packages/contracts tests/unit
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-002 MILESTONE_PASS "M2 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-002][M2] verify real behavior"

### M3: Harden and document
GOAL: Complete the node's harden and document with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-002-core-domain.md
CHANGE: packages/domain packages/contracts tests/unit
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-002 MILESTONE_PASS "M3 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-002][M3] harden and document"

# 9. Validation and Acceptance
Run node verification, expected-files audit, scope diff, and relevant live-fire proofs. Observe the sentinel in the current session.

# 10. Idempotence and Recovery
Re-enter from the last milestone commit. Read ledger and progress. Re-run the last sentinel. Use the bounded ladder and rollback without crossing a green tag.

# 11. Progress
- [ ] M1 complete with evidence and commit.
- [ ] M2 complete with evidence and commit.
- [ ] M3 complete with evidence and commit.

# 12. Surprises & Discoveries
Append dated evidence only.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.
=== END FILE ===

=== FILE: .agent/execplans/EP-003-data-and-persistence.md ===
NODE-META-BEGIN
ID: EP-003
DEPS: EP-002
MAX_ATTEMPTS_PER_MILESTONE: 6
VERIFY: sh scripts/verify.sh
VERIFY_SENTINEL: verify: ok
GREEN_TAG: green/EP-003
NODE-META-END

# 1. Purpose / Big Picture
Implement rls schema, migrations, encrypted restricted fields, immutable evidence, packet manifests, outbox/inbox, and real postgresql tests.

# 2. Scope
Only the capabilities and paths declared by this node and its linked specifications.

# 3. Non-goals
No unrelated refactors, speculative integrations, production deployment, fabricated effects, or weakening of gates.

# 4. Context and Orientation
Read PROJECT_BRIEF.md, ARCHITECTURE.md, SECURITY.md, TESTING.md, and the relevant specs. Preserve INV-01 through INV-15.

# 5. Files to Read First
AGENTS.md; COMMANDS.md; .agent/GRAPH.md; .agent/LOOPS.md; PROJECT_BRIEF.md; ARCHITECTURE.md; SECURITY.md; TESTING.md.

# 6. Expected Changed Files
- packages/infrastructure/database
- migrations
- tests/integration

# 7. Interfaces and Contracts
Use only vocabulary and contracts in SPEC-001, SPEC-002, SPEC-003, SPEC-005, and SPEC-006. Every external effect uses authorization, idempotency, receipt, reconciliation, and audit.

# 8. Milestones
### M1: Implement scoped capability
GOAL: Complete the node's implement scoped capability with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-003-data-and-persistence.md
CHANGE: packages/infrastructure/database migrations tests/integration
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-003 MILESTONE_PASS "M1 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-003][M1] implement scoped capability"

### M2: Verify real behavior
GOAL: Complete the node's verify real behavior with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-003-data-and-persistence.md
CHANGE: packages/infrastructure/database migrations tests/integration
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-003 MILESTONE_PASS "M2 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-003][M2] verify real behavior"

### M3: Harden and document
GOAL: Complete the node's harden and document with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-003-data-and-persistence.md
CHANGE: packages/infrastructure/database migrations tests/integration
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-003 MILESTONE_PASS "M3 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-003][M3] harden and document"

# 9. Validation and Acceptance
Run node verification, expected-files audit, scope diff, and relevant live-fire proofs. Observe the sentinel in the current session.

# 10. Idempotence and Recovery
Re-enter from the last milestone commit. Read ledger and progress. Re-run the last sentinel. Use the bounded ladder and rollback without crossing a green tag.

# 11. Progress
- [ ] M1 complete with evidence and commit.
- [ ] M2 complete with evidence and commit.
- [ ] M3 complete with evidence and commit.

# 12. Surprises & Discoveries
Append dated evidence only.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.
=== END FILE ===

=== FILE: .agent/execplans/EP-004-api-or-service-layer.md ===
NODE-META-BEGIN
ID: EP-004
DEPS: EP-003
MAX_ATTEMPTS_PER_MILESTONE: 6
VERIFY: sh scripts/verify.sh
VERIFY_SENTINEL: verify: ok
GREEN_TAG: green/EP-004
NODE-META-END

# 1. Purpose / Big Picture
Implement all versioned api contracts, orchestration, packet generation, readiness evaluation, access requests, challenge, denial, release, exports, and privacy workflows.

# 2. Scope
Only the capabilities and paths declared by this node and its linked specifications.

# 3. Non-goals
No unrelated refactors, speculative integrations, production deployment, fabricated effects, or weakening of gates.

# 4. Context and Orientation
Read PROJECT_BRIEF.md, ARCHITECTURE.md, SECURITY.md, TESTING.md, and the relevant specs. Preserve INV-01 through INV-15.

# 5. Files to Read First
AGENTS.md; COMMANDS.md; .agent/GRAPH.md; .agent/LOOPS.md; PROJECT_BRIEF.md; ARCHITECTURE.md; SECURITY.md; TESTING.md.

# 6. Expected Changed Files
- apps/api
- packages/application
- tests/contract

# 7. Interfaces and Contracts
Use only vocabulary and contracts in SPEC-001, SPEC-002, SPEC-003, SPEC-005, and SPEC-006. Every external effect uses authorization, idempotency, receipt, reconciliation, and audit.

# 8. Milestones
### M1: Implement scoped capability
GOAL: Complete the node's implement scoped capability with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-004-api-or-service-layer.md
CHANGE: apps/api packages/application tests/contract
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-004 MILESTONE_PASS "M1 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-004][M1] implement scoped capability"

### M2: Verify real behavior
GOAL: Complete the node's verify real behavior with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-004-api-or-service-layer.md
CHANGE: apps/api packages/application tests/contract
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-004 MILESTONE_PASS "M2 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-004][M2] verify real behavior"

### M3: Harden and document
GOAL: Complete the node's harden and document with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-004-api-or-service-layer.md
CHANGE: apps/api packages/application tests/contract
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-004 MILESTONE_PASS "M3 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-004][M3] harden and document"

# 9. Validation and Acceptance
Run node verification, expected-files audit, scope diff, and relevant live-fire proofs. Observe the sentinel in the current session.

# 10. Idempotence and Recovery
Re-enter from the last milestone commit. Read ledger and progress. Re-run the last sentinel. Use the bounded ladder and rollback without crossing a green tag.

# 11. Progress
- [ ] M1 complete with evidence and commit.
- [ ] M2 complete with evidence and commit.
- [ ] M3 complete with evidence and commit.

# 12. Surprises & Discoveries
Append dated evidence only.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.
=== END FILE ===

=== FILE: .agent/execplans/EP-005-user-interface-or-client.md ===
NODE-META-BEGIN
ID: EP-005
DEPS: EP-004
MAX_ATTEMPTS_PER_MILESTONE: 6
VERIFY: sh scripts/verify.sh
VERIFY_SENTINEL: verify: ok
GREEN_TAG: green/EP-005
NODE-META-END

# 1. Purpose / Big Picture
Implement the one-afternoon onboarding, readiness dashboard, family iq, people and asset inventories, playbooks, messages, packets, helper access, emergency policy, annual review, and privacy ui.

# 2. Scope
Only the capabilities and paths declared by this node and its linked specifications.

# 3. Non-goals
No unrelated refactors, speculative integrations, production deployment, fabricated effects, or weakening of gates.

# 4. Context and Orientation
Read PROJECT_BRIEF.md, ARCHITECTURE.md, SECURITY.md, TESTING.md, and the relevant specs. Preserve INV-01 through INV-15.

# 5. Files to Read First
AGENTS.md; COMMANDS.md; .agent/GRAPH.md; .agent/LOOPS.md; PROJECT_BRIEF.md; ARCHITECTURE.md; SECURITY.md; TESTING.md.

# 6. Expected Changed Files
- apps/web
- packages/ui
- tests/e2e

# 7. Interfaces and Contracts
Use only vocabulary and contracts in SPEC-001, SPEC-002, SPEC-003, SPEC-005, and SPEC-006. Every external effect uses authorization, idempotency, receipt, reconciliation, and audit.

# 8. Milestones
### M1: Implement scoped capability
GOAL: Complete the node's implement scoped capability with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-005-user-interface-or-client.md
CHANGE: apps/web packages/ui tests/e2e
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-005 MILESTONE_PASS "M1 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-005][M1] implement scoped capability"

### M2: Verify real behavior
GOAL: Complete the node's verify real behavior with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-005-user-interface-or-client.md
CHANGE: apps/web packages/ui tests/e2e
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-005 MILESTONE_PASS "M2 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-005][M2] verify real behavior"

### M3: Harden and document
GOAL: Complete the node's harden and document with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-005-user-interface-or-client.md
CHANGE: apps/web packages/ui tests/e2e
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-005 MILESTONE_PASS "M3 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-005][M3] harden and document"

# 9. Validation and Acceptance
Run node verification, expected-files audit, scope diff, and relevant live-fire proofs. Observe the sentinel in the current session.

# 10. Idempotence and Recovery
Re-enter from the last milestone commit. Read ledger and progress. Re-run the last sentinel. Use the bounded ladder and rollback without crossing a green tag.

# 11. Progress
- [ ] M1 complete with evidence and commit.
- [ ] M2 complete with evidence and commit.
- [ ] M3 complete with evidence and commit.

# 12. Surprises & Discoveries
Append dated evidence only.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.
=== END FILE ===

=== FILE: .agent/execplans/EP-006-auth-security-and-permissions.md ===
NODE-META-BEGIN
ID: EP-006
DEPS: EP-004
MAX_ATTEMPTS_PER_MILESTONE: 6
VERIFY: sh scripts/verify.sh
VERIFY_SENTINEL: verify: ok
GREEN_TAG: green/EP-006
NODE-META-END

# 1. Purpose / Big Picture
Implement passkeys, password fallback, totp, step-up authentication, tenant and packet authorization, safe uploads, dlp, support access, and emergency-release defenses.

# 2. Scope
Only the capabilities and paths declared by this node and its linked specifications.

# 3. Non-goals
No unrelated refactors, speculative integrations, production deployment, fabricated effects, or weakening of gates.

# 4. Context and Orientation
Read PROJECT_BRIEF.md, ARCHITECTURE.md, SECURITY.md, TESTING.md, and the relevant specs. Preserve INV-01 through INV-15.

# 5. Files to Read First
AGENTS.md; COMMANDS.md; .agent/GRAPH.md; .agent/LOOPS.md; PROJECT_BRIEF.md; ARCHITECTURE.md; SECURITY.md; TESTING.md.

# 6. Expected Changed Files
- packages/infrastructure/auth
- packages/infrastructure/ai-gateway
- packages/infrastructure/security
- tests/security

# 7. Interfaces and Contracts
Use only vocabulary and contracts in SPEC-001, SPEC-002, SPEC-003, SPEC-005, and SPEC-006. Every external effect uses authorization, idempotency, receipt, reconciliation, and audit.

# 8. Milestones
### M1: Implement scoped capability
GOAL: Complete the node's implement scoped capability with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-006-auth-security-and-permissions.md
CHANGE: packages/infrastructure/auth packages/infrastructure/ai-gateway packages/infrastructure/security tests/security
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-006 MILESTONE_PASS "M1 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-006][M1] implement scoped capability"

### M2: Verify real behavior
GOAL: Complete the node's verify real behavior with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-006-auth-security-and-permissions.md
CHANGE: packages/infrastructure/auth packages/infrastructure/ai-gateway packages/infrastructure/security tests/security
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-006 MILESTONE_PASS "M2 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-006][M2] verify real behavior"

### M3: Harden and document
GOAL: Complete the node's harden and document with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-006-auth-security-and-permissions.md
CHANGE: packages/infrastructure/auth packages/infrastructure/ai-gateway packages/infrastructure/security tests/security
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-006 MILESTONE_PASS "M3 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-006][M3] harden and document"

# 9. Validation and Acceptance
Run node verification, expected-files audit, scope diff, and relevant live-fire proofs. Observe the sentinel in the current session.

# 10. Idempotence and Recovery
Re-enter from the last milestone commit. Read ledger and progress. Re-run the last sentinel. Use the bounded ladder and rollback without crossing a green tag.

# 11. Progress
- [ ] M1 complete with evidence and commit.
- [ ] M2 complete with evidence and commit.
- [ ] M3 complete with evidence and commit.

# 12. Surprises & Discoveries
Append dated evidence only.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.
=== END FILE ===

=== FILE: .agent/execplans/EP-007-testing-hardening.md ===
NODE-META-BEGIN
ID: EP-007
DEPS: EP-005,EP-006
MAX_ATTEMPTS_PER_MILESTONE: 6
VERIFY: sh scripts/verify.sh
VERIFY_SENTINEL: verify: ok
GREEN_TAG: green/EP-007
NODE-META-END

# 1. Purpose / Big Picture
Complete unit, property, integration, e2e, accessibility, security, privacy, performance, failure-mode, and fourteen live-fire proofs.

# 2. Scope
Only the capabilities and paths declared by this node and its linked specifications.

# 3. Non-goals
No unrelated refactors, speculative integrations, production deployment, fabricated effects, or weakening of gates.

# 4. Context and Orientation
Read PROJECT_BRIEF.md, ARCHITECTURE.md, SECURITY.md, TESTING.md, and the relevant specs. Preserve INV-01 through INV-15.

# 5. Files to Read First
AGENTS.md; COMMANDS.md; .agent/GRAPH.md; .agent/LOOPS.md; PROJECT_BRIEF.md; ARCHITECTURE.md; SECURITY.md; TESTING.md.

# 6. Expected Changed Files
- tests
- scripts/live-fire.sh
- scripts/verify.sh

# 7. Interfaces and Contracts
Use only vocabulary and contracts in SPEC-001, SPEC-002, SPEC-003, SPEC-005, and SPEC-006. Every external effect uses authorization, idempotency, receipt, reconciliation, and audit.

# 8. Milestones
### M1: Implement scoped capability
GOAL: Complete the node's implement scoped capability with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-007-testing-hardening.md
CHANGE: tests scripts/live-fire.sh scripts/verify.sh
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-007 MILESTONE_PASS "M1 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-007][M1] implement scoped capability"

### M2: Verify real behavior
GOAL: Complete the node's verify real behavior with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-007-testing-hardening.md
CHANGE: tests scripts/live-fire.sh scripts/verify.sh
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-007 MILESTONE_PASS "M2 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-007][M2] verify real behavior"

### M3: Harden and document
GOAL: Complete the node's harden and document with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-007-testing-hardening.md
CHANGE: tests scripts/live-fire.sh scripts/verify.sh
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-007 MILESTONE_PASS "M3 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-007][M3] harden and document"

# 9. Validation and Acceptance
Run node verification, expected-files audit, scope diff, and relevant live-fire proofs. Observe the sentinel in the current session.

# 10. Idempotence and Recovery
Re-enter from the last milestone commit. Read ledger and progress. Re-run the last sentinel. Use the bounded ladder and rollback without crossing a green tag.

# 11. Progress
- [ ] M1 complete with evidence and commit.
- [ ] M2 complete with evidence and commit.
- [ ] M3 complete with evidence and commit.

# 12. Surprises & Discoveries
Append dated evidence only.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.
=== END FILE ===

=== FILE: .agent/execplans/EP-008-observability-and-operations.md ===
NODE-META-BEGIN
ID: EP-008
DEPS: EP-007
MAX_ATTEMPTS_PER_MILESTONE: 6
VERIFY: sh scripts/verify.sh
VERIFY_SENTINEL: verify: ok
GREEN_TAG: green/EP-008
NODE-META-END

# 1. Purpose / Big Picture
Implement privacy-safe logs, metrics, traces, alerts, challenge monitoring, release audit, backup, restore, deletion, incident, and support runbooks.

# 2. Scope
Only the capabilities and paths declared by this node and its linked specifications.

# 3. Non-goals
No unrelated refactors, speculative integrations, production deployment, fabricated effects, or weakening of gates.

# 4. Context and Orientation
Read PROJECT_BRIEF.md, ARCHITECTURE.md, SECURITY.md, TESTING.md, and the relevant specs. Preserve INV-01 through INV-15.

# 5. Files to Read First
AGENTS.md; COMMANDS.md; .agent/GRAPH.md; .agent/LOOPS.md; PROJECT_BRIEF.md; ARCHITECTURE.md; SECURITY.md; TESTING.md.

# 6. Expected Changed Files
- packages/infrastructure/observability
- OPERATIONS.md
- OBSERVABILITY.md

# 7. Interfaces and Contracts
Use only vocabulary and contracts in SPEC-001, SPEC-002, SPEC-003, SPEC-005, and SPEC-006. Every external effect uses authorization, idempotency, receipt, reconciliation, and audit.

# 8. Milestones
### M1: Implement scoped capability
GOAL: Complete the node's implement scoped capability with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-008-observability-and-operations.md
CHANGE: packages/infrastructure/observability OPERATIONS.md OBSERVABILITY.md
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-008 MILESTONE_PASS "M1 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-008][M1] implement scoped capability"

### M2: Verify real behavior
GOAL: Complete the node's verify real behavior with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-008-observability-and-operations.md
CHANGE: packages/infrastructure/observability OPERATIONS.md OBSERVABILITY.md
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-008 MILESTONE_PASS "M2 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-008][M2] verify real behavior"

### M3: Harden and document
GOAL: Complete the node's harden and document with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-008-observability-and-operations.md
CHANGE: packages/infrastructure/observability OPERATIONS.md OBSERVABILITY.md
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-008 MILESTONE_PASS "M3 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-008][M3] harden and document"

# 9. Validation and Acceptance
Run node verification, expected-files audit, scope diff, and relevant live-fire proofs. Observe the sentinel in the current session.

# 10. Idempotence and Recovery
Re-enter from the last milestone commit. Read ledger and progress. Re-run the last sentinel. Use the bounded ladder and rollback without crossing a green tag.

# 11. Progress
- [ ] M1 complete with evidence and commit.
- [ ] M2 complete with evidence and commit.
- [ ] M3 complete with evidence and commit.

# 12. Surprises & Discoveries
Append dated evidence only.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.
=== END FILE ===

=== FILE: .agent/execplans/EP-009-deployment-and-release.md ===
NODE-META-BEGIN
ID: EP-009
DEPS: EP-008
MAX_ATTEMPTS_PER_MILESTONE: 6
VERIFY: sh scripts/verify.sh
VERIFY_SENTINEL: verify: ok
GREEN_TAG: green/EP-009
NODE-META-END

# 1. Purpose / Big Picture
Produce container images, infrastructure configuration, staging workflow, migration and rollback automation, production manifests, and a proven manual release path.

# 2. Scope
Only the capabilities and paths declared by this node and its linked specifications.

# 3. Non-goals
No unrelated refactors, speculative integrations, production deployment, fabricated effects, or weakening of gates.

# 4. Context and Orientation
Read PROJECT_BRIEF.md, ARCHITECTURE.md, SECURITY.md, TESTING.md, and the relevant specs. Preserve INV-01 through INV-15.

# 5. Files to Read First
AGENTS.md; COMMANDS.md; .agent/GRAPH.md; .agent/LOOPS.md; PROJECT_BRIEF.md; ARCHITECTURE.md; SECURITY.md; TESTING.md.

# 6. Expected Changed Files
- Dockerfile
- infrastructure
- .github/workflows
- DEPLOYMENT.md
- ROLLBACK.md

# 7. Interfaces and Contracts
Use only vocabulary and contracts in SPEC-001, SPEC-002, SPEC-003, SPEC-005, and SPEC-006. Every external effect uses authorization, idempotency, receipt, reconciliation, and audit.

# 8. Milestones
### M1: Implement scoped capability
GOAL: Complete the node's implement scoped capability with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-009-deployment-and-release.md
CHANGE: Dockerfile infrastructure .github/workflows DEPLOYMENT.md ROLLBACK.md
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-009 MILESTONE_PASS "M1 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-009][M1] implement scoped capability"

### M2: Verify real behavior
GOAL: Complete the node's verify real behavior with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-009-deployment-and-release.md
CHANGE: Dockerfile infrastructure .github/workflows DEPLOYMENT.md ROLLBACK.md
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-009 MILESTONE_PASS "M2 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-009][M2] verify real behavior"

### M3: Harden and document
GOAL: Complete the node's harden and document with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-009-deployment-and-release.md
CHANGE: Dockerfile infrastructure .github/workflows DEPLOYMENT.md ROLLBACK.md
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-009 MILESTONE_PASS "M3 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-009][M3] harden and document"

# 9. Validation and Acceptance
Run node verification, expected-files audit, scope diff, and relevant live-fire proofs. Observe the sentinel in the current session.

# 10. Idempotence and Recovery
Re-enter from the last milestone commit. Read ledger and progress. Re-run the last sentinel. Use the bounded ladder and rollback without crossing a green tag.

# 11. Progress
- [ ] M1 complete with evidence and commit.
- [ ] M2 complete with evidence and commit.
- [ ] M3 complete with evidence and commit.

# 12. Surprises & Discoveries
Append dated evidence only.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.
=== END FILE ===

=== FILE: .agent/execplans/EP-010-production-readiness-and-ship.md ===
NODE-META-BEGIN
ID: EP-010
DEPS: EP-009
MAX_ATTEMPTS_PER_MILESTONE: 6
VERIFY: sh scripts/verify.sh
VERIFY_SENTINEL: verify: ok
GREEN_TAG: green/EP-010
NODE-META-END

# 1. Purpose / Big Picture
Run every gate from scratch, prove packet isolation and emergency release, complete legal and privacy reviews, perform backup and rollback drills, tag the release, and stop before manual production deployment.

# 2. Scope
Only the capabilities and paths declared by this node and its linked specifications.

# 3. Non-goals
No unrelated refactors, speculative integrations, production deployment, fabricated effects, or weakening of gates.

# 4. Context and Orientation
Read PROJECT_BRIEF.md, ARCHITECTURE.md, SECURITY.md, TESTING.md, and the relevant specs. Preserve INV-01 through INV-15.

# 5. Files to Read First
AGENTS.md; COMMANDS.md; .agent/GRAPH.md; .agent/LOOPS.md; PROJECT_BRIEF.md; ARCHITECTURE.md; SECURITY.md; TESTING.md.

# 6. Expected Changed Files
- PRODUCTION_READINESS.md
- RELEASE.md
- REMOTE_SESSION_HANDOFF.md

# 7. Interfaces and Contracts
Use only vocabulary and contracts in SPEC-001, SPEC-002, SPEC-003, SPEC-005, and SPEC-006. Every external effect uses authorization, idempotency, receipt, reconciliation, and audit.

# 8. Milestones
### M1: Implement scoped capability
GOAL: Complete the node's implement scoped capability with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-010-production-readiness-and-ship.md
CHANGE: PRODUCTION_READINESS.md RELEASE.md REMOTE_SESSION_HANDOFF.md
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-010 MILESTONE_PASS "M1 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-010][M1] implement scoped capability"

### M2: Verify real behavior
GOAL: Complete the node's verify real behavior with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-010-production-readiness-and-ship.md
CHANGE: PRODUCTION_READINESS.md RELEASE.md REMOTE_SESSION_HANDOFF.md
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-010 MILESTONE_PASS "M2 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-010][M2] verify real behavior"

### M3: Harden and document
GOAL: Complete the node's harden and document with observable evidence.
READ: AGENTS.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/execplans/EP-010-production-readiness-and-ship.md
CHANGE: PRODUCTION_READINESS.md RELEASE.md REMOTE_SESSION_HANDOFF.md
CONTENT: Implement the exact behavior and vocabulary in the linked specifications; do not create production stubs or unverified provider success.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append <AGENT_ID> EP-010 MILESTONE_PASS "M3 verify: ok"
FALLBACK: Use the smallest real local-service implementation or narrower provider adapter that preserves every safety invariant; never use a mock production path.
COMMIT: git add -A && git commit -m "[EP-010][M3] harden and document"

# 9. Validation and Acceptance
Run node verification, expected-files audit, scope diff, and relevant live-fire proofs. Observe the sentinel in the current session.

# 10. Idempotence and Recovery
Re-enter from the last milestone commit. Read ledger and progress. Re-run the last sentinel. Use the bounded ladder and rollback without crossing a green tag.

# 11. Progress
- [ ] M1 complete with evidence and commit.
- [ ] M2 complete with evidence and commit.
- [ ] M3 complete with evidence and commit.

# 12. Surprises & Discoveries
Append dated evidence only.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.
=== END FILE ===

=== FILE: .agent/prompts/continue-execplan.md ===
# Continue ExecPlan
Read Progress, Discoveries, Decision Log, and ledger tail. Re-run the last checked milestone sentinel, then resume the first unchecked milestone.
=== END FILE ===

=== FILE: .agent/prompts/debug-validation-failure.md ===
# Debug Validation Failure
Capture output and signature. Apply the bounded ladder in LOOPS.md. Never repeat a diff or weaken a gate.
=== END FILE ===

=== FILE: .agent/prompts/execute-active-execplan.md ===
# Execute Active ExecPlan
Read AGENTS.md, commands, graph, loops, ledger, and the named ExecPlan. Lease it, execute milestones exactly, verify, audit, commit, ledger, and tag.
=== END FILE ===

=== FILE: .agent/prompts/final-review.md ===
# Final Review
Run verify from scratch, reality, live-fire, expected-files audit, specification acceptance walk, security/privacy/accessibility/performance review, restore and rollback evidence, then report exact observed status.
=== END FILE ===

=== FILE: .agent/prompts/run-graph.md ===
PRIME-BLOCK-BEGIN
This repository is governed by a 6LAYER blueprint pack. AGENTS.md is the authoritative control plane; if anything here conflicts with AGENTS.md, AGENTS.md wins.
On every session start, execute THE BOOT SEQUENCE:
1. Read AGENTS.md fully. 2. Read COMMANDS.md. 3. Read .agent/GRAPH.md and .agent/LOOPS.md. 4. Run: sh scripts/ledger.sh tail 30. 5. Run: sh scripts/preflight.sh -- it MUST print "preflight: ok"; if it fails, report the exact missing items from PREFLIGHT.md and stop (this is the only legitimate pre-run stop). 6. Run: sh scripts/graph-next.sh and dispatch on its one-line output exactly as .agent/GRAPH.md specifies. 7. Repeat step 6 after every completed node until ALL_DONE, then run the ship gate in AGENTS.md.
Hard rules: do not ask the user questions; choose the smallest reversible option, record it, continue. Use only commands from COMMANDS.md. Never invent an API, route, table, flag, or env var -- verify in-repo or transcribe from the pack. One node at a time; milestones in order; commit after every milestone; append ledger events as .agent/LOOPS.md requires. Bounded retries per .agent/LOOPS.md -- never repeat a failed fix. No mocks, stubs, demo modes, or placeholder code in production paths; scripts/reality-gate.sh and scripts/live-fire.sh must genuinely pass. Never weaken a gate, skip a test, or claim an unrun result. Stop only at NODE_BLOCKED (with the full evidence report) or ALL_DONE.
PRIME-BLOCK-END
Run the boot sequence now and continue dispatching until ALL_DONE or NODE_BLOCKED. Your session ends only at RUN_COMPLETE or a blocked report.
=== END FILE ===

=== FILE: .agent/specs/SPEC-000-product-scope.md ===
# SPEC-000 Product Scope

TomorrowReady is a standalone family continuity SaaS. Required scope is defined by the fourteen live-fire outcomes in PROJECT_BRIEF.md. The product organizes verified facts, instructions, media, and recipient-specific packets for death, incapacity, hospitalization, disappearance, deployment, evacuation, or serious disruption.

Non-goals include legal advice, probate execution, password management, autonomous asset transfer, automatic death or incapacity determination, public memorials, emergency dispatch, posthumous voice cloning, face recognition, data brokerage, advertising, or release based solely on AI or one uploaded document.

Every user-facing capability must be private by default, accessible, evidence-backed, tenant-safe, and mapped to a live-fire proof.
=== END FILE ===

=== FILE: .agent/specs/SPEC-001-core-domain.md ===
# SPEC-001 Core Domain

## Locked entities
Tenant, Household, Person, Dependent, ChildProfile, Pet, Relationship, Membership, TrustedHelperGrant, ProfessionalContact, EmergencyContact, AccountLocator, AssetRecord, DebtRecord, InsurancePolicyRecord, PropertyRecord, StorageUnitRecord, DocumentLocation, SourceDocument, ExtractedCandidate, ConfirmedFact, HomePlaybook, ChildcarePlaybook, PetCarePlaybook, MedicalInformationPacket, FuneralWish, BusinessContinuityPlaybook, Letter, VideoMessage, AdviceItem, PhotoAsset, FamilyRecipe, EvidenceReference, ReadinessRuleVersion, ReadinessResult, FamilyIQGap, PacketDefinition, PacketManifest, PacketRecipient, EmergencyPolicy, AccessRequest, VerificationEvidence, Challenge, Denial, ReleaseAuthorization, ReleasedPacket, ConsentRecord, AnnualReview, PrivacyRequest, Export, AuditEvent, Subscription.

## Locked status vocabulary
Candidate facts: `EXTRACTED`, `CONFLICTED`, `CONFIRMED`, `REJECTED`, `STALE`.
Packets: `DRAFT`, `READY`, `ARMED`, `SUPERSEDED`, `REVOKED`.
Emergency requests: `REQUESTED`, `VERIFYING`, `CHALLENGE_ACTIVE`, `APPROVED_FOR_RELEASE`, `RELEASED`, `DENIED`, `EXPIRED`, `CANCELLED`, `MANUAL_REVIEW_REQUIRED`.
Media: `QUARANTINED`, `PROCESSING`, `READY_FOR_REVIEW`, `APPROVED`, `REJECTED`, `DELETED`.

## Core invariants
Use INV-01 through INV-15 from ARCHITECTURE.md. No unconfirmed extracted fact resolves a gap or enters a release packet. Every packet manifest is immutable after approval. Every release is recipient- and packet-scoped. AI cannot change domain authority.

## Acceptance
Unit and property tests exercise state machines, readiness rules, grants, packet isolation, challenge timing, denial, expiry, ambiguity, idempotency, and deletion without infrastructure leakage.
=== END FILE ===

=== FILE: .agent/specs/SPEC-002-data-model.md ===
# SPEC-002 Data Model

Every tenant-owned table includes `tenant_id`, opaque `id`, `created_at`, and where mutable `updated_at` plus `version`. Household-owned rows also include `household_id`. Restricted values use encrypted envelopes. PostgreSQL RLS denies missing tenant context.

Canonical tables include users, identities, tenants, households, memberships, people, dependents, children, pets, relationships, helper_grants, professional_contacts, emergency_contacts, account_locators, assets, debts, insurance_records, properties, storage_units, document_locations, documents, document_versions, extracted_candidates, confirmed_facts, playbooks, playbook_sections, funeral_wishes, letters, video_messages, advice_items, photos, recipes, evidence_references, readiness_rule_versions, readiness_results, family_iq_gaps, packet_definitions, packet_manifests, packet_manifest_items, packet_recipients, emergency_policies, access_requests, verification_evidence, challenges, denials, release_authorizations, released_packets, consents, annual_reviews, privacy_requests, exports, audit_events, outbox_events, inbox_events, jobs, subscriptions, and ai_usage.

Audit events, consent versions, verification evidence, release authorizations, released packet manifests, and original media references are append-only. Deletion uses tombstones, retention checks, asynchronous purge, and purge evidence. No table stores raw passwords, seed phrases, recovery codes, private keys, safe combinations, or full card data.
=== END FILE ===

=== FILE: .agent/specs/SPEC-003-api-contracts.md ===
# SPEC-003 API Contracts

All routes use `/v1`. Writes require schema validation, tenant and household context, authorization, audit, optimistic concurrency where applicable, and idempotency keys for repeatable effects.

Canonical route families are `auth`, `households`, `people`, `dependents`, `children`, `pets`, `contacts`, `helpers`, `accounts`, `assets`, `insurance`, `properties`, `storage-units`, `document-locations`, `documents`, `facts`, `playbooks`, `wishes`, `letters`, `videos`, `advice`, `photos`, `recipes`, `readiness`, `family-iq`, `packets`, `recipients`, `emergency-policies`, `access-requests`, `verifications`, `challenges`, `releases`, `annual-reviews`, `consents`, `exports`, `privacy`, `billing`, `audit`, `support`, and `health`.

The error envelope contains `code`, `message`, `request_id`, `retryable`, and `field_errors`. Release endpoints return explicit state and never imply success from notification delivery. Download URLs are short-lived and recipient-bound.
=== END FILE ===

=== FILE: .agent/specs/SPEC-004-ui-ux-behavior.md ===
# SPEC-004 UI and UX Behavior

The onboarding flow is designed to finish the core plan in one afternoon, using resumable 10-to-15-minute sections, automatic save, plain language, large controls, printable checklists, visible progress, and helper-assisted mode.

Primary navigation: Home, People, What We Own, Documents and Locations, Kids and Dependents, Pets, Home Playbook, Wishes and Messages, Packets, Trusted Helpers, Readiness, Annual Review, Privacy and Settings.

Home displays Family Readiness Score, unresolved Family IQ questions, stale records, packet status, annual review status, and a single next-best action. It must not use fear, countdown manipulation, or claims of complete protection.

Every packet screen shows recipient, purpose, included categories, excluded categories, release method, last test, and review date. Emergency policy screens explain challenge, verification, denial, expiry, and the fact that TomorrowReady does not determine legal death or incapacity.

All loading, empty, offline, failure, permission-denied, stale-data, ambiguous-provider, and manual-review states are explicit. WCAG 2.2 AA, keyboard operation, 200 percent zoom, screen-reader labels, non-color status, reduced motion, and printable workflows are required.
=== END FILE ===

=== FILE: .agent/specs/SPEC-005-auth-and-permissions.md ===
# SPEC-005 Authentication and Permissions

Roles are Owner, CoOwner, TrustedHelper, PacketRecipient, ProfessionalViewer, SupportAgent, and PlatformAdministrator. Deny by default. Roles do not grant content access without household, category, action, purpose, and time scope.

Passkeys are preferred; password fallback and TOTP MFA are supported. Step-up authentication is required for emergency-policy changes, recipient changes, full exports, restricted grants, release approval, and deletion.

Trusted helpers cannot self-expand grants. Packet recipients cannot enumerate household resources. Support access requires customer approval, reason, expiry, and full audit. Platform administration cannot read household content by default.

Permission tests enumerate every role, category, action, packet scope, expiry, revocation, and cross-tenant case.
=== END FILE ===

=== FILE: .agent/specs/SPEC-006-error-handling.md ===
# SPEC-006 Error Handling

Errors use stable codes and safe messages. Provider timeout, conflicting verification, failed notification, or uncertain release outcome is never mapped to success. Emergency ambiguity becomes `MANUAL_REVIEW_REQUIRED`.

Retries are bounded and idempotent. User interfaces distinguish retryable technical failure, denied authorization, expired challenge, stale record, recipient mismatch, malware rejection, AI-consent absence, prohibited-secret detection, and manual review.

Logs contain opaque identifiers and safe diagnostics, never packet contents, messages, child details, raw documents, raw AI prompts, or prohibited secrets.
=== END FILE ===

=== FILE: .agent/specs/SPEC-007-observability.md ===
# SPEC-007 Observability

Structured events include request_id, trace_id, tenant_id, household_id, actor_id, module, operation, result, latency_ms, provider, job_id, packet_id where authorized, and error_code. Never log content bodies.

Metrics cover authentication, authorization denials, cross-tenant attempts, uploads, malware results, extraction confirmation, readiness calculation, packet generation, release-state transitions, challenge timers, owner notifications, denials, manual reviews, downloads, revocations, AI cache tokens, AI cost, queue age, backups, restores, and deletion.

Alerts include unauthorized-release attempt, unusual recipient velocity, owner-notification failure during active challenge, packet isolation failure, repeated verification ambiguity, KMS failure, backup failure, purge failure, malware spike, and cross-tenant policy denial spike.
=== END FILE ===

=== FILE: .agent/specs/SPEC-008-production-readiness.md ===
# SPEC-008 Production Readiness

Production requires every live-fire proof LF-01 through LF-14, tenant and packet isolation, emergency-release property tests, owner-notification and denial tests, prohibited-secret DLP tests, AI boundary tests, minor-data review, accessibility, performance, backup and restore, deletion proof, incident drill, rollback drill, legal approval, vendor review, cyber/E&O insurance evidence, production KMS, and manual deploy authorization.

No engineering convenience may mark legal authority, release verification, consent, provider success, or production readiness complete without real evidence.
=== END FILE ===

=== FILE: .agent/templates/adr-template.md ===
# ADR Template
Status; context; options; decision; consequences; evidence; affected files; rollback.
=== END FILE ===

=== FILE: .agent/templates/execplan-template.md ===
# ExecPlan Template
Machine metadata; Purpose; Scope; Non-goals; Context; Files to Read; Expected Changed Files; Interfaces; Milestones; Validation; Recovery; Progress; Discoveries; Decision Log; Retrospective.
=== END FILE ===

=== FILE: .agent/templates/runbook-template.md ===
# Runbook Template
Signal; impact; safety; diagnostics; mitigation; verification; rollback; escalation; follow-up.
=== END FILE ===

=== FILE: .agent/templates/spec-template.md ===
# Specification Template
Purpose; actors; vocabulary; preconditions; behaviors; errors; security; privacy; accessibility; observability; tests; acceptance.
=== END FILE ===

=== FILE: .agent/templates/test-case-template.md ===
# Test Case Template
ID; requirement; setup; real dependencies; action; expected result; cleanup; evidence.
=== END FILE ===

=== FILE: .gitignore ===
.env
.env.*
!.env.example
node_modules/
.next/
dist/
coverage/
playwright-report/
test-results/
.agent/state/*.log
.agent/state/*.pid
*.local
.DS_Store
=== END FILE ===

=== FILE: AI_PROCESSING_NOTICE.md ===
# AI Processing Notice

TomorrowReady can operate without external AI for core storage, editing, packet configuration, deterministic readiness scoring, and emergency-policy evaluation. When a user enables AI, the product may send minimized and redacted content to an approved model provider for classification, extraction suggestions, gap explanations, summaries, drafting, or transcription assistance.

AI never determines death, incapacity, guardianship, ownership, authority, readiness completion, or emergency release. Results are suggestions until confirmed. Prohibited secrets are blocked. Raw prompts and outputs are not placed in ordinary logs. Customer content is not used by TomorrowReady to train general-purpose models.

Before production enablement, the interface must disclose provider, purpose, categories, processing regions, retention, training terms, subprocessors, transfer mechanism, opt-out effects, and deletion limitations based on current signed and public terms. Consent is versioned and withdrawable for future processing.
=== END FILE ===

=== FILE: ARCHITECTURE.md ===
# TomorrowReady Architecture

## Purpose
Define a low-cost, scalable, security-first architecture for a standalone family continuity SaaS serving at least 1,000 household profiles and scaling horizontally without a rewrite.

## System overview
A Next.js web application communicates with a Fastify modular monolith. PostgreSQL is authoritative. Valkey provides queues, distributed locks, rate limits, and disposable cache. Private S3-compatible object storage holds quarantined uploads, immutable originals, approved media, packet artifacts, and encrypted exports. Workers run malware scanning, normalization, extraction, media processing, reminder jobs, packet generation, release notifications, and deletion. A dedicated Emergency Release Service evaluates deterministic policy; AI never decides release.

## Repository map
- `apps/web`: accessible household, helper, recipient, and support user interfaces.
- `apps/api`: HTTP boundary, authentication, tenant context, authorization, orchestration, webhook validation.
- `apps/worker`: resumable document, media, notification, packet, release, export, and purge jobs.
- `apps/report-renderer`: deterministic PDF and printable binder rendering.
- `packages/domain`: pure entities, state machines, value objects, readiness rules, release rules.
- `packages/application`: use cases and provider ports.
- `packages/infrastructure`: PostgreSQL, storage, email, SMS, AI, transcription, billing, KMS, and print adapters.
- `packages/contracts`: locked schemas, routes, events, and error envelopes.
- `packages/ui`: accessible components and design tokens.

## Code import law
1. Domain imports no framework, database, network, filesystem, UI, or model-provider code.
2. Application imports domain and declared ports only.
3. Infrastructure implements ports and may import application contracts, never UI.
4. API and workers compose application and infrastructure.
5. Web consumes contracts and API clients, never persistence modules.
6. Emergency release rules live in domain code and cannot import AI or provider implementations.
7. Cross-tenant queries are forbidden outside narrowly scoped, audited platform-administration services.

## Core modules
Identity; Household; People; Dependents; Children; Guardians and Caregivers; Pets; Trusted Helpers; Professional Contacts; Account and Asset Inventory; Insurance; Debts; Property; Storage Units; Document Locations; Home Operations; Child Continuity; Pet Continuity; Medical Information; Funeral Wishes; Business Continuity; Letters; Videos; Advice; Photos; Recipes; Evidence; Family Readiness Score; Family IQ; Packets; Packet Recipients; Emergency Policies; Access Requests; Verification; Challenge and Denial; Release Evidence; Annual Review; Consent; Privacy Requests; Exports; Billing; AI Gateway; Audit; Support Administration.

## Authoritative data model
PostgreSQL stores confirmed facts, statuses, recipient scopes, policy versions, consent, approvals, access events, evidence, and immutable audit references. Object storage holds bytes. Valkey is never authoritative. AI output is always a suggestion or generated artifact, never authority.

## Emergency access state machine
`DRAFT -> ARMED -> REQUESTED -> VERIFYING -> CHALLENGE_ACTIVE -> APPROVED_FOR_RELEASE -> RELEASED | DENIED | EXPIRED | CANCELLED | MANUAL_REVIEW_REQUIRED`.

Transitions require explicit policy predicates. `APPROVED_FOR_RELEASE` requires the configured verification threshold, an unexpired challenge period, no owner denial, no unresolved takeover signal, recipient identity verification, and packet-scope match. A provider timeout or conflicting evidence becomes `MANUAL_REVIEW_REQUIRED`, never success.

## Packet compartmentalization
Each packet has one purpose, explicit content selectors, one or more recipients, visibility rules, release policy, review date, and immutable manifest version. The default packet contains no raw passwords or authentication secrets. A childcare recipient cannot infer or enumerate financial or executor packets. Object paths, database queries, cache keys, notifications, exports, and audit views enforce packet and tenant boundaries.

## AI boundary
All model calls pass through `packages/infrastructure/ai-gateway`. The gateway checks AI consent, classifies data, blocks prohibited secrets, pseudonymizes where possible, constructs stable prompt prefixes, validates structured output, records cache and cost metrics, and attaches evidence references. Allowed uses include interview phrasing, gap explanations, plain-language summaries, classification, drafting letters, and recipe transcription. Prohibited uses include release decisions, legal authority determinations, incapacity or death determinations, guardianship advice, secret storage, and unverified claims presented as fact.

## Family Readiness Score
The score is deterministic and versioned. It uses confirmed completion, review freshness, recipient coverage, policy readiness, packet test status, and missing critical categories. AI may explain the score but cannot calculate or alter it. Weight changes require a versioned decision, migration, test vectors, and disclosure.

## Family IQ gap analysis
A deterministic rules engine asks what a successor would need to operate the household. It generates category-specific gaps such as water shutoff location, school contact, pet medication, storage-unit access location, adviser identity, insurance carrier, document location, and packet recipient. AI may rephrase questions but cannot mark a gap resolved.

## Media and message integrity
Original uploads are immutable. Derivatives retain source hashes. Letters, videos, advice, photos, recipes, captions, recipient assignments, publication status, and release conditions are versioned. Synthetic content is labeled. No posthumous voice cloning or deepfake video exists in the initial product.

## Runtime flow
Request -> authentication -> tenant and household context -> authorization -> schema validation -> use case -> transaction -> outbox -> worker/provider -> evidence -> user-visible status.

Emergency flow: recipient request -> identity verification -> deterministic policy evaluation -> owner and verifier notifications -> challenge timer -> denial and takeover monitoring -> final policy evaluation -> packet manifest lock -> one-time encrypted release -> access audit -> expiry and revocation.

## Persistence and concurrency
Every tenant-owned mutable record has optimistic concurrency. Outbox and inbox tables provide exactly-once business effects over at-least-once delivery. Release uses transaction-scoped advisory locks plus idempotency keys. Packet manifests are content-addressed and immutable after release approval.

## Security boundaries
Browsers, recipients, helpers, uploads, QR codes, email links, provider webhooks, AI output, support tools, and release evidence are untrusted. Validate each boundary. Uploaded files remain quarantined until MIME, magic-byte, size, malware, and normalization gates pass.

## Architectural invariants
INV-01 Every household query requires tenant and household context.
INV-02 AI output cannot directly modify confirmed facts or release eligibility.
INV-03 Prohibited secrets cannot cross the AI boundary or appear in generated packets.
INV-04 Every packet is purpose-scoped, recipient-scoped, and versioned.
INV-05 No emergency release occurs without deterministic policy satisfaction and durable evidence.
INV-06 Death, incapacity, guardianship, ownership, or authority is never determined by AI.
INV-07 Ambiguous provider or verification outcome is never treated as success.
INV-08 Trusted helpers see only explicitly granted categories and actions.
INV-09 Original media, consent, release manifests, and audit events are immutable.
INV-10 Readiness scores derive only from confirmed, versioned rules and data.
INV-11 Recipient access is revocable, expiring, least-privilege, and fully audited.
INV-12 Deletion is tenant-scoped, retention-aware, and proven by purge evidence.
INV-13 Cache keys include tenant isolation, prompt version, data version, and consent state.
INV-14 A release notification or download link is not proof of recipient access; access is separately evidenced.
INV-15 No single uploaded document automatically authorizes release.

## Forbidden moves
Direct AI or provider calls from controllers; LLM-driven SQL; public-by-default packets; all-or-nothing family access; storing passwords, seed phrases, recovery codes, private keys, safe combinations, or full payment credentials; automatic acceptance of extraction; release based only on one death certificate; global support access; blind retry after ambiguous release; hidden score changes; posthumous voice cloning; face recognition; silent policy acceptance.

## How to add a feature
Update product behavior spec, vocabulary tables, threat model, privacy classification, authorization matrix, migration, tests, live-fire mapping, metrics, runbook, and release notes before implementation.

## How to add an integration
Add a port, provider adapter, exact configuration schema, read-only probe, contract test, sandbox live-fire proof, timeout and ambiguity policy, DLP review, subprocessor review, retention analysis, and fallback. Direct integration calls are forbidden.

## How to add a schema change
Use expand-migrate-backfill-verify-contract. Every destructive step has a backup/restore plan and production stop condition.

## Architecture review checklist
Confirm all invariants, tenant and packet isolation, deterministic release policy, no AI authority, immutable evidence, idempotency, safe ambiguous outcomes, accessible flows, retention, provider fallback, and real live-fire coverage.
=== END FILE ===

=== FILE: ASSUMPTIONS.md ===
# Assumptions

| Assumption | Reason | Risk if wrong | Verification | Blocks implementation |
|---|---|---|---|---|
| US-first direct-to-consumer launch | User market and legal scope are otherwise unknown | Policies and workflows may require jurisdiction changes | Counsel reviews legal matrix before production | No |
| Production deployment is manual | No explicit authorization was supplied | Irreversible external release | Read `AUTO_DEPLOY_AUTHORIZED` and DEPLOYMENT.md | No |
| Calendar write integrations are optional at launch | Avoid provider credential dependency | Lower convenience | Product owner decision recorded through ADR | No |
| Consequential actions begin with email, postal mail, and supported sandbox APIs | Broad account automation is unsafe | Reduced initial coverage | Vendor and threat-model review | No |
| Native auth is required | Avoid OAuth dependency and support older users | More auth responsibility | Security tests and external review | No |
| No bank credential storage | High risk and unnecessary for MVP | Some automation unavailable | Search SECURITY.md and schema | No |
| DeepSeek is optional and replaceable | Vendor controversy and availability risk | Reduced AI capability when disabled | Provider-failure live-fire | No |
| Legal text remains draft until counsel approves | No counsel record supplied | Liability and unenforceability | `LEGAL_APPROVAL_RECORD` | Yes for production only |
=== END FILE ===

=== FILE: AUTOMATION_AND_AUTHORIZATION_POLICY.md ===
# Automation and Authorization Policy

TomorrowReady may automate reminders, document processing, deterministic gap detection, packet generation, notifications, export assembly, and retention jobs. It may not silently release a packet, determine death or incapacity, select a guardian, transfer an asset, close an account, file a legal document, or disclose the full household.

Every consequential disclosure requires an armed owner-configured policy, exact packet manifest, verified recipient, satisfied deterministic predicates, challenge completion, no denial, idempotency, durable evidence, and safe ambiguity handling. AI cannot authorize any consequential action.
=== END FILE ===

=== FILE: BLUEPRINT_INPUT.md ===
# Filled 6LAYER Input: TomorrowReady

## Project Name
TomorrowReady

## Project Description
TomorrowReady is a standalone, multi-tenant family continuity SaaS that helps a parent or household create a verified, private, compartmentalized operating manual for the people who would need to step in after death, incapacity, hospitalization, disappearance, deployment, evacuation, or another serious disruption. In one guided session, customers can inventory accounts and assets without storing prohibited login secrets, identify insurance and professional contacts, document storage units and physical locations, create child, pet, home, and business continuity instructions, preserve funeral wishes, letters, videos, advice, photographs, and family recipes, and prepare recipient-specific emergency packets. The product is not an estate-planning law firm, password manager, financial institution, emergency service, or autonomous executor.

## Product Goal
Make a household understandable and operable to the right people at the right time, without exposing the entire family archive to every recipient or allowing AI, a helper, or the platform to release sensitive information without verified authority and auditable controls.

## Target Users
- Parents and guardians who worry what their children would need if they disappeared tomorrow.
- Couples and single parents building a family continuity plan.
- Military members, first responders, frequent travelers, and people in higher-risk occupations.
- Caregivers and adult children helping a household prepare with permission.
- Families with pets, dependents, rental property, storage units, small businesses, or complex household operations.
- Trusted professionals invited with narrow, time-limited access.

## Core User Outcomes
1. Create a private household and complete a one-afternoon guided TomorrowReady plan.
2. Add children, dependents, pets, guardians, caregivers, advisers, friends, and emergency contacts with relationship and authority metadata.
3. Inventory financial accounts, insurance, assets, debts, storage units, property, digital services, and physical document locations without exposing prohibited secrets to AI.
4. Build child-care, pet-care, home-operation, medical-information, funeral-wish, and business-continuity playbooks.
5. Record letters, videos, advice, photographs, recipes, and personal messages for named recipients.
6. Generate a Family Readiness Score and a Family IQ gap analysis based only on verified missing information and deterministic rules.
7. Create compartmentalized packets for childcare, pets, medical support, household operation, financial contacts, executor preparation, and personal messages.
8. Invite a trusted helper with least-privilege, category-specific, time-bounded access.
9. Configure a delayed emergency-access policy with owner notification, challenge period, secondary verification, denial, and auditable release.
10. Request emergency access and release only the authorized packet after all policy conditions are satisfied.
11. Export a complete encrypted archive and printable family continuity binder containing verified facts, provenance, packet definitions, and review dates.
12. Exercise privacy access, correction, export, consent withdrawal, recipient revocation, and deletion rights without corrupting required audit evidence.
13. Complete an annual readiness review that detects stale contacts, outdated locations, missing packet recipients, and unreviewed instructions.
14. Recover safely from provider, queue, storage, or notification failure without unauthorized release, duplicate messages, or loss of authoritative records.

## Existing Repository Status
Greenfield.

## Preferred Tech Stack
Frontend: Next.js 16, React, TypeScript, Tailwind CSS, Radix primitives, React Hook Form, Zod, TanStack Query.
Backend: TypeScript modular monolith using Fastify with background workers.
Database: PostgreSQL 17 with row-level security; pgvector only for approved, non-secret retrieval.
Authentication: Passkeys preferred; email/password fallback; TOTP MFA; step-up authentication for packet release and policy changes.
Hosting / Deployment: Cloudflare DNS/CDN/WAF, containerized API and workers, managed PostgreSQL, managed Valkey, private S3-compatible object storage.
Testing: Vitest, property tests for release state machines, real PostgreSQL integration tests, Playwright E2E, axe accessibility, k6 performance, security and privacy test suites.
Package Manager: pnpm pinned by Corepack.
CI/CD: GitHub Actions with manual production environment approval.
Observability: OpenTelemetry, structured JSON logs, Sentry-compatible error sink, Prometheus-compatible metrics, privacy-safe audit dashboards.

## External Services, APIs, and Credentials Already Known
PostgreSQL, Valkey, private S3-compatible storage, optional DeepSeek API, transactional email, optional SMS, optional Stripe, malware scanning, optional transcription and video processing providers, optional print fulfillment, and production KMS. All services require provider adapters and fail-closed readiness states.

## Agent Platforms Expected To Run This Pack
Codex, Claude Code, Hermes, OpenClaw, and any terminal agent able to read files, edit files, and run commands.

## Auto-Deploy Authorization
No. The run ends at a verified, tagged, ship-ready artifact and an exact manual deployment command.

## Business Constraints
Low initial hosting cost; support at least 1,000 household profiles; modular scaling; consumer-grade trust; one-afternoon onboarding; concierge-assisted onboarding option; recurring annual review subscription; no advertising; no sale of personal data; no training on customer content.

## Technical Constraints
Modular monolith first; provider abstraction; deterministic release state machines; idempotent jobs; append-only audit and evidence; immutable originals; no passwords, recovery codes, seed phrases, private keys, full SSNs, full payment cards, or safe combinations sent to an LLM; target greater than 97 percent cache hits on cache-eligible repeated AI prefixes without irrelevant padding.

## Security / Compliance Constraints
Private by default; tenant isolation; least privilege; verified emergency-release authority; step-up authentication; challenge periods; anti-coercion and account-takeover controls; application-level encryption for restricted fields; immutable audit evidence; safe upload pipeline; explicit recording and AI consent; minor-data safeguards; state privacy rights; vendor risk assessment; incident response; retention enforcement; counsel review before production.

## Performance Requirements
P95 ordinary API reads under 350 ms and writes under 750 ms at 50 concurrent users excluding external providers; dashboard first content under 2.5 seconds on broadband; resumable uploads and background jobs; initial deployment supports 1,000 household profiles; workers scale horizontally; packet generation under 90 seconds for the 95th percentile household archive excluding video transcode.

## Accessibility Requirements
WCAG 2.2 AA target; full keyboard operation; 200 percent zoom; screen-reader labels; strong contrast; large touch targets; plain language; no color-only meaning; reduced motion; printable instructions; optional guided and helper-assisted modes.

## Data / Privacy Requirements
Purpose limitation; data minimization; private-by-default packets; granular recipient permissions; no data sale; no behavioral advertising; no model training on customer content; separate consent for external AI; prohibited-secret scanning; data-access, correction, export, deletion, and consent-withdrawal workflows; subprocessor register; retention schedule; customer-approved time-limited support access.

## Integrations
Email, optional SMS, private object storage, DeepSeek through an AI Policy Gateway, billing, optional transcription, optional print fulfillment, optional calendar reminders, malware scanning, and production KMS. No direct bank login, password-manager import, social scraping, or automatic legal filing in the initial release.

## Non-Goals
Legal, tax, medical, guardianship, probate, or financial advice; execution of a will; determining legal capacity; password management; storing authentication secrets; autonomous account closure or asset transfer; public memorial pages; face recognition; posthumous voice cloning; automatic death determination; emergency dispatch; background investigations; data brokerage; advertising profiles; release based solely on an uploaded death certificate or an AI decision.

## Timeline / Milestones
Milestone-based graph. Production release occurs only after all engineering gates, live-fire proofs, legal review, vendor review, security evidence, insurance evidence, and manual deployment authorization are complete.

## Deployment Target
Containerized web, API, worker, and report-renderer services with managed PostgreSQL and Valkey, private S3-compatible object storage, CDN/WAF, KMS, transactional email, and manual production deployment.

## Runtime Budgets
Default six attempts per milestone; 30 readiness probes at two-second intervals; ordinary graph nodes bounded to one workday of autonomous execution; packet generation and media workflows have explicit queue and timeout budgets.

## Special Instructions
TomorrowReady is a standalone product and repository. Emergency release is never all-or-nothing. Every packet has an explicit recipient, scope, purpose, challenge period, release policy, and revocation state. The platform never stores or sends prohibited login secrets to AI. AI may organize, explain, draft, and identify gaps, but cannot determine death, incapacity, guardianship, ownership, legal authority, or release eligibility. Every generated factual statement is linked to confirmed evidence or labeled as an unverified suggestion.
=== END FILE ===

=== FILE: CHILD_AND_DEPENDENT_DATA_POLICY.md ===
# Child and Dependent Data Policy

TomorrowReady stores only continuity information reasonably necessary to help an authorized caregiver support a child or dependent during disruption. Records are private by default and unavailable to search engines, advertising systems, public profiles, model training, or unrelated recipients.

Required controls include guardian-managed consent, least-privilege packet inclusion, category-specific helper access, age-appropriate data minimization, restricted medical and school information, audit logs, review dates, export controls, and deletion workflows. The platform records who asserted authority and supporting evidence but does not make a legal guardianship determination.

The initial product does not provide accounts directly to children under 13, public child profiles, location tracking, behavioral advertising, facial recognition, school surveillance, or social-media enrichment. Counsel must approve age thresholds, parental-consent language, and jurisdictional launch scope before production.
=== END FILE ===

=== FILE: CONTRIBUTING.md ===
# Contributing
Read AGENTS.md. Use graph nodes and milestone commits. Pin dependencies. Comments explain why and cite `INV-##` when enforcing architecture. Every change includes tests and documentation. No secrets, broad refactors, or gate weakening.
=== END FILE ===

=== FILE: DATA_RETENTION_SCHEDULE.md ===
# Data Retention Schedule

- Active household records: retained while the account is active and reviewed annually.
- Superseded confirmed facts and packet manifests: retained for version history while active, then deletion schedule applies.
- Original documents and media: until user deletion or account closure, subject to legal hold and unresolved release dispute.
- Quarantined rejected uploads: purge within 7 days unless security investigation requires longer.
- Temporary derivatives and transcodes: purge within 30 days after approved artifact generation unless user retains them.
- Access requests, verification evidence, challenges, denials, and release evidence: proposed 7 years after closure; counsel must approve.
- Consent and policy acceptance: proposed 7 years after closure; counsel must approve.
- Security and audit events: proposed 7 years for high-risk events and 2 years for ordinary events; counsel and security must approve.
- Billing records: according to tax and payment obligations.
- Support content: 2 years after closure unless shorter deletion is requested and no exception applies.
- Backups: rolling encrypted retention up to 35 days, then cryptographic and lifecycle purge.
- AI request metadata: 90 days; no raw sensitive prompt or output in ordinary logs.
- Deleted account tombstones and purge evidence: minimal identifiers retained as needed to prove deletion and prevent resurrection.

Production requires jurisdiction-specific approval and automated enforcement tests.
=== END FILE ===

=== FILE: DECISIONS.md ===
# Decisions
| ID | Decision | Rationale | Status |
|---|---|---|---|
| ADR-001 | Modular monolith | Lowest operating complexity with clear extraction boundaries | Accepted |
| ADR-002 | PostgreSQL is authoritative | Transactions, RLS, and durable evidence | Accepted |
| ADR-003 | AI is optional and non-authoritative | Privacy and accuracy | Accepted |
| ADR-004 | Consequential actions require payload-bound authorization | Liability and duplicate prevention | Accepted |
| ADR-005 | Native auth with passkeys and TOTP | Avoid required social providers | Accepted |
| ADR-006 | No credential vault or autonomous payment | Reduce catastrophic risk | Accepted |
| ADR-007 | Manual production deploy | No authorization supplied | Accepted |
New decisions require context, options, choice, consequences, evidence, and affected specs.
=== END FILE ===

=== FILE: DELEGATED_ACCESS_POLICY.md ===
# Trusted Helper and Recipient Policy

A trusted helper assists an owner before an emergency. A recipient receives one or more packets under a normal share or emergency-release policy. These roles are distinct.

Helper grants specify household, categories, actions, purpose, start, expiry, and revocation. The default is no access. Helpers cannot change emergency recipients, arm a release policy, export the whole household, view unrelated categories, or grant themselves access.

Recipient grants specify packet, purpose, access window, authentication requirements, download policy, and revocation. A recipient cannot browse the household, infer other packet names, or become a helper automatically.

Every invitation, acceptance, denial, view, download, grant change, expiry, and revocation is audited. Sensitive grants require MFA and owner step-up authentication.
=== END FILE ===

=== FILE: DEPLOYMENT.md ===
# Deployment
Build immutable web, API, and worker images. Apply expand migrations before application rollout. Deploy staging, run migration checks, health, smoke, E2E subset, provider probes, and action reconciliation test. Production deployment is MANUAL because auto-deploy is not authorized. Exact command after infrastructure values are supplied: `pnpm deploy:production`. Post-deploy run `pnpm smoke:production`. Roll back application images first; database contraction occurs only in a later release after compatibility proof.
=== END FILE ===

=== FILE: DIGITAL_SECRETS_POLICY.md ===
# Digital Secrets and Account Locator Policy

TomorrowReady is not a password manager and does not collect or store raw passwords, PINs, recovery codes, seed phrases, private keys, safe combinations, or full payment-card data.

The product stores account inventory and locator instructions, such as provider, account purpose, last four digits where appropriate, owner, beneficiary-review status, adviser contact, document location, and the name of the external password-manager entry. Prohibited-secret scanning runs on structured fields, free text, uploads selected for AI processing, and generated packets.

When a prohibited secret is detected, the system blocks the save or outbound AI request, explains the safer locator pattern, and records only privacy-safe security telemetry. No secret value is written to logs or analytics. A future zero-knowledge secret vault requires a separate security architecture, threat model, independent audit, and product approval.
=== END FILE ===

=== FILE: DPIA.md ===
# TomorrowReady Data Protection Impact Assessment

## High-risk processing
The service combines family relationships, child and dependent data, account and asset metadata, insurance, medical-support information, private media, funeral wishes, delegated access, and conditional release. Harm could include identity theft, family conflict, coercion, stalking, unauthorized child disclosure, financial exploitation, emotional harm, or irreversible release.

## Necessity and proportionality
Collect only continuity information needed for selected modules. Do not collect raw authentication secrets. Keep packets compartmentalized. Make AI optional. Require explicit release policies and recipient verification. Provide manual workflows, export, correction, revocation, and deletion.

## Principal controls
Tenant and packet isolation; step-up authentication; least privilege; challenge periods; owner notification; secondary verification; ambiguity to manual review; application-level encryption; immutable audit; private object storage; safe uploads; DLP; AI consent; minor-data restrictions; time-limited support; incident response; backup and restore; deletion evidence.

## Residual risks
Compromised owner email or device, family coercion, fraudulent evidence, recipient forwarding, legal authority disputes, provider outages, vendor retention, and unavoidable family conflict. Production requires counsel review, threat-model review, penetration testing, vendor assessments, insurance, and incident exercises.

## Decision
Production processing is not approved by this draft. Approval requires named controller, jurisdictions, lawful bases, child-data analysis, transfer mechanisms, vendor contracts, retention approval, rights workflows, security evidence, and executive risk acceptance.
=== END FILE ===

=== FILE: EMERGENCY_ACCESS_AND_RELEASE_POLICY.md ===
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
=== END FILE ===

=== FILE: ENVIRONMENT.md ===
# Environment
Node.js 24.x, pnpm 10.x through Corepack, Docker 27+, PostgreSQL client 17+, Git 2.45+, curl, jq, OpenSSL, and POSIX sh are required. Local uses Docker Compose services. Test uses isolated databases and buckets. Staging mirrors production providers with sandbox accounts. Production uses secret management and manual approval. Every environment variable is validated at startup; unknown production variables fail review, missing required variables fail startup, and secrets are redacted.
=== END FILE ===

=== FILE: FAMILY_READINESS_SCORE_POLICY.md ===
# Family Readiness Score Policy

The Family Readiness Score is an organizational completeness indicator, not a prediction of safety, legal validity, financial adequacy, parenting quality, or emergency outcome.

The calculation is deterministic, versioned, testable, and based only on confirmed records, review freshness, recipient coverage, packet test status, critical-category completion, and unresolved contradictions. AI may explain a result in plain language but cannot calculate, alter, or mark a requirement complete.

The interface must show score version, categories, missing items, stale items, excluded optional categories, and the exact action that changes each component. The product may not use fear-based dark patterns, fabricate urgency, or claim a family is fully protected. Material score-weight changes require an ADR, migration strategy, test vectors, release notes, and user disclosure.
=== END FILE ===

=== FILE: HOW_TO_USE.md ===
# How to Use This Blueprint Pack
1. Extract the ZIP into an empty repository root.
2. Initialize Git and commit the blueprint.
3. Read PREFLIGHT.md, copy `.env.example` to `.env`, and use secure local values or real sandbox credentials.
4. Run `sh scripts/preflight.sh` until `preflight: ok`.
5. Give the coding agent `.agent/prompts/run-graph.md` and permit repository writes, terminal, package network, and Docker.
6. Observe `.agent/state/LEDGER.md` and Git history. Do not implement from ROADMAP.md.
7. On BLOCKED, read the active ExecPlan report, provide the one required item, reset according to recovery, and relaunch.
8. RUN_COMPLETE plus the ship gate is the only release decision. Production deployment remains manual.
=== END FILE ===

=== FILE: INCIDENT_RESPONSE_PLAN.md ===
# Incident Response Plan

Severity 0 includes confirmed or suspected unauthorized packet release, cross-tenant exposure, child-data exposure, encryption-key compromise, or active release-system takeover. Immediately pause affected releases, preserve evidence, revoke links and sessions, isolate providers, notify security leadership and counsel, and follow applicable breach timelines.

Severity 1 includes failed owner notifications during an active challenge, suspected fraudulent request, compromised recipient, malware escape, or material deletion failure. Pause affected workflows and require manual review.

Every incident follows detect, classify, contain, preserve, investigate, eradicate, restore, validate, notify, document, and follow-up. No support employee may quietly repair audit records or release content during an incident.
=== END FILE ===

=== FILE: MEDIA_MESSAGES_AND_LEGACY_POLICY.md ===
# Media, Messages, and Personal Legacy Policy

Letters, videos, advice, photographs, captions, recipes, and personal messages are private user content. The uploader must have authority to upload and designate recipients. Originals are immutable, derivatives retain hashes and provenance, and every item has an owner, recipient scope, release condition, consent status, review date, and deletion status.

AI may transcribe, summarize, organize, or help draft when the user explicitly enables AI processing. AI-created text is labeled and must be approved before release. The product does not create synthetic quotations, posthumous voice clones, deepfake video, face recognition, or public memorial pages in the initial release.

Recipients receive only items included in their released packet. Forwarding risk is disclosed. Download links expire and are recipient-bound where technically possible. Copyright and privacy complaints use the documented takedown process without silently destroying preservation evidence.
=== END FILE ===

=== FILE: OBSERVABILITY.md ===
# SPEC-007 Observability

Structured events include request_id, trace_id, tenant_id, household_id, actor_id, module, operation, result, latency_ms, provider, job_id, packet_id where authorized, and error_code. Never log content bodies.

Metrics cover authentication, authorization denials, cross-tenant attempts, uploads, malware results, extraction confirmation, readiness calculation, packet generation, release-state transitions, challenge timers, owner notifications, denials, manual reviews, downloads, revocations, AI cache tokens, AI cost, queue age, backups, restores, and deletion.

Alerts include unauthorized-release attempt, unusual recipient velocity, owner-notification failure during active challenge, packet isolation failure, repeated verification ambiguity, KMS failure, backup failure, purge failure, malware spike, and cross-tenant policy denial spike.

## SLOs
99.9 percent monthly API availability after launch stabilization; owner challenge notifications begin within five minutes for 99 percent of requests; no unauthorized release; queue age under five minutes for ordinary jobs; RPO 15 minutes and RTO 4 hours after production validation.
=== END FILE ===

=== FILE: OPERATIONS.md ===
# TomorrowReady Operations

Health endpoints cover web, API, database, Valkey, storage, workers, KMS readiness, notification adapters, and queue age. Provider failures are isolated and visible.

Runbooks are required for database outage, storage outage, queue backlog, malware event, owner-notification failure during challenge, fraudulent emergency request, compromised recipient, unauthorized packet exposure, account takeover, KMS failure, AI-provider leak concern, deletion failure, backup failure, and regional outage.

Emergency release operations may pause releases globally or per household, but support cannot bypass an absent policy or expand packet scope. Manual review requires two-person approval, documented evidence, and immutable audit. Every incident protects packet confidentiality before availability.

Backups are encrypted, restoration is tested quarterly, and release evidence is included. Scheduled jobs cover reminders, annual reviews, challenge timers, packet expiry, access revocation, retention, purge, integrity checks, and cache cleanup.
=== END FILE ===

=== FILE: PRIVACY_POLICY_DRAFT.md ===
# TomorrowReady Privacy Policy Draft

Effective date: not effective until counsel approval and production publication.

TomorrowReady helps households organize private continuity information and prepare recipient-specific packets for serious disruption. This draft describes intended processing and is not a substitute for jurisdiction-specific legal review.

## Information collected
Account and authentication data; household and relationship data; child and dependent continuity information; pet information; professional and emergency contacts; account and asset metadata; insurance, property, storage-unit, debt, and document-location records; playbook instructions; funeral wishes; letters, videos, advice, photos, and recipes; packet and recipient settings; emergency-policy and verification evidence; consent; support records; billing metadata; security, audit, and device events.

TomorrowReady is not designed to store raw passwords, PINs, recovery codes, seed phrases, private keys, safe combinations, or full payment-card numbers. Product controls attempt to block these values, but users must not submit them.

## Purposes
Provide and secure the service; organize confirmed information; create readiness results and packets; process owner-authorized sharing and emergency-access policies; deliver notifications; generate exports; process payments; provide support; prevent fraud and abuse; satisfy privacy requests; comply with law; and improve reliability using privacy-safe operational data.

## AI processing
External AI is optional and separately disclosed. AI may classify, summarize, explain, or draft. AI does not determine death, incapacity, guardianship, ownership, legal authority, readiness completion, or packet release. Customer content is not used by TomorrowReady to train general-purpose models. Current provider terms, retention, data location, and subprocessors must be disclosed before enabling production AI.

## Sharing
Information is shared only with customer-authorized helpers and recipients, contracted subprocessors, or as legally required. Access is scope-limited. TomorrowReady does not sell personal data, operate an advertising network, or create behavioral advertising profiles.

## Emergency release
Emergency release follows the owner's configured packet, recipient, verification, challenge, and notification policy. No single document or AI inference automatically triggers release. All requests and access are audited.

## Children and dependents
Child information is private and purpose-limited. The initial service does not provide public profiles or direct accounts for children under 13. Authority and consent requirements must be finalized by counsel for each launch jurisdiction.

## Retention and deletion
Retention follows DATA_RETENTION_SCHEDULE.md. Users may request access, correction, export, and deletion, subject to security, fraud, billing, legal, backup, and immutable audit requirements. Deletion creates purge evidence rather than silently erasing required security history.

## Security
TomorrowReady uses access controls, encryption, private storage, malware scanning, step-up authentication, audit logging, packet compartmentalization, and incident procedures. No system is risk-free.

## International processing and subprocessors
The production policy must name applicable processing regions, transfer mechanisms, and subprocessors. No unsupported claim of US-only storage, zero retention, or no provider training may be published.

## Contact and rights
Final company name, address, privacy email, appeal process, state notices, and regulator contacts must be inserted only after counsel approval. Production readiness blocks publication while these remain unresolved.
=== END FILE ===

=== FILE: PRODUCTION_READINESS.md ===
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
=== END FILE ===

=== FILE: PROJECT_BRIEF.md ===
# Project Brief

TomorrowReady answers one question: "If I could not explain any of this tomorrow, would the right people know what to do without receiving information they should not see?"

The product creates a private, verified family continuity system covering people, children, pets, home operations, accounts and assets, insurance, professionals, physical locations, personal wishes, messages, photographs, recipes, and recipient-specific emergency packets. Its differentiator is not a generic vault. It is a guided one-afternoon readiness workflow plus compartmentalized, policy-controlled release.

## Primary value proposition
Everything your family needs, before they need it.

## Live-fire ship criteria
- LF-01: Create a household and finish the guided one-afternoon plan.
- LF-02: Add people, dependents, pets, advisers, and emergency contacts with verified permissions.
- LF-03: Add account, asset, insurance, storage-unit, and document-location records without prohibited-secret leakage.
- LF-04: Build child, pet, home, medical-information, funeral-wish, and business continuity playbooks.
- LF-05: Record and approve a letter, video, advice item, photograph, recipe, and recipient designation.
- LF-06: Generate the deterministic Family Readiness Score and Family IQ gap report from confirmed records.
- LF-07: Generate compartmentalized recipient packets and prove one recipient cannot access another packet.
- LF-08: Invite a trusted helper with category-scoped, time-limited access and revoke it.
- LF-09: Configure a delayed emergency-release policy with challenge, owner alerts, secondary verification, denial, and expiry.
- LF-10: Complete a real sandbox emergency-access request and release exactly one authorized packet with durable evidence.
- LF-11: Export an encrypted archive and printable binder with checksums, provenance, review dates, and packet manifests.
- LF-12: Exercise access, correction, export, recipient revocation, consent withdrawal, and deletion workflows.
- LF-13: Complete an annual review that detects stale contacts, missing recipients, and overdue confirmations.
- LF-14: Recover from ambiguous provider and queue failures without duplicate release or unauthorized disclosure.

## Success metrics
- At least 70 percent of paid households complete the core plan within seven days.
- Median guided completion time under 150 minutes, excluding optional media creation.
- At least 80 percent of completed households create three or more compartmentalized packets.
- Zero unauthorized cross-packet disclosures in production and testing.
- Zero release decisions made solely by AI.
- 100 percent of released packets have policy, verification, challenge, authorization, and evidence records.
- 100 percent of AI-generated factual claims are evidence-linked or explicitly labeled unverified.
- Greater than 97 percent cache hit rate on eligible stable AI-prefix tokens with lower effective cost than the uncached baseline.
- WCAG 2.2 AA acceptance checks pass.

Production readiness is defined only by PRODUCTION_READINESS.md and the ship gate.
=== END FILE ===

=== FILE: RELEASE.md ===
# Release
Use semantic versions. Every release requires clean verify, production readiness, migration review, changelog, signed image digest, backup age check, rollback drill, security/privacy approvals, and manual production approval.
=== END FILE ===

=== FILE: ROADMAP.md ===
# Roadmap
Do not implement from this file. Implementation happens only through the graph: run sh scripts/graph-next.sh.
EP-000 verifies toolchain and blueprint. EP-001 establishes repository and CI. EP-002 implements domain rules. EP-003 persists authoritative data. EP-004 exposes application services. EP-005 delivers accessible user workflows. EP-006 hardens identity, delegation, uploads, AI, and actions. EP-007 proves regression and failures. EP-008 adds operations. EP-009 proves deploy and rollback. EP-010 runs the ship gate.
=== END FILE ===

=== FILE: ROLLBACK.md ===
# Rollback
Trigger on security breach, authorization bypass, data corruption, elevated duplicate actions, migration failure, or critical regression. Stop dispatch queues, disable provider actions, preserve evidence, roll back images, reconcile unknown actions, verify health and invariants, communicate, and conduct postmortem.
=== END FILE ===

=== FILE: SECURITY.md ===
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
=== END FILE ===

=== FILE: SUBPROCESSOR_REGISTER.md ===
# Subprocessor Register

No provider is approved merely by appearing here. Production requires legal, privacy, security, region, retention, and contract review.

Candidate categories: cloud compute and CDN/WAF; managed PostgreSQL; managed Valkey; private object storage; KMS; transactional email; optional SMS; payment processor; error monitoring; observability; malware scanning; optional AI model provider; optional transcription and media processing; optional print fulfillment; customer support tooling.

For every selected provider record legal entity, service, purpose, data categories, child-data exposure, regions, retention, training terms, subprocessors, transfer mechanism, security evidence, incident terms, deletion support, DPA status, review owner, approval date, and next review. Unapproved providers remain disabled.
=== END FILE ===

=== FILE: TERMS_OF_SERVICE_DRAFT.md ===
# TomorrowReady Terms of Service Draft

Not effective until counsel approval and production publication.

## Service
TomorrowReady provides organizational software for family continuity records, instructions, media, recipient-specific packets, and configured access workflows.

## No professional advice or legal effect
TomorrowReady is not a law firm, fiduciary, executor, guardian, emergency service, financial institution, insurer, healthcare provider, or password manager. It does not create a will, establish guardianship, determine capacity or death, transfer ownership, guarantee probate outcomes, or replace qualified professional advice.

## User responsibilities
Users must provide accurate information, maintain review dates, possess rights to uploaded content, identify recipients carefully, avoid prohibited secrets, protect credentials, verify generated material, and obtain required consent. Users may not upload unlawful content, impersonate another person, circumvent access controls, test emergency release fraudulently, or use the service to surveil or exploit a family member.

## Emergency access limitations
Release depends on the user's configured policy and available verification and notification services. TomorrowReady may deny, delay, expire, or require manual review where evidence is missing, conflicting, suspicious, or technically ambiguous. An uploaded certificate, obituary, inactivity signal, or AI output does not guarantee release. Users must maintain independent legal and emergency arrangements.

## Content and licenses
Users retain ownership of their content and grant a limited license required to host, process, protect, generate requested artifacts, and deliver authorized packets. The user represents that uploads and recipient designations do not violate privacy, copyright, publicity, confidentiality, or other rights.

## AI
AI output may be incomplete or wrong and must be reviewed. AI is not authoritative and cannot approve release. Prohibited secrets must not be submitted.

## Security and availability
The service uses reasonable safeguards but cannot guarantee uninterrupted availability or prevent every compromise. Users must maintain independent copies of critical documents and not rely on TomorrowReady as the sole emergency mechanism.

## Fees, termination, export, and deletion
Final billing, renewal, cancellation, refund, export window, retention, and deletion language must match the implemented product and be approved by counsel.

## Disputes and liability
Governing law, arbitration, class waiver, warranty disclaimer, indemnity, liability cap, exclusions, survival, and consumer-law exceptions require counsel and jurisdiction-specific approval. They must not be invented or published from this draft.
=== END FILE ===

=== FILE: TESTING.md ===
# Testing
Unit tests cover pure domain rules. Integration tests use real PostgreSQL, Valkey, object storage, SMTP capture, and workers. Contract tests validate provider schemas. E2E tests drive the browser and real API. Live-fire proves every core outcome with real local or official sandbox dependencies.

Test doubles are allowed only under `tests/unit/fixtures`, `tests/unit/doubles`, and provider contract harnesses that cannot be mistaken for live verification. Production code contains no test-mode branch. Forced-failure tests sever real database or provider connections and verify safe behavior.

Required matrices include recurrence and time zones; DST; delegation; tenant isolation; upload quarantine; OCR confirmation; reminder deduplication; action authorization; payload hashing; webhook signatures; unknown provider outcomes; idempotency; privacy export/deletion; cache isolation and invalidation; accessibility; performance; backup/restore.

A flaky test is a bug. Fix it or remove it only through an ADR that proves the behavior is covered elsewhere. Test done means fresh verify and live-fire sentinels are observed.
=== END FILE ===

=== FILE: TRUSTED_HELPER_AND_RECIPIENT_POLICY.md ===
# Trusted Helper and Recipient Policy

A trusted helper assists an owner before an emergency. A recipient receives one or more packets under a normal share or emergency-release policy. These roles are distinct.

Helper grants specify household, categories, actions, purpose, start, expiry, and revocation. The default is no access. Helpers cannot change emergency recipients, arm a release policy, export the whole household, view unrelated categories, or grant themselves access.

Recipient grants specify packet, purpose, access window, authentication requirements, download policy, and revocation. A recipient cannot browse the household, infer other packet names, or become a helper automatically.

Every invitation, acceptance, denial, view, download, grant change, expiry, and revocation is audited. Sensitive grants require MFA and owner step-up authentication.
=== END FILE ===

=== FILE: scripts/build.sh ===
#!/usr/bin/env sh
set -eu
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
[ -f package.json ] || { echo "ERROR: package.json is created during EP-001; see .agent/execplans/EP-001-foundation.md" >&2; exit 1; }
pnpm build
echo "build: ok"
=== END FILE ===

=== FILE: scripts/dependency-audit.sh ===
#!/usr/bin/env sh
set -eu
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
[ -f package.json ] || { echo "ERROR: package.json is created during EP-001; see .agent/execplans/EP-001-foundation.md" >&2; exit 1; }
pnpm audit --audit-level high
echo "dependency audit: ok"
=== END FILE ===

=== FILE: scripts/format-check.sh ===
#!/usr/bin/env sh
set -eu
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
[ -f package.json ] || { echo "ERROR: package.json is created during EP-001; see .agent/execplans/EP-001-foundation.md" >&2; exit 1; }
pnpm format:check
echo "format check: ok"
=== END FILE ===

=== FILE: scripts/graph-next.sh ===
#!/usr/bin/env sh
# 6LAYER deterministic scheduler. Reads GRAPH-TABLE and the ledger.
set -eu
GRAPH=".agent/GRAPH.md"
[ -f "$GRAPH" ] || { echo "graph-next.sh: missing $GRAPH" >&2; exit 1; }
tmp=$(mktemp)
trap 'rm -f "$tmp" "$tmp.status"' EXIT
awk '
  /^GRAPH-TABLE-BEGIN$/ { t=1; next }
  /^GRAPH-TABLE-END$/   { t=0 }
  t && $1=="NODE"       { print $2, $4 }
' "$GRAPH" > "$tmp"
[ -s "$tmp" ] || { echo "graph-next.sh: GRAPH-TABLE empty or missing" >&2; exit 1; }
: > "$tmp.status"
while read -r id deps; do
  st=$(sh scripts/ledger.sh status "$id")
  printf '%s %s %s
' "$id" "$st" "$deps" >> "$tmp.status"
done < "$tmp"
blocked=$(awk '$2=="BLOCKED"{print $1; exit}' "$tmp.status")
if [ -n "$blocked" ]; then echo "BLOCKED $blocked"; exit 0; fi
resume=$(awk '$2=="IN_PROGRESS"{print $1; exit}' "$tmp.status")
if [ -n "$resume" ]; then echo "RESUME $resume"; exit 0; fi
next=$(awk '
  { st[$1]=$2; ord[NR]=$1; dep[$1]=$3; n=NR }
  END {
    for (i=1; i<=n; i++) {
      id=ord[i]
      if (st[id]=="PENDING") {
        ok=1
        m=split(dep[id], a, ",")
        for (j=1; j<=m; j++) { d=a[j]; if (d!="-" && st[d]!="DONE") { ok=0; break } }
        if (ok) { print id; exit }
      }
    }
  }
' "$tmp.status")
if [ -n "$next" ]; then
  echo "NEXT $next"
else
  undone=$(awk '$2!="DONE"{print $1; exit}' "$tmp.status")
  if [ -z "$undone" ]; then echo "ALL_DONE"; else echo "STALL $undone"; fi
fi
=== END FILE ===

=== FILE: scripts/install.sh ===
#!/usr/bin/env sh
set -eu
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
[ -f package.json ] || { echo "ERROR: package.json is created during EP-001; see .agent/execplans/EP-001-foundation.md" >&2; exit 1; }
pnpm install --frozen-lockfile
echo "install: ok"
=== END FILE ===

=== FILE: scripts/ledger.sh ===
#!/usr/bin/env sh
# 6LAYER ledger helper. Append-only event writer + status reader.
# The ledger is the single source of runtime truth. Details must not contain " | ".
# Usage:
#   sh scripts/ledger.sh append <AGENT_ID> <NODE|-> <EVENT> [detail...]
#   sh scripts/ledger.sh status <NODE>     -> DONE | BLOCKED | IN_PROGRESS | PENDING
#   sh scripts/ledger.sh tail [n]
set -eu
LEDGER=".agent/state/LEDGER.md"
[ -f "$LEDGER" ] || { echo "ledger.sh: missing $LEDGER (repo not bootstrapped)" >&2; exit 1; }
cmd="${1:-}"
[ -n "$cmd" ] && shift
case "$cmd" in
  append)
    agent="${1:?agent id}"; node="${2:?node id or -}"; event="${3:?event}"; shift 3
    detail="${*:-}"
    ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    printf '%s | %s | %s | %s | %s
' "$ts" "$agent" "$node" "$event" "$detail" >> "$LEDGER"
    ;;
  status)
    node="${1:?node id}"
    line=$(grep -E "\| $node \| (NODE_DONE|NODE_BLOCKED|LEASE_RELEASE|LEASE) \|" "$LEDGER" | tail -n 1)
    case "$line" in
      *"| NODE_DONE |"*)     echo DONE ;;
      *"| NODE_BLOCKED |"*)  echo BLOCKED ;;
      *"| LEASE_RELEASE |"*) echo PENDING ;;
      *"| LEASE |"*)         echo IN_PROGRESS ;;
      *)                     echo PENDING ;;
    esac
    ;;
  tail)
    n="${1:-30}"
    tail -n "$n" "$LEDGER"
    ;;
  *)
    echo "usage: ledger.sh append|status|tail ..." >&2
    exit 2
    ;;
esac
=== END FILE ===

=== FILE: scripts/lint.sh ===
#!/usr/bin/env sh
set -eu
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
[ -f package.json ] || { echo "ERROR: package.json is created during EP-001; see .agent/execplans/EP-001-foundation.md" >&2; exit 1; }
pnpm lint
echo "lint: ok"
=== END FILE ===

=== FILE: scripts/live-fire.sh ===
#!/usr/bin/env sh
set -eu
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
[ -f package.json ] || { echo "ERROR: live-fire implementation is created in EP-007" >&2; exit 1; }
for proof in LF-01 LF-02 LF-03 LF-04 LF-05 LF-06 LF-07 LF-08 LF-09 LF-10 LF-11 LF-12 LF-13 LF-14; do
  pnpm live-fire --proof "$proof"
done
echo "live-fire: ok"
=== END FILE ===

=== FILE: scripts/preflight.sh ===
#!/usr/bin/env sh
set -eu
fail() { echo "preflight: FAIL - $1" >&2; exit 1; }
[ -f AGENTS.md ] && [ -d .agent ] || fail "run from repository root"
for f in AGENTS.md COMMANDS.md PREFLIGHT.md .env.example .agent/GRAPH.md .agent/LOOPS.md .agent/state/LEDGER.md .agent/reality-patterns .agent/reality-allow; do [ -f "$f" ] || fail "missing required file: $f"; done
for t in git awk grep sed curl openssl; do command -v "$t" >/dev/null 2>&1 || fail "missing required tool: $t"; done
[ -f .env ] || fail "missing .env (copy .env.example, fill REQUIRED values)"
set -a; . ./.env; set +a
TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT
awk '/^PREFLIGHT-TABLE-BEGIN$/{t=1;next} /^PREFLIGHT-TABLE-END$/{t=0} t && NF' PREFLIGHT.md > "$TMP"
while IFS='|' read -r var req probe; do
  eval "val=\${$var:-}"
  if [ -z "$val" ]; then [ "$req" != "REQUIRED" ] || fail "env var not set: $var"; continue; fi
  if [ "$probe" != "-" ]; then [ -f "$probe" ] || fail "missing probe: $probe"; sh "$probe" >/dev/null 2>&1 || fail "credential probe failed: $var"; fi
done < "$TMP"
echo "preflight: ok"
=== END FILE ===

=== FILE: scripts/probes/database_url.sh ===
#!/usr/bin/env sh
set -eu
command -v psql >/dev/null 2>&1 || exit 1
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "SELECT 1" | grep -qx 1
=== END FILE ===

=== FILE: scripts/probes/deepseek_api_key.sh ===
#!/usr/bin/env sh
set -eu
curl -fsS --max-time 20 -H "Authorization: Bearer $DEEPSEEK_API_KEY" "${DEEPSEEK_BASE_URL:-https://api.deepseek.com}/models" >/dev/null
=== END FILE ===

=== FILE: scripts/probes/redis_url.sh ===
#!/usr/bin/env sh
set -eu
command -v redis-cli >/dev/null 2>&1 || exit 1
redis-cli -u "$REDIS_URL" ping | grep -qx PONG
=== END FILE ===

=== FILE: scripts/probes/s3_endpoint.sh ===
#!/usr/bin/env sh
set -eu
curl -fsS --max-time 10 "$S3_ENDPOINT" >/dev/null
=== END FILE ===

=== FILE: scripts/probes/smtp_url.sh ===
#!/usr/bin/env sh
set -eu
case "$SMTP_URL" in smtp://*) exit 0;; *) exit 1;; esac
=== END FILE ===

=== FILE: scripts/probes/stripe_secret_key.sh ===
#!/usr/bin/env sh
set -eu
curl -fsS --max-time 20 -u "$STRIPE_SECRET_KEY:" https://api.stripe.com/v1/account >/dev/null
=== END FILE ===

=== FILE: scripts/production-readiness-check.sh ===
#!/usr/bin/env sh
set -eu
sh scripts/verify.sh
[ -n "${LEGAL_APPROVAL_RECORD:-}" ] || { echo "production readiness: FAIL - legal approval evidence missing" >&2; exit 1; }
[ -n "${INSURANCE_EVIDENCE_RECORD:-}" ] || { echo "production readiness: FAIL - insurance evidence missing" >&2; exit 1; }
[ "${AUTO_DEPLOY_AUTHORIZED:-no}" = "yes" ] || { echo "production readiness: FAIL - manual production authorization required" >&2; exit 1; }
echo "production readiness: ok"
=== END FILE ===

=== FILE: scripts/reality-gate.sh ===
#!/usr/bin/env sh
set -eu
PAT=".agent/reality-patterns"
ALLOW=".agent/reality-allow"
[ -f "$PAT" ] || { echo "reality gate: missing $PAT" >&2; exit 1; }
[ -f "$ALLOW" ] || { echo "reality gate: missing $ALLOW" >&2; exit 1; }
SRC_DIRS="apps packages"
hits=0
for d in $SRC_DIRS; do
  [ -d "$d" ] || continue
  out=$(grep -RInE -f "$PAT" "$d" 2>/dev/null | grep -vE -f "$ALLOW" || true)
  if [ -n "$out" ]; then printf '%s
' "$out"; hits=1; fi
done
[ "$hits" -eq 0 ] || { echo "reality gate: FAIL" >&2; exit 1; }
echo "reality gate: ok"
=== END FILE ===

=== FILE: scripts/security-check.sh ===
#!/usr/bin/env sh
set -eu
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
[ -f package.json ] || { echo "ERROR: package.json is created during EP-001; see .agent/execplans/EP-001-foundation.md" >&2; exit 1; }
pnpm security:check
echo "security check: ok"
=== END FILE ===

=== FILE: scripts/smoke-test.sh ===
#!/usr/bin/env sh
set -eu
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
[ -f package.json ] || { echo "ERROR: package.json is created during EP-001; see .agent/execplans/EP-001-foundation.md" >&2; exit 1; }
pnpm smoke
echo "smoke test: ok"
=== END FILE ===

=== FILE: scripts/test-e2e.sh ===
#!/usr/bin/env sh
set -eu
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
[ -f package.json ] || { echo "ERROR: package.json is created during EP-001; see .agent/execplans/EP-001-foundation.md" >&2; exit 1; }
pnpm test:e2e
echo "e2e tests: ok"
=== END FILE ===

=== FILE: scripts/test-integration.sh ===
#!/usr/bin/env sh
set -eu
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
[ -f package.json ] || { echo "ERROR: package.json is created during EP-001; see .agent/execplans/EP-001-foundation.md" >&2; exit 1; }
pnpm test:integration
echo "integration tests: ok"
=== END FILE ===

=== FILE: scripts/test-unit.sh ===
#!/usr/bin/env sh
set -eu
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
[ -f package.json ] || { echo "ERROR: package.json is created during EP-001; see .agent/execplans/EP-001-foundation.md" >&2; exit 1; }
pnpm test:unit
echo "unit tests: ok"
=== END FILE ===

=== FILE: scripts/typecheck.sh ===
#!/usr/bin/env sh
set -eu
export CI=true GIT_TERMINAL_PROMPT=0 GIT_PAGER=cat PAGER=cat DEBIAN_FRONTEND=noninteractive
[ -f package.json ] || { echo "ERROR: package.json is created during EP-001; see .agent/execplans/EP-001-foundation.md" >&2; exit 1; }
pnpm typecheck
echo "typecheck: ok"
=== END FILE ===

=== FILE: scripts/verify.sh ===
#!/usr/bin/env sh
set -eu
sh scripts/preflight.sh
sh scripts/lint.sh
sh scripts/format-check.sh
sh scripts/typecheck.sh
sh scripts/test-unit.sh
sh scripts/test-integration.sh
sh scripts/test-e2e.sh
sh scripts/build.sh
sh scripts/security-check.sh
sh scripts/dependency-audit.sh
sh scripts/reality-gate.sh
sh scripts/smoke-test.sh
sh scripts/live-fire.sh
echo "verify: ok"
=== END FILE ===

=== FILE: BLUEPRINT_PACK.md ===
# Blueprint Pack Transcript

This file is the combined materialization transcript. The materialized repository files in this bundle are authoritative. A self-recursive file body is intentionally not embedded inside itself.
=== END FILE ===

How to Use This Blueprint Pack

1. Extract the ZIP into an empty repository root.
2. Initialize Git and commit the blueprint pack.
3. Read PREFLIGHT.md, copy .env.example to .env, and provide every required local value.
4. Run sh scripts/preflight.sh until it prints preflight: ok.
5. Give any coding agent the contents of .agent/prompts/run-graph.md.
6. Observe .agent/state/LEDGER.md and git history. Do not implement from ROADMAP.md.
7. RUN_COMPLETE plus the ship-gate sentinels is the production-readiness decision. Production deployment remains manual.

=== PACK COMPLETE: 113 FILES ===
