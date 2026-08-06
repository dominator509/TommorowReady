# Testing
Unit tests cover pure domain rules. Integration tests use real PostgreSQL, Valkey, object storage, SMTP capture, and workers. Contract tests validate provider schemas. E2E tests drive the browser and real API. Live-fire proves every core outcome with real local or official sandbox dependencies.

Test doubles are allowed only under `tests/unit/fixtures`, `tests/unit/doubles`, and provider contract harnesses that cannot be mistaken for live verification. Production code contains no test-mode branch. Forced-failure tests sever real database or provider connections and verify safe behavior.

Required matrices include recurrence and time zones; DST; delegation; tenant isolation; upload quarantine; OCR confirmation; reminder deduplication; action authorization; payload hashing; webhook signatures; unknown provider outcomes; idempotency; privacy export/deletion; cache isolation and invalidation; accessibility; performance; backup/restore.

A flaky test is a bug. Fix it or remove it only through an ADR that proves the behavior is covered elsewhere. Test done means fresh verify and live-fire sentinels are observed.
