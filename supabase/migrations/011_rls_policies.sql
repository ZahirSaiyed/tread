-- Migration 011: Row Level Security Policies
-- Applied after all tables are created (SM 1.2 adds the remaining tables)
-- This file contains policies for tables created in SM 1.1 (tenants, users)
-- Additional policies are added to this file in SM 1.2

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

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
