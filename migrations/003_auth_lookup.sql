BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS identities_email_lookup_unique
  ON identities (tenant_id, (payload->>'emailLookup'))
  WHERE payload ? 'emailLookup';
INSERT INTO app.schema_migrations(version) VALUES ('003_auth_lookup') ON CONFLICT DO NOTHING;
COMMIT;
