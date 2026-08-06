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
- [x] M1 complete with evidence and commit.
- [x] M2 complete with evidence and commit.
- [x] M3 complete with evidence and commit.

# 12. Surprises & Discoveries
Append dated evidence only.

- 2026-08-06: The original full-suite gate depended on EP-001 and EP-007 artifacts. User-authorized implementation continuation materialized those artifacts without a false node completion; fresh verification now passes.

# 13. Decision Log
Append decisions with alternatives, evidence, and consequences.

# 14. Outcomes & Retrospective
Complete after verification with files, commands, sentinels, risks, and follow-up.

EP-000 recovered from its generated circular gate after the user-authorized continuation. Toolchain, ignored local secrets, isolated real services, probes, external inventory, and full verification are evidenced. Production providers and approvals remain deferred without affecting local engineering.
