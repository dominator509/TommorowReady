BEGIN;
DO $$
DECLARE table_name text;
DECLARE tables text[] := ARRAY['users','identities','tenants','households','memberships','people','dependents','children','pets','relationships','helper_grants','professional_contacts','emergency_contacts','account_locators','assets','debts','insurance_records','properties','storage_units','document_locations','documents','document_versions','extracted_candidates','confirmed_facts','playbooks','playbook_sections','funeral_wishes','letters','video_messages','advice_items','photos','recipes','evidence_references','readiness_rule_versions','readiness_results','family_iq_gaps','packet_definitions','packet_manifests','packet_manifest_items','packet_recipients','emergency_policies','access_requests','verification_evidence','challenges','denials','release_authorizations','released_packets','consents','annual_reviews','privacy_requests','exports','audit_events','outbox_events','inbox_events','jobs','subscriptions','ai_usage'];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_tenant_policy', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id::text = current_setting(''app.tenant_id'', true) AND (household_id IS NULL OR household_id::text = nullif(current_setting(''app.household_id'', true), ''''))) WITH CHECK (tenant_id::text = current_setting(''app.tenant_id'', true) AND (household_id IS NULL OR household_id::text = nullif(current_setting(''app.household_id'', true), '''')))',
      table_name || '_tenant_policy',
      table_name
    );
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', table_name, table_name || '_payload_object');
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (jsonb_typeof(payload) = ''object'')', table_name, table_name || '_payload_object');
  END LOOP;
END $$;

DO $$
DECLARE table_name text;
DECLARE tables text[] := ARRAY['verification_evidence','release_authorizations','packet_manifests','document_versions','evidence_references'];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', table_name || '_append_only', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION app.prevent_mutation()',
      table_name || '_append_only',
      table_name
    );
  END LOOP;
END $$;

INSERT INTO app.schema_migrations(version) VALUES ('002_security_hardening') ON CONFLICT DO NOTHING;
COMMIT;
