-- Migration 011: Row Level Security Policies
-- Covers all tables from SM 1.1 (tenants, users) and SM 1.2 (jobs through sops).
-- DROP POLICY IF EXISTS before each CREATE keeps this migration safe when the remote
-- DB already had policies from a prior partial setup or manual SQL.

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_fees    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_documents    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- These functions are SECURITY DEFINER so they execute with the
-- privileges of the function owner (postgres), not the calling user.
-- This prevents RLS recursion when policies query the users table.
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$;

-- ============================================================
-- TENANTS
-- ============================================================

DROP POLICY IF EXISTS "tenants_select_own" ON tenants;
CREATE POLICY "tenants_select_own"
  ON tenants FOR SELECT
  USING (id = get_user_tenant_id());

DROP POLICY IF EXISTS "tenants_update_operator" ON tenants;
CREATE POLICY "tenants_update_operator"
  ON tenants FOR UPDATE
  USING (
    id = get_user_tenant_id()
    AND get_user_role() = 'operator'
  );

-- Inserts are service-role only (tenant creation happens via onboarding API)
-- No INSERT policy for authenticated users — service_role bypasses RLS

-- ============================================================
-- USERS
-- ============================================================

DROP POLICY IF EXISTS "users_select_same_tenant" ON users;
CREATE POLICY "users_select_same_tenant"
  ON users FOR SELECT
  USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "users_insert_operator" ON users;
CREATE POLICY "users_insert_operator"
  ON users FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

DROP POLICY IF EXISTS "users_update_operator_or_self" ON users;
CREATE POLICY "users_update_operator_or_self"
  ON users FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    AND (
      get_user_role() IN ('operator', 'admin')
      OR id = auth.uid()
    )
  );

-- No DELETE — users are deactivated, not deleted (audit trail)

-- ============================================================
-- JOBS
-- ============================================================

DROP POLICY IF EXISTS "jobs_select" ON jobs;
CREATE POLICY "jobs_select"
  ON jobs FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    AND (
      get_user_role() IN ('operator', 'admin')
      OR assigned_tech_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "jobs_insert_operator" ON jobs;
CREATE POLICY "jobs_insert_operator"
  ON jobs FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

DROP POLICY IF EXISTS "jobs_update_operator" ON jobs;
CREATE POLICY "jobs_update_operator"
  ON jobs FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

DROP POLICY IF EXISTS "jobs_update_assigned_tech" ON jobs;
CREATE POLICY "jobs_update_assigned_tech"
  ON jobs FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() = 'tech'
    AND assigned_tech_id = auth.uid()
  );

-- No DELETE — jobs are cancelled, not deleted (audit trail + customer tracking)

-- ============================================================
-- JOB EVENTS
-- ============================================================

DROP POLICY IF EXISTS "job_events_select" ON job_events;
CREATE POLICY "job_events_select"
  ON job_events FOR SELECT
  USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "job_events_insert" ON job_events;
CREATE POLICY "job_events_insert"
  ON job_events FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- No UPDATE or DELETE — events are immutable

-- ============================================================
-- JOB PHOTOS
-- ============================================================

DROP POLICY IF EXISTS "job_photos_select" ON job_photos;
CREATE POLICY "job_photos_select"
  ON job_photos FOR SELECT
  USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "job_photos_insert_operator" ON job_photos;
CREATE POLICY "job_photos_insert_operator"
  ON job_photos FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

DROP POLICY IF EXISTS "job_photos_insert_assigned_tech" ON job_photos;
CREATE POLICY "job_photos_insert_assigned_tech"
  ON job_photos FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() = 'tech'
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_photos.job_id
        AND jobs.assigned_tech_id = auth.uid()
    )
  );

-- ============================================================
-- PRICING RULES
-- ============================================================

DROP POLICY IF EXISTS "pricing_rules_select" ON pricing_rules;
CREATE POLICY "pricing_rules_select"
  ON pricing_rules FOR SELECT
  USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "pricing_rules_insert_operator" ON pricing_rules;
CREATE POLICY "pricing_rules_insert_operator"
  ON pricing_rules FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

DROP POLICY IF EXISTS "pricing_rules_update_operator" ON pricing_rules;
CREATE POLICY "pricing_rules_update_operator"
  ON pricing_rules FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

-- ============================================================
-- LOCATION FEES
-- ============================================================

DROP POLICY IF EXISTS "location_fees_select" ON location_fees;
CREATE POLICY "location_fees_select"
  ON location_fees FOR SELECT
  USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "location_fees_insert_operator" ON location_fees;
CREATE POLICY "location_fees_insert_operator"
  ON location_fees FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

DROP POLICY IF EXISTS "location_fees_update_operator" ON location_fees;
CREATE POLICY "location_fees_update_operator"
  ON location_fees FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

-- ============================================================
-- MESSAGES
-- ============================================================

DROP POLICY IF EXISTS "messages_select_operator" ON messages;
CREATE POLICY "messages_select_operator"
  ON messages FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

DROP POLICY IF EXISTS "messages_select_tech" ON messages;
CREATE POLICY "messages_select_tech"
  ON messages FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() = 'tech'
    AND job_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = messages.job_id
        AND jobs.assigned_tech_id = auth.uid()
    )
  );

-- No INSERT policy for authenticated users — messages are written by webhook handlers (service role)

-- ============================================================
-- REVIEW REQUESTS
-- ============================================================

DROP POLICY IF EXISTS "review_requests_select" ON review_requests;
CREATE POLICY "review_requests_select"
  ON review_requests FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

-- No INSERT — written by service role on job completion

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    AND user_id = auth.uid()
  );

-- No INSERT — written by service role only

-- ============================================================
-- SOP DOCUMENTS
-- ============================================================

DROP POLICY IF EXISTS "sop_documents_select" ON sop_documents;
CREATE POLICY "sop_documents_select"
  ON sop_documents FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    AND (
      is_published = TRUE
      OR get_user_role() IN ('operator', 'admin')
    )
  );

DROP POLICY IF EXISTS "sop_documents_insert_operator" ON sop_documents;
CREATE POLICY "sop_documents_insert_operator"
  ON sop_documents FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

DROP POLICY IF EXISTS "sop_documents_update_operator" ON sop_documents;
CREATE POLICY "sop_documents_update_operator"
  ON sop_documents FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

-- No DELETE — set is_published = FALSE to retire a document
