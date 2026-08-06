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
| ADR-008 | Use pinned real local PostgreSQL, Valkey, MinIO, and Mailpit services for engineering | The operator authorized real local provisioning; these services preserve protocol behavior without claiming cloud-provider verification | Accepted |
| ADR-009 | Preserve EP-000 as unverified while later implementation is continued if its full-suite gate remains structurally circular | EP-000 demands `verify.sh`, while `verify.sh` requires artifacts assigned to EP-001 and EP-007; no sentinel will be fabricated | Accepted for implementation continuation only; final ship gate unchanged |
New decisions require context, options, choice, consequences, evidence, and affected specs.
