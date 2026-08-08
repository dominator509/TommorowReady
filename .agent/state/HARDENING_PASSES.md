# Six-Pass Hardening Record

Objective: six end-to-end repository hardening passes toward genuine production readiness. A pass is complete only when its findings are fixed or explicitly deferred with evidence, its targeted gates pass, and the ledger records the outcome. External credentials, approvals, infrastructure, and live production proofs remain separate from engineering completion.

| Pass | Scope | Status | Findings and changes | Verification |
|---|---|---|---|---|
| 1 | Supply chain, configuration, secrets, dependencies | Complete | Release rehearsal used deprecated checkout runtime and lacked Node 24 setup; container inputs were tag-pinned but not digest-pinned. Updated Actions to immutable SHAs and Node 24.14.1, pinned Node/PostgreSQL/Valkey/MinIO/MinIO Client/Mailpit by registry digest, and recorded ADR-012. | Digest-pinned Compose services healthy; API/web/worker images built; `format check: ok`; security scan covered 182 tracked files plus Git history; `dependency audit: ok` |
| 2 | Security and privacy boundaries | Pending | Codex Security scan `385c43ad-bdc3-4db4-aab8-0d500396370d` started against commit `73ae5f0984de1c305dbe5222975cd96c39e5f099`; parent-only fallback because delegation is unavailable. | Pending complete scan and remediation |
| 3 | Data, migrations, backup/restore, queues, storage, recovery | Pending | — | — |
| 4 | API, authn/authz, AI/providers, billing, domain invariants | Pending | — | — |
| 5 | Frontend, accessibility, browser behavior, performance, UX safety | Pending | — | — |
| 6 | CI/CD, containers, observability, operations, deployment/rollback | Pending | — | — |

## Production-readiness boundary

`green/EP-009` remains the latest genuine graph tag and EP-010 remains `RESUME`. No hardening pass may convert operator attestations, local proofs, mocks, or configuration presence into external production evidence.
