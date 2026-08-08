BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_id_unique
  ON subscriptions (tenant_id, (payload->>'providerSubscriptionId'))
  WHERE payload ? 'providerSubscriptionId';
INSERT INTO app.schema_migrations(version) VALUES ('004_billing_idempotency') ON CONFLICT DO NOTHING;
COMMIT;
