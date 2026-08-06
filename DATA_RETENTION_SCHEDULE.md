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
