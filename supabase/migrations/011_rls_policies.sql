-- Migration 011: Row Level Security Policies
-- Covers all tables from SM 1.1 (tenants, users) and SM 1.2 (jobs through sops).

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

-- Operators and techs see only their own tenant
CREATE POLICY "tenants_select_own"
  ON tenants FOR SELECT
  USING (id = get_user_tenant_id());

-- Only operators can update their tenant record
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

-- All users in same tenant can see each other (for tech assignment lists etc.)
CREATE POLICY "users_select_same_tenant"
  ON users FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- Only operators (and admins) can add new users to their tenant
CREATE POLICY "users_insert_operator"
  ON users FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

-- Operators can update users in their tenant; users can update themselves
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

-- Operators see all jobs in their tenant; techs see only their assigned jobs
CREATE POLICY "jobs_select"
  ON jobs FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    AND (
      get_user_role() IN ('operator', 'admin')
      OR assigned_tech_id = auth.uid()
    )
  );

-- Operators create jobs; service role creates jobs from SMS/web sources
CREATE POLICY "jobs_insert_operator"
  ON jobs FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

-- Operators update any job in their tenant; techs update status on their own jobs
CREATE POLICY "jobs_update_operator"
  ON jobs FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

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

-- All tenant members can see events (operators need full audit trail)
CREATE POLICY "job_events_select"
  ON job_events FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- Any authenticated tenant member can append events (status changes, notes, etc.)
CREATE POLICY "job_events_insert"
  ON job_events FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

-- No UPDATE or DELETE — events are immutable

-- ============================================================
-- JOB PHOTOS
-- ============================================================

-- All tenant members can view photos
CREATE POLICY "job_photos_select"
  ON job_photos FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- Operators can upload any photo; techs can only upload to their assigned jobs
CREATE POLICY "job_photos_insert_operator"
  ON job_photos FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

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

-- All tenant members can read pricing (techs need it for quoting)
CREATE POLICY "pricing_rules_select"
  ON pricing_rules FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- Only operators manage pricing
CREATE POLICY "pricing_rules_insert_operator"
  ON pricing_rules FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

CREATE POLICY "pricing_rules_update_operator"
  ON pricing_rules FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

-- ============================================================
-- LOCATION FEES
-- ============================================================

CREATE POLICY "location_fees_select"
  ON location_fees FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "location_fees_insert_operator"
  ON location_fees FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

CREATE POLICY "location_fees_update_operator"
  ON location_fees FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

-- ============================================================
-- MESSAGES
-- ============================================================

-- Operators see all messages; techs see messages linked to their jobs
CREATE POLICY "messages_select_operator"
  ON messages FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

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

-- Operators see all review requests in their tenant
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

-- Users see only their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    AND user_id = auth.uid()
  );

-- Users can mark their own notifications as read
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

-- Published SOPs visible to all tenant members; drafts only to operators
CREATE POLICY "sop_documents_select"
  ON sop_documents FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    AND (
      is_published = TRUE
      OR get_user_role() IN ('operator', 'admin')
    )
  );

-- Only operators author SOPs
CREATE POLICY "sop_documents_insert_operator"
  ON sop_documents FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

CREATE POLICY "sop_documents_update_operator"
  ON sop_documents FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() IN ('operator', 'admin')
  );

-- No DELETE — set is_published = FALSE to retire a document
