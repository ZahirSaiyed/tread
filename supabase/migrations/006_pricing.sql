-- Migration 006: Pricing
-- Two tables: service pricing rules (line-item model) and location-based travel fees.

-- ============================================================
-- PRICING RULES
-- ============================================================
-- Each row represents base pricing for a (service_type, vehicle_class, location_type) combination.
-- The quote engine applies quantity and computes all six line items from a single rule row.
CREATE TABLE IF NOT EXISTS pricing_rules (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_type        TEXT        NOT NULL
                        CHECK (service_type IN (
                          'mount_balance','tire_repair','wheel_repair',
                          'jumpstart','spare_installation','tire_rotation',
                          'tire_balancing','tpms_service','oil_change','brake_service'
                        )),
  vehicle_class       TEXT        NOT NULL DEFAULT 'standard'
                        CHECK (vehicle_class IN ('standard','suv','truck','lt','specialty')),
  location_type       TEXT        NOT NULL DEFAULT 'suburban'
                        CHECK (location_type IN ('suburban','highway')),
  base_price_cents    INTEGER     NOT NULL DEFAULT 0 CHECK (base_price_cents >= 0),
  mobile_fee_cents    INTEGER     NOT NULL DEFAULT 0 CHECK (mobile_fee_cents >= 0),
  disposal_fee_cents  INTEGER     NOT NULL DEFAULT 0 CHECK (disposal_fee_cents >= 0),
  tax_rate            DECIMAL(6,5) NOT NULL DEFAULT 0.06000,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pricing_rules_unique
    UNIQUE (tenant_id, service_type, vehicle_class, location_type)
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_lookup
  ON pricing_rules (tenant_id, service_type, vehicle_class, location_type)
  WHERE is_active = TRUE;

COMMENT ON TABLE  pricing_rules                    IS 'Per-tenant service pricing. One row per (service, vehicle_class, location_type) combination.';
COMMENT ON COLUMN pricing_rules.base_price_cents   IS 'Per-unit service fee (e.g. per tire for mount & balance).';
COMMENT ON COLUMN pricing_rules.mobile_fee_cents   IS 'Flat dispatch/travel fee per job (not per unit).';
COMMENT ON COLUMN pricing_rules.disposal_fee_cents IS 'Per-unit disposal/environmental fee (e.g. per tire disposed).';
COMMENT ON COLUMN pricing_rules.tax_rate           IS 'Decimal tax rate, e.g. 0.06000 = 6.000%. Applied to (base + mobile + disposal + wheel_lock) subtotal.';

-- ============================================================
-- LOCATION FEES
-- Supplementary city-level travel fee data. Provides finer
-- granularity than location_type when city is known at quote time.
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

  CONSTRAINT location_fees_unique_city
    UNIQUE (tenant_id, city, state_code, country_code)
);

CREATE INDEX IF NOT EXISTS idx_location_fees_tenant ON location_fees (tenant_id) WHERE is_active = TRUE;

COMMENT ON TABLE  location_fees          IS 'Optional per-city travel fee overlay. When city is known, overrides pricing_rules.mobile_fee_cents.';
COMMENT ON COLUMN location_fees.fee_tier IS 'Maps to FEE_TIER_AMOUNTS in enums.ts. Tier 1 = home base ($100), Tier 5 = far/highway ($175).';
