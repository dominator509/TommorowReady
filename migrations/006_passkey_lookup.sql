BEGIN;
CREATE INDEX IF NOT EXISTS identities_user_lookup_idx
  ON identities (tenant_id, (payload->>'userId'))
  WHERE payload ? 'userId';
INSERT INTO app.schema_migrations(version) VALUES ('006_passkey_lookup') ON CONFLICT DO NOTHING;
COMMIT;
