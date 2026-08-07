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
- [x] M1 complete with evidence and commit.
- [x] M2 complete with evidence and commit.
- [x] M3 complete with evidence and commit.

# 12. Surprises & Discoveries
Append dated evidence only.

- 2026-08-07: Accessibility was previously a separate command and backup/restore were outside the main sentinel. Bringing them into `verify.sh` prevents a green node from omitting those required gates.
- 2026-08-07: Local Windows verification uses installed Chrome while GitHub Actions installs the pinned Playwright Chromium runtime; the same three browser assertions run in both environments.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.

- The main sentinel now proves 24 unit/security tests, 7 real integration/contract tests, 3 API/performance E2E tests, 3 browser accessibility tests, a production web build, security and dependency audits, LF-01 through LF-14, a real database backup, and an isolated restore drill.
- Emergency release property testing now varies every independent approval predicate, and packet hashing is proven order-canonical.
- Three consecutive expanded verification passes emitted `verify: ok`; expected files, clean scope, and the non-empty backup artifact were audited.
