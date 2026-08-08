# Environment

Node.js 24.x, pnpm 10.x through Corepack, Docker 27+, PostgreSQL client 17+, Git 2.45+, curl, jq, OpenSSL, and POSIX sh are required. Local uses Docker Compose services. Test uses isolated databases and buckets. Staging mirrors production providers with sandbox accounts. Production uses secret management and manual approval. Every environment variable is validated at startup; unknown production variables fail review, missing required variables fail startup, and secrets are redacted.

## Local bootstrap

Run `sh scripts/bootstrap-local-env.sh`, then `docker compose up -d --wait`. The generated `.env` is ignored, mode-restricted where supported, and contains distinct local-only PostgreSQL owner/application, S3, session-signing, authentication-lookup, recovery-token, field-encryption, and backup-encryption credentials. `DATABASE_MIGRATION_URL` and `POSTGRES_PASSWORD` are migration/infrastructure-only; the application uses the non-superuser, non-bypass-RLS `DATABASE_URL`. `PASSKEY_RP_ID` and `PASSKEY_ORIGIN` must exactly match the browser relying-party domain and origin; local uses `127.0.0.1` and `http://127.0.0.1:3000`, while production requires its approved HTTPS origin. Mailpit captures real SMTP recovery traffic locally. Optional external providers remain unset and fail closed.

Observed host baseline on 2026-08-06: Node 24.14.1, Docker 29.5.3, Compose 5.1.4, Git 2.55.0, PostgreSQL client 18.4. Corepack initially exposed pnpm 9.15.0; the repository must pin and activate pnpm 10.x in EP-001. Host `redis-cli` is absent, so the read-only Redis probe uses the real Valkey container CLI.
