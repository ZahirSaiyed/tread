-- Migration 006: Pricing
-- Two tables: service pricing rules and location-based travel fees.
-- Operators configure these; the job-creation flow resolves the final price.

-- ============================================================
-- PRICING RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_type    TEXT        NOT NULL
                    CHECK (service_type IN (
                      'mount_balance','tire_repair','wheel_repair',
                      'jumpstart','spare_installation','tire_rotation',
                      'tire_balancing','tpms_service','oil_change','brake_service'
                    )),
  service_variant TEXT,
  price_cents     INTEGER     NOT NULL CHECK (price_cents >= 0),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active rule per (tenant, service_type, variant) combination
  CONSTRAINT pricing_rules_unique_active
    UNIQUE NULLS NOT DISTINCT (tenant_id, service_type, service_variant)
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant ON pricing_rules (tenant_id, service_type) WHERE is_active = TRUE;

COMMENT ON TABLE  pricing_rules                 IS 'Per-tenant base pricing. service_variant NULL means the rule applies to all variants of the service_type.';
COMMENT ON COLUMN pricing_rules.service_variant IS 'NULL = catch-all for the service_type. Variant-specific rule takes precedence.';
COMMENT ON COLUMN pricing_rules.price_cents     IS 'Base price before any location or after-hours fees are applied.';

-- ============================================================
-- LOCATION FEES
-- ============================================================
CREATE TABLE IF NOT EXISTS location_fees (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  city         TEXT        NOT NULL,
  state_code   TEXT        NOT NULL,
  country_code TEXT        NOT NULL DEFAULT 'US',
  fee_cents    INTEGER     NOT NULL CHECK (fee_cents >= 0),
  fee_tier     INTEGER     NOT NULL CHECK (fee_tier BETWEEN 1 AND 5),
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT location_fees_unique_active
    UNIQUE (tenant_id, city, state_code, country_code)
);

CREATE INDEX IF NOT EXISTS idx_location_fees_tenant ON location_fees (tenant_id) WHERE is_active = TRUE;

COMMENT ON TABLE  location_fees          IS 'Travel fee per city. fee_cents is the flat travel charge added on top of service pricing.';
COMMENT ON COLUMN location_fees.fee_tier IS 'Maps to FEE_TIER_AMOUNTS in enums.ts. Tier 1 = home base ($100), Tier 5 = far suburbs ($175).';
