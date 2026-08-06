# SPEC-003 API Contracts

All routes use `/v1`. Writes require schema validation, tenant and household context, authorization, audit, optimistic concurrency where applicable, and idempotency keys for repeatable effects.

Canonical route families are `auth`, `households`, `people`, `dependents`, `children`, `pets`, `contacts`, `helpers`, `accounts`, `assets`, `insurance`, `properties`, `storage-units`, `document-locations`, `documents`, `facts`, `playbooks`, `wishes`, `letters`, `videos`, `advice`, `photos`, `recipes`, `readiness`, `family-iq`, `packets`, `recipients`, `emergency-policies`, `access-requests`, `verifications`, `challenges`, `releases`, `annual-reviews`, `consents`, `exports`, `privacy`, `billing`, `audit`, `support`, and `health`.

The error envelope contains `code`, `message`, `request_id`, `retryable`, and `field_errors`. Release endpoints return explicit state and never imply success from notification delivery. Download URLs are short-lived and recipient-bound.
