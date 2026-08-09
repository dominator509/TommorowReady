BEGIN;

DO $$
DECLARE table_name text;
DECLARE tables text[] := ARRAY[
  'continuity_monitors',
  'recipient_delivery_profiles',
  'recipient_postal_addresses',
  'release_delivery_tokens',
  'release_artifacts',
  'physical_mail_orders',
  'physical_mail_events'
];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I (id uuid PRIMARY KEY, tenant_id uuid NOT NULL, household_id uuid NOT NULL, payload jsonb NOT NULL DEFAULT ''{}''::jsonb, version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())', table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id, household_id)', table_name || '_tenant_household_idx', table_name);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name AND policyname = table_name || '_tenant_policy') THEN
      EXECUTE format('CREATE POLICY %I ON %I USING (tenant_id::text = current_setting(''app.tenant_id'', true)) WITH CHECK (tenant_id::text = current_setting(''app.tenant_id'', true))', table_name || '_tenant_policy', table_name);
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS release_delivery_tokens_hash_unique
  ON release_delivery_tokens (tenant_id, (payload->>'tokenHash'))
  WHERE payload ? 'tokenHash';
CREATE UNIQUE INDEX IF NOT EXISTS physical_mail_orders_idempotency_unique
  ON physical_mail_orders (tenant_id, (payload->>'idempotencyKey'))
  WHERE payload ? 'idempotencyKey';
CREATE UNIQUE INDEX IF NOT EXISTS physical_mail_events_provider_event_unique
  ON physical_mail_events (tenant_id, (payload->>'providerEventKey'))
  WHERE payload ? 'providerEventKey';
CREATE INDEX IF NOT EXISTS continuity_monitors_due_idx
  ON continuity_monitors ((payload->>'state'), ((payload->>'nextActionEpochMs')::bigint));

DROP TRIGGER IF EXISTS release_artifacts_append_only ON release_artifacts;
CREATE TRIGGER release_artifacts_append_only BEFORE UPDATE OR DELETE ON release_artifacts FOR EACH ROW EXECUTE FUNCTION app.prevent_mutation();
DROP TRIGGER IF EXISTS physical_mail_events_append_only ON physical_mail_events;
CREATE TRIGGER physical_mail_events_append_only BEFORE UPDATE OR DELETE ON physical_mail_events FOR EACH ROW EXECUTE FUNCTION app.prevent_mutation();

GRANT SELECT, INSERT, UPDATE, DELETE ON continuity_monitors, recipient_delivery_profiles,
  recipient_postal_addresses, release_delivery_tokens, release_artifacts, physical_mail_orders,
  physical_mail_events TO tomorrowready_app;

INSERT INTO app.schema_migrations(version) VALUES ('007_automated_release') ON CONFLICT DO NOTHING;
COMMIT;
