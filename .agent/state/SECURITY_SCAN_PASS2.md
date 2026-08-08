# Security Scan Pass 2

- Scan ID: `385c43ad-bdc3-4db4-aab8-0d500396370d`
- Immutable target: `73ae5f0984de1c305dbe5222975cd96c39e5f099`
- Producer: Codex Security plugin `0.1.18`
- Status: sealed and completed at `2026-08-08T05:58:15.806207Z`
- Coverage: complete repository source review; six threat surfaces; parent-only fallback because delegated scan workers were unavailable
- Canonical artifacts: `scan-manifest.json`, `findings.json`, `coverage.json`, `report.md`, and SARIF under the scan workbench directory recorded in the session handoff

| Occurrence | Severity | Finding | Hardening disposition |
|---|---|---|---|
| `occ_ef5c2ad71ef98d3e4fa30b00` | High | Caller-controlled headers bypass authentication and tenant authorization | Fixed in pass 2: API identity and scope now come only from validated signed-session claims; every protected route enforces deny-by-default authorization; forged-header and missing-grant regressions pass. |
| `occ_d87bc5325f38994ea4fde0eb` | Medium | Release transitions trust caller-supplied safety evidence and time | Immediate exploit path closed in pass 2: positive approval/release transitions return `409` until persisted server-verified evidence exists, and server time replaces caller time. Repository-backed release orchestration remains a pass 4 requirement. |
| `occ_42e528fc9042a78e79698c97` | Medium | Restricted payloads are stored as plaintext JSON despite an encryption contract | Closed in pass 3: canonical payloads and packet manifests use tenant/household/table/record-bound AES-256-GCM; legacy rows migrate; raw-row plaintext absence, transplant rejection, distinct encrypted backup, wrong-key rejection, and restore are verified. Production KMS wrapping remains an external ship gate. |

Pass 2 also hardened the optional AI boundary by serializing user content as untrusted data, binding output provenance to the allowed evidence set, and applying prohibited-secret checks before and after provider execution. This does not claim authenticated provider live-fire.
