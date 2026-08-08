# Six-Pass Hardening Record

Objective: six end-to-end repository hardening passes toward genuine production readiness. A pass is complete only when its findings are fixed or explicitly deferred with evidence, its targeted gates pass, and the ledger records the outcome. External credentials, approvals, infrastructure, and live production proofs remain separate from engineering completion.

| Pass | Scope | Status | Findings and changes | Verification |
|---|---|---|---|---|
| 1 | Supply chain, configuration, secrets, dependencies | Complete | Release rehearsal used deprecated checkout runtime and lacked Node 24 setup; container inputs were tag-pinned but not digest-pinned. Updated Actions to immutable SHAs and Node 24.14.1, pinned Node/PostgreSQL/Valkey/MinIO/MinIO Client/Mailpit by registry digest, and recorded ADR-012. | Digest-pinned Compose services healthy; API/web/worker images built; `format check: ok`; security scan covered 182 tracked files plus Git history; `dependency audit: ok` |
| 2 | Security and privacy boundaries | Complete | Sealed Codex Security scan `385c43ad-bdc3-4db4-aab8-0d500396370d` reported one high and two medium findings on commit `73ae5f0984de1c305dbe5222975cd96c39e5f099`. Replaced caller-selected identity headers with validated signed-session claims and per-route deny-by-default authorization; extended canonical roles and step-up checks; made positive release transitions fail closed without persisted server evidence; schema-validated privacy intake; isolated AI content as untrusted data, restricted provenance to supplied evidence IDs, and applied outbound/inbound DLP. Context-bound encryption-at-rest remediation is assigned to pass 3. Parent-only scan fallback was used because delegation was unavailable. | Sealed manifest and generated report; typecheck; 29 unit/security tests; 9 real-service integration/contract tests; 4 E2E/performance tests; forged-header `401`, missing-grant `403`, and caller-asserted release `409` regressions passed |
| 3 | Data, migrations, backup/restore, queues, storage, recovery | Pending | — | — |
| 4 | API, authn/authz, AI/providers, billing, domain invariants | Pending | — | — |
| 5 | Frontend, accessibility, browser behavior, performance, UX safety | Pending | — | — |
| 6 | CI/CD, containers, observability, operations, deployment/rollback | Pending | — | — |

## Production-readiness boundary

`green/EP-009` remains the latest genuine graph tag and EP-010 remains `RESUME`. No hardening pass may convert operator attestations, local proofs, mocks, or configuration presence into external production evidence.
