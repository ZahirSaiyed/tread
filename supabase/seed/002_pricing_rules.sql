-- Seed 002: TRS Pricing Rules
-- Base service pricing for TRS Mobile Tire Shop (Woodbridge, VA).
-- All prices in cents. Location travel fees are separate (see 003_location_fees seed when added).

DO $$
DECLARE
  TRS UUID := 'a1b2c3d4-0000-0000-0000-000000000001';
BEGIN

-- ============================================================
-- MOUNT & BALANCE (per tire)
-- ============================================================
INSERT INTO pricing_rules (tenant_id, service_type, service_variant, price_cents) VALUES
  (TRS, 'mount_balance', 'stock',       3500),   -- $35 standard passenger
  (TRS, 'mount_balance', 'aftermarket', 4500),   -- $45 aftermarket/low-profile
  (TRS, 'mount_balance', 'lt',          5500),   -- $55 light truck
  (TRS, 'mount_balance', 'extreme',     7500),   -- $75 mud-terrain / oversized
  (TRS, 'mount_balance', 'beadlock',    10000)   -- $100 beadlock (off-road)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TIRE REPAIR
-- ============================================================
INSERT INTO pricing_rules (tenant_id, service_type, service_variant, price_cents) VALUES
  (TRS, 'tire_repair', 'plug',          2500),   -- $25 plug only (roadside)
  (TRS, 'tire_repair', 'patch',         3500),   -- $35 patch (shop-quality)
  (TRS, 'tire_repair', 'plug_n_patch',  4000)    -- $40 combo (most durable)
ON CONFLICT DO NOTHING;

-- ============================================================
-- WHEEL REPAIR
-- ============================================================
INSERT INTO pricing_rules (tenant_id, service_type, service_variant, price_cents) VALUES
  (TRS, 'wheel_repair', 'oem_crack',       12500),  -- $125 OEM crack repair
  (TRS, 'wheel_repair', 'aftermarket',     15000),  -- $150 aftermarket wheel
  (TRS, 'wheel_repair', 'aluminum_bent',   10000),  -- $100 bent aluminum
  (TRS, 'wheel_repair', 'steel_bent',       7500)   -- $75 bent steel
ON CONFLICT DO NOTHING;

-- ============================================================
-- STANDALONE SERVICES (no variant)
-- ============================================================
INSERT INTO pricing_rules (tenant_id, service_type, service_variant, price_cents) VALUES
  (TRS, 'jumpstart',          NULL,  7500),  -- $75
  (TRS, 'spare_installation', NULL,  5000),  -- $50 (mount spare, store flat)
  (TRS, 'tire_rotation',      NULL,  6000),  -- $60 (4-tire rotation)
  (TRS, 'tire_balancing',     NULL,  8000),  -- $80 (4-tire balance)
  (TRS, 'tpms_service',       NULL,  3500),  -- $35 per sensor (1 sensor)
  (TRS, 'oil_change',         NULL,  7500),  -- $75 conventional
  (TRS, 'brake_service',      NULL, 15000)   -- $150 brake pad replacement (per axle)
ON CONFLICT DO NOTHING;

END $$;
