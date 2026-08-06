BEGIN;
CREATE SCHEMA IF NOT EXISTS app;
CREATE TABLE IF NOT EXISTS app.schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE OR REPLACE FUNCTION app.prevent_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'append-only table'; END $$;
DO $$
DECLARE table_name text;
DECLARE tables text[] := ARRAY['users','identities','tenants','households','memberships','people','dependents','children','pets','relationships','helper_grants','professional_contacts','emergency_contacts','account_locators','assets','debts','insurance_records','properties','storage_units','document_locations','documents','document_versions','extracted_candidates','confirmed_facts','playbooks','playbook_sections','funeral_wishes','letters','video_messages','advice_items','photos','recipes','evidence_references','readiness_rule_versions','readiness_results','family_iq_gaps','packet_definitions','packet_manifests','packet_manifest_items','packet_recipients','emergency_policies','access_requests','verification_evidence','challenges','denials','release_authorizations','released_packets','consents','annual_reviews','privacy_requests','exports','audit_events','outbox_events','inbox_events','jobs','subscriptions','ai_usage'];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I (id uuid PRIMARY KEY, tenant_id uuid NOT NULL, household_id uuid, payload jsonb NOT NULL DEFAULT ''{}''::jsonb, version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())', table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id, household_id)', table_name || '_tenant_household_idx', table_name);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name AND policyname = table_name || '_tenant_policy') THEN
      EXECUTE format('CREATE POLICY %I ON %I USING (tenant_id::text = current_setting(''app.tenant_id'', true)) WITH CHECK (tenant_id::text = current_setting(''app.tenant_id'', true))', table_name || '_tenant_policy', table_name);
    END IF;
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS packet_manifests_hash_unique ON packet_manifests (tenant_id, (payload->>'hash'));
CREATE UNIQUE INDEX IF NOT EXISTS inbox_idempotency_unique ON inbox_events (tenant_id, (payload->>'idempotencyKey'));
CREATE UNIQUE INDEX IF NOT EXISTS outbox_idempotency_unique ON outbox_events (tenant_id, (payload->>'idempotencyKey'));
DROP TRIGGER IF EXISTS audit_events_append_only ON audit_events;
CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION app.prevent_mutation();
DROP TRIGGER IF EXISTS consents_append_only ON consents;
CREATE TRIGGER consents_append_only BEFORE UPDATE OR DELETE ON consents FOR EACH ROW EXECUTE FUNCTION app.prevent_mutation();
DROP TRIGGER IF EXISTS released_packets_append_only ON released_packets;
CREATE TRIGGER released_packets_append_only BEFORE UPDATE OR DELETE ON released_packets FOR EACH ROW EXECUTE FUNCTION app.prevent_mutation();
INSERT INTO app.schema_migrations(version) VALUES ('001_initial') ON CONFLICT DO NOTHING;
GRANT USAGE ON SCHEMA public, app TO tomorrowready_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tomorrowready_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tomorrowready_app;
COMMIT;
