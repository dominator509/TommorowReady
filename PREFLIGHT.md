# TomorrowReady Preflight

Preflight is the sole interactive bootstrap boundary. Auto-deploy is not authorized. Engineering may continue with real local services when production credentials or approvals are unavailable, but no external verification or legal approval may be fabricated.

## Required operator-controlled evidence

| Service or evidence | Purpose | Minimum scope | Obtain and verify |
|---|---|---|---|
| PostgreSQL | Authoritative household, packet, consent, audit, and release records | Dedicated database owner | `DATABASE_URL`; probe runs `SELECT 1` |
| Valkey/Redis | Queues, locks, throttles, cache | Dedicated namespace | `REDIS_URL`; probe sends `PING` |
| Private S3 storage | Originals, media, packets, exports | Dedicated private bucket CRUD | S3 variables; metadata-read probe |
| DeepSeek | Optional AI assistance | Inference only | `DEEPSEEK_API_KEY`; read-only/minimal authorized probe |
| Transactional email | Verification, alerts, challenge notices | One verified sending domain | `SMTP_URL`; connection/auth probe |
| SMS | Optional high-risk challenge notices | Restricted messaging service | Optional presence and sandbox probe |
| Stripe | Subscription billing | Restricted test key | Account-metadata probe |
| KMS | Production envelope encryption | Encrypt/decrypt for dedicated key only | Required for production, optional local development |
| Legal approval | Terms, privacy, child-data, release, consent | Written qualified-counsel approval | Evidence reference only after approval |
| Vendor risk approval | AI, email, SMS, storage, monitoring, media | Signed internal review | Evidence reference only after approval |
| Cyber/E&O insurance | Residual liability | Active suitable policy | Evidence reference only after confirmation |
| Production authorization | Prevent irreversible release | Explicit operator approval | `AUTO_DEPLOY_AUTHORIZED=no` by default |

PREFLIGHT-TABLE-BEGIN
DATABASE_URL|REQUIRED|scripts/probes/database_url.sh
REDIS_URL|REQUIRED|scripts/probes/redis_url.sh
S3_ENDPOINT|REQUIRED|scripts/probes/s3_endpoint.sh
S3_ACCESS_KEY_ID|REQUIRED|-
S3_SECRET_ACCESS_KEY|REQUIRED|-
S3_BUCKET|REQUIRED|-
SESSION_SECRET|REQUIRED|-
FIELD_ENCRYPTION_KEY|REQUIRED|-
DEEPSEEK_API_KEY|OPTIONAL|scripts/probes/deepseek_api_key.sh
SMTP_URL|OPTIONAL|scripts/probes/smtp_url.sh
SMS_PROVIDER_TOKEN|OPTIONAL|-
STRIPE_SECRET_KEY|OPTIONAL|scripts/probes/stripe_secret_key.sh
STRIPE_WEBHOOK_SECRET|OPTIONAL|-
KMS_KEY_ID|OPTIONAL|-
SENTRY_DSN|OPTIONAL|-
LEGAL_APPROVAL_RECORD|OPTIONAL|-
VENDOR_RISK_APPROVAL_RECORD|OPTIONAL|-
INSURANCE_EVIDENCE_RECORD|OPTIONAL|-
PRODUCTION_EVIDENCE_FILE|OPTIONAL|-
PRODUCTION_EVIDENCE_SHA256|OPTIONAL|-
PRODUCTION_BASE_URL|OPTIONAL|-
RELEASE_COMMIT|OPTIONAL|-
PRODUCTION_MANIFEST|OPTIONAL|-
PRODUCTION_MANIFEST_SHA256|OPTIONAL|-
ROLLBACK_MANIFEST|OPTIONAL|-
ROLLBACK_MANIFEST_SHA256|OPTIONAL|-
KUBERNETES_CONTEXT|OPTIONAL|-
PRODUCTION_NAMESPACE|OPTIONAL|-
ROLLBACK_AUTHORIZED|OPTIONAL|-
AUTO_DEPLOY_AUTHORIZED|REQUIRED|-
PREFLIGHT-TABLE-END

## Fail-closed rules
Missing optional providers do not justify fabricated success. Local real services may satisfy engineering tests. Production remains blocked until required legal, vendor, insurance, KMS, domain, deployment, and policy evidence exists. Prohibited secrets are never sent to external AI or included in packets.
