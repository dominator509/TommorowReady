BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS released_packets_access_request_unique
  ON released_packets (tenant_id, (payload->>'accessRequestId'))
  WHERE payload ? 'accessRequestId';
INSERT INTO app.schema_migrations(version) VALUES ('005_release_idempotency') ON CONFLICT DO NOTHING;
COMMIT;
