-- Migration 002: Users (platform profiles)
-- Extends auth.users with role and tenant membership

CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('operator', 'tech', 'admin')),
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  avatar_url TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (tenant_id, role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_tenant
  ON users (phone, tenant_id)
  WHERE phone IS NOT NULL;

COMMENT ON TABLE users IS 'Platform profile rows — one per auth.users row. Contains tenant membership and role.';
COMMENT ON COLUMN users.role IS 'operator: manages the business. tech: field worker. admin: internal platform admin.';
