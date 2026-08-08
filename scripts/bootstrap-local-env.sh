#!/usr/bin/env sh
set -eu

[ ! -f .env ] || { echo "local env: exists"; exit 0; }
umask 077
postgres_password=$(openssl rand -hex 24)
postgres_app_password=$(openssl rand -hex 24)
s3_secret=$(openssl rand -hex 24)
session_secret=$(openssl rand -hex 32)
auth_lookup_secret=$(openssl rand -hex 32)
recovery_token_secret=$(openssl rand -hex 32)
field_encryption_key=$(openssl rand -base64 32 | tr -d '\r\n')
backup_encryption_key=$(openssl rand -base64 32 | tr -d '\r\n')

{
  printf '%s\n' "# Generated local-only credentials. Never use these values in production."
  printf 'POSTGRES_PASSWORD=%s\n' "$postgres_password"
  printf 'POSTGRES_APP_PASSWORD=%s\n' "$postgres_app_password"
  printf 'DATABASE_MIGRATION_URL=postgresql://tomorrowready:%s@127.0.0.1:25432/tomorrowready\n' "$postgres_password"
  printf 'DATABASE_URL=postgresql://tomorrowready_app:%s@127.0.0.1:25432/tomorrowready\n' "$postgres_app_password"
  printf '%s\n' 'REDIS_URL=redis://127.0.0.1:26379/0'
  printf '%s\n' 'S3_ENDPOINT=http://127.0.0.1:29000'
  printf '%s\n' 'S3_ACCESS_KEY_ID=local_tomorrowready'
  printf 'S3_SECRET_ACCESS_KEY=%s\n' "$s3_secret"
  printf '%s\n' 'S3_BUCKET=tomorrowready-private'
  printf 'SESSION_SECRET=%s\n' "$session_secret"
  printf 'AUTH_LOOKUP_SECRET=%s\n' "$auth_lookup_secret"
  printf 'RECOVERY_TOKEN_SECRET=%s\n' "$recovery_token_secret"
  printf 'FIELD_ENCRYPTION_KEY=%s\n' "$field_encryption_key"
  printf 'BACKUP_ENCRYPTION_KEY=%s\n' "$backup_encryption_key"
  printf '%s\n' 'DEEPSEEK_API_KEY='
  printf '%s\n' 'SMTP_URL=smtp://127.0.0.1:1125'
  printf '%s\n' 'SMS_PROVIDER_TOKEN='
  printf '%s\n' 'STRIPE_SECRET_KEY='
  printf '%s\n' 'STRIPE_WEBHOOK_SECRET='
  printf '%s\n' 'KMS_KEY_ID='
  printf '%s\n' 'SENTRY_DSN='
  printf '%s\n' 'LEGAL_APPROVAL_RECORD='
  printf '%s\n' 'VENDOR_RISK_APPROVAL_RECORD='
  printf '%s\n' 'INSURANCE_EVIDENCE_RECORD='
  printf '%s\n' 'AUTO_DEPLOY_AUTHORIZED=no'
  printf '%s\n' 'NODE_ENV=development'
  printf '%s\n' 'LOG_LEVEL=info'
  printf '%s\n' 'APP_BASE_URL=http://127.0.0.1:3000'
  printf '%s\n' 'API_BASE_URL=http://127.0.0.1:3001'
  printf '%s\n' 'PASSKEY_RP_ID=127.0.0.1'
  printf '%s\n' 'PASSKEY_ORIGIN=http://127.0.0.1:3000'
} > .env

echo "local env: ok"
