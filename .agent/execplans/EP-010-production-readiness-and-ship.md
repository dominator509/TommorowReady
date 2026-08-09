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
Only the capabilities and paths declared by this node and its linked specifications. The operator's
2026-08-08 product-authority override adds an optional, owner-controlled continuity monitor,
automated deterministic packet release, recipient delivery, and print-mail fulfillment before the
ship gate is rerun.

# 3. Non-goals
No unrelated refactors, speculative integrations, production deployment, fabricated effects, or weakening of gates.

# 4. Context and Orientation
Read PROJECT_BRIEF.md, ARCHITECTURE.md, SECURITY.md, TESTING.md, and the relevant specs. Preserve INV-01 through INV-15.

# 5. Files to Read First
AGENTS.md; COMMANDS.md; .agent/GRAPH.md; .agent/LOOPS.md; PROJECT_BRIEF.md; ARCHITECTURE.md; SECURITY.md; TESTING.md.

# 6. Expected Changed Files
- Product, architecture, security, privacy, operations, environment, decision, assumption, command,
  and handoff documents governing automated release and physical mail
- Domain, application, contract, database, provider, API, worker, renderer, web, migration, and test
  files required by the operator-authorized capability
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

### M4: Specify owner-controlled automation
GOAL: Record the explicit product-authority override and lock the deterministic monitor, delivery,
provider, privacy, authorization, and failure contracts.
READ: AGENTS.md .agent/LOOPS.md SECURITY.md ARCHITECTURE.md EMERGENCY_ACCESS_AND_RELEASE_POLICY.md
CHANGE: Control/specification documents, contracts, domain, migration, and preflight probe only.
RUN: sh scripts/typecheck.sh && sh scripts/test-unit.sh
EXPECT: typecheck: ok and unit tests: ok
EVIDENCE: sh scripts/ledger.sh append codex EP-010 MILESTONE_PASS "M4 automated release contracts pass"
FALLBACK: Preserve the existing manual request flow and isolate the new opt-in monitor.
COMMIT: git add -A && git commit -m "[EP-010][M4] specify automated continuity release"

### M5: Wire automation and delivery
GOAL: Implement persistence, scheduler, digital delivery, physical-mail adapters, signed webhooks,
owner controls, recipient redemption, and explicit health/failure states.
READ: M4 contracts and all changed runtime seams.
CHANGE: Application, infrastructure, API, worker, renderer, web, environment, and integration tests.
RUN: sh scripts/typecheck.sh && sh scripts/test-integration.sh && pnpm test:browser
EXPECT: typecheck: ok, integration tests: ok, and browser tests pass.
EVIDENCE: sh scripts/ledger.sh append codex EP-010 MILESTONE_PASS "M5 automated release runtime pass"
FALLBACK: Disable only the unavailable provider and preserve digital and owner check-in workflows.
COMMIT: git add -A && git commit -m "[EP-010][M5] wire automated continuity delivery"

### M6: Harden, verify, and hand off
GOAL: Prove safety properties, idempotency, ambiguity handling, accessibility, secret hygiene, and
all locally possible release gates; update the production handoff honestly.
READ: AGENTS.md TESTING.md PRODUCTION_READINESS.md .agent/state/DEFERRED_EXTERNALS.md
CHANGE: Tests, runbooks, observability, production readiness, release, and handoff evidence.
RUN: sh scripts/verify.sh
EXPECT: verify: ok
EVIDENCE: sh scripts/ledger.sh append codex EP-010 MILESTONE_PASS "M6 verify: ok"
FALLBACK: Block only the externally authenticated print-mail proof; never fabricate postal delivery.
COMMIT: git add -A && git commit -m "[EP-010][M6] verify automated continuity release"

# 9. Validation and Acceptance
Run node verification, expected-files audit, scope diff, and relevant live-fire proofs. Observe the sentinel in the current session.

# 10. Idempotence and Recovery
Re-enter from the last milestone commit. Read ledger and progress. Re-run the last sentinel. Use the bounded ladder and rollback without crossing a green tag.

# 11. Progress
- [x] M1 complete with evidence and commit.
- [x] M2 complete with evidence and commit.
- [x] M3 complete with evidence and commit.
- [x] M4 complete with evidence and commit.
- [x] M5 complete with evidence and commit.
- [ ] M6 pending.

# 12. Surprises & Discoveries
Append dated evidence only.

- 2026-08-07: The unchanged production gate executes the entire green local sentinel before failing on the first missing external item. Its observed exit was 1 with `production readiness: FAIL - legal approval evidence missing`.
- 2026-08-07: All local EP-010 milestones can be committed, but the graph must remain `RESUME EP-010`; external evidence is not a valid `NODE_DONE` substitute.
- 2026-08-07: Loading the ignored local environment exposed a reproducibility defect: `NODE_ENV=test` reached the Next.js production build and caused `_global-error` prerender failure. Scoping `NODE_ENV=production` to `scripts/build.sh` inside the verifier fixed the build without disabling the deliberately non-production local backup drill.
- 2026-08-07: The operator attested that counsel/policy review, vendor reviews/DPAs, insurance, and an issue-free independent penetration test are complete. No immutable evidence references were present, so EXT-010 through EXT-013 remain externally unverified.
- 2026-08-08: The operator explicitly overrode the prior prohibition on inactivity-triggered
  release and approved an optional dead-man switch plus automatic digital and physical-mail
  delivery. The override does not authorize AI release decisions, whole-household disclosure by
  default, secret storage, unverified recipients, ambiguous provider success, or production deploy.
- 2026-08-09: Repeated verification exposed Next.js development and production builds sharing one
  artifact directory. Phase-aware `.next-dev` isolation made build-then-browser and the aggregate
  verification order deterministic without weakening browser coverage or production CSP.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.

- Three final local passes emitted `verify: ok`; the last two also emitted `container rehearsal: ok`. Expected readiness/release/handoff files and healthy local dependencies were audited.
- `REMOTE_SESSION_HANDOFF.md` consolidates every graph node, subsystem, external requirement, probe, validation, legal/business action, known risk, resume command, and operator action.
- EP-010 is engineering complete but externally unverified. No `NODE_DONE`, `green/EP-010`, semantic release tag, registry push, external mutation, or production deployment is permitted.
- After the build-environment recovery, a fresh sourced-environment run emitted `verify: ok`; the enclosing ship gate then exited 1 with `production readiness: FAIL - legal approval evidence missing`.
