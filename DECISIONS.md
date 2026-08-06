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
