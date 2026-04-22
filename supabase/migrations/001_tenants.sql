-- Migration 001: Tenants
-- Run first — every other table references this one

CREATE TABLE IF NOT EXISTS tenants (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  slug                      TEXT NOT NULL UNIQUE,
  logo_url                  TEXT,
  primary_color             TEXT NOT NULL DEFAULT '#F5A623',
  twilio_number             TEXT UNIQUE,
  stripe_account_id         TEXT,
  plan_tier                 TEXT NOT NULL DEFAULT 'starter'
                              CHECK (plan_tier IN ('starter', 'pro', 'enterprise')),
  after_hours_fee_cents     INTEGER NOT NULL DEFAULT 7500,
  after_hours_start         TIME NOT NULL DEFAULT '22:00',
  after_hours_end           TIME NOT NULL DEFAULT '08:00',
  highway_minimum_fee_cents INTEGER NOT NULL DEFAULT 17500,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug);

COMMENT ON TABLE tenants IS 'One row per operator. All other tables are scoped to a tenant via tenant_id.';
COMMENT ON COLUMN tenants.after_hours_fee_cents IS 'Flat fee added when job time is outside business hours.';
COMMENT ON COLUMN tenants.highway_minimum_fee_cents IS 'Highway travel fee is max(city_fee, highway_minimum). Not additive.';
