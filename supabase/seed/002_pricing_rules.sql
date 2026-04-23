-- Seed 002: TRS Pricing Rules
-- Tony's actual pricing for TRS Mobile Tire Shop (Woodbridge, VA).
-- Columns: service_type, vehicle_class, location_type, base_price_cents, mobile_fee_cents, disposal_fee_cents, tax_rate
-- base_price_cents is per-unit (per tire for mount/balance/repair); mobile_fee is flat per job.
-- Virginia combined sales tax rate: 6.0% (5.3% state + 0.7% local — standard NoVA).

DO $$
DECLARE
  TRS UUID := 'a1b2c3d4-0000-0000-0000-000000000001';
BEGIN

-- ============================================================
-- MOUNT & BALANCE  (per tire, suburban)
-- ============================================================
INSERT INTO pricing_rules (tenant_id, service_type, vehicle_class, location_type, base_price_cents, mobile_fee_cents, disposal_fee_cents, tax_rate) VALUES
  (TRS, 'mount_balance', 'standard',  'suburban',  3500, 10000,  500, 0.06000),  -- $35/tire, $100 mobile, $5 disposal
  (TRS, 'mount_balance', 'suv',       'suburban',  4200, 10000,  500, 0.06000),  -- $42/tire
  (TRS, 'mount_balance', 'truck',     'suburban',  5000, 10000,  500, 0.06000),  -- $50/tire
  (TRS, 'mount_balance', 'lt',        'suburban',  5500, 10000,  500, 0.06000),  -- $55/tire
  (TRS, 'mount_balance', 'specialty', 'suburban',  6500, 10000,  500, 0.06000)   -- $65/tire (low-profile/run-flat)
ON CONFLICT DO NOTHING;

-- MOUNT & BALANCE  (per tire, highway)
INSERT INTO pricing_rules (tenant_id, service_type, vehicle_class, location_type, base_price_cents, mobile_fee_cents, disposal_fee_cents, tax_rate) VALUES
  (TRS, 'mount_balance', 'standard',  'highway',   3500, 17500,  500, 0.06000),  -- highway mobile = $175
  (TRS, 'mount_balance', 'suv',       'highway',   4200, 17500,  500, 0.06000),
  (TRS, 'mount_balance', 'truck',     'highway',   5000, 17500,  500, 0.06000),
  (TRS, 'mount_balance', 'lt',        'highway',   5500, 17500,  500, 0.06000),
  (TRS, 'mount_balance', 'specialty', 'highway',   6500, 17500,  500, 0.06000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TIRE REPAIR  (per repair, plug/patch — variant captured on job)
-- ============================================================
INSERT INTO pricing_rules (tenant_id, service_type, vehicle_class, location_type, base_price_cents, mobile_fee_cents, disposal_fee_cents, tax_rate) VALUES
  (TRS, 'tire_repair', 'standard',  'suburban',  2500, 10000, 0, 0.06000),  -- $25 flat repair
  (TRS, 'tire_repair', 'suv',       'suburban',  3000, 10000, 0, 0.06000),  -- $30
  (TRS, 'tire_repair', 'truck',     'suburban',  3500, 10000, 0, 0.06000),  -- $35
  (TRS, 'tire_repair', 'lt',        'suburban',  3500, 10000, 0, 0.06000),
  (TRS, 'tire_repair', 'specialty', 'suburban',  4000, 10000, 0, 0.06000),  -- $40 (run-flat, harder)
  (TRS, 'tire_repair', 'standard',  'highway',   2500, 17500, 0, 0.06000),
  (TRS, 'tire_repair', 'suv',       'highway',   3000, 17500, 0, 0.06000),
  (TRS, 'tire_repair', 'truck',     'highway',   3500, 17500, 0, 0.06000),
  (TRS, 'tire_repair', 'lt',        'highway',   3500, 17500, 0, 0.06000),
  (TRS, 'tire_repair', 'specialty', 'highway',   4000, 17500, 0, 0.06000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- JUMPSTART  (flat per job, no quantity)
-- ============================================================
INSERT INTO pricing_rules (tenant_id, service_type, vehicle_class, location_type, base_price_cents, mobile_fee_cents, disposal_fee_cents, tax_rate) VALUES
  (TRS, 'jumpstart', 'standard',  'suburban',  7500, 10000, 0, 0.06000),
  (TRS, 'jumpstart', 'suv',       'suburban',  7500, 10000, 0, 0.06000),
  (TRS, 'jumpstart', 'truck',     'suburban',  7500, 10000, 0, 0.06000),
  (TRS, 'jumpstart', 'lt',        'suburban',  9000, 10000, 0, 0.06000),   -- heavy equipment costs more
  (TRS, 'jumpstart', 'specialty', 'suburban',  7500, 10000, 0, 0.06000),
  (TRS, 'jumpstart', 'standard',  'highway',   7500, 17500, 0, 0.06000),
  (TRS, 'jumpstart', 'suv',       'highway',   7500, 17500, 0, 0.06000),
  (TRS, 'jumpstart', 'truck',     'highway',   7500, 17500, 0, 0.06000),
  (TRS, 'jumpstart', 'lt',        'highway',   9000, 17500, 0, 0.06000),
  (TRS, 'jumpstart', 'specialty', 'highway',   7500, 17500, 0, 0.06000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SPARE INSTALLATION  (flat per job)
-- ============================================================
INSERT INTO pricing_rules (tenant_id, service_type, vehicle_class, location_type, base_price_cents, mobile_fee_cents, disposal_fee_cents, tax_rate) VALUES
  (TRS, 'spare_installation', 'standard',  'suburban',  5000, 10000, 0, 0.06000),
  (TRS, 'spare_installation', 'suv',       'suburban',  5000, 10000, 0, 0.06000),
  (TRS, 'spare_installation', 'truck',     'suburban',  6000, 10000, 0, 0.06000),
  (TRS, 'spare_installation', 'lt',        'suburban',  6000, 10000, 0, 0.06000),
  (TRS, 'spare_installation', 'specialty', 'suburban',  5000, 10000, 0, 0.06000),
  (TRS, 'spare_installation', 'standard',  'highway',   5000, 17500, 0, 0.06000),
  (TRS, 'spare_installation', 'suv',       'highway',   5000, 17500, 0, 0.06000),
  (TRS, 'spare_installation', 'truck',     'highway',   6000, 17500, 0, 0.06000),
  (TRS, 'spare_installation', 'lt',        'highway',   6000, 17500, 0, 0.06000),
  (TRS, 'spare_installation', 'specialty', 'highway',   5000, 17500, 0, 0.06000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TIRE ROTATION  (all 4, flat per job)
-- ============================================================
INSERT INTO pricing_rules (tenant_id, service_type, vehicle_class, location_type, base_price_cents, mobile_fee_cents, disposal_fee_cents, tax_rate) VALUES
  (TRS, 'tire_rotation', 'standard',  'suburban',  6000, 10000, 0, 0.06000),
  (TRS, 'tire_rotation', 'suv',       'suburban',  6000, 10000, 0, 0.06000),
  (TRS, 'tire_rotation', 'truck',     'suburban',  7000, 10000, 0, 0.06000),
  (TRS, 'tire_rotation', 'lt',        'suburban',  7000, 10000, 0, 0.06000),
  (TRS, 'tire_rotation', 'specialty', 'suburban',  7000, 10000, 0, 0.06000),
  (TRS, 'tire_rotation', 'standard',  'highway',   6000, 17500, 0, 0.06000),
  (TRS, 'tire_rotation', 'suv',       'highway',   6000, 17500, 0, 0.06000),
  (TRS, 'tire_rotation', 'truck',     'highway',   7000, 17500, 0, 0.06000),
  (TRS, 'tire_rotation', 'lt',        'highway',   7000, 17500, 0, 0.06000),
  (TRS, 'tire_rotation', 'specialty', 'highway',   7000, 17500, 0, 0.06000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TPMS SERVICE  (per sensor — caller passes quantity)
-- ============================================================
INSERT INTO pricing_rules (tenant_id, service_type, vehicle_class, location_type, base_price_cents, mobile_fee_cents, disposal_fee_cents, tax_rate) VALUES
  (TRS, 'tpms_service', 'standard',  'suburban',  3500, 10000, 0, 0.06000),
  (TRS, 'tpms_service', 'suv',       'suburban',  3500, 10000, 0, 0.06000),
  (TRS, 'tpms_service', 'truck',     'suburban',  3500, 10000, 0, 0.06000),
  (TRS, 'tpms_service', 'lt',        'suburban',  3500, 10000, 0, 0.06000),
  (TRS, 'tpms_service', 'specialty', 'suburban',  4000, 10000, 0, 0.06000),
  (TRS, 'tpms_service', 'standard',  'highway',   3500, 17500, 0, 0.06000),
  (TRS, 'tpms_service', 'suv',       'highway',   3500, 17500, 0, 0.06000),
  (TRS, 'tpms_service', 'truck',     'highway',   3500, 17500, 0, 0.06000),
  (TRS, 'tpms_service', 'lt',        'highway',   3500, 17500, 0, 0.06000),
  (TRS, 'tpms_service', 'specialty', 'highway',   4000, 17500, 0, 0.06000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- OIL CHANGE
-- ============================================================
INSERT INTO pricing_rules (tenant_id, service_type, vehicle_class, location_type, base_price_cents, mobile_fee_cents, disposal_fee_cents, tax_rate) VALUES
  (TRS, 'oil_change', 'standard',  'suburban',   7500, 10000, 500, 0.06000),
  (TRS, 'oil_change', 'suv',       'suburban',   8500, 10000, 500, 0.06000),
  (TRS, 'oil_change', 'truck',     'suburban',   9500, 10000, 500, 0.06000),
  (TRS, 'oil_change', 'lt',        'suburban',  10500, 10000, 500, 0.06000),
  (TRS, 'oil_change', 'specialty', 'suburban',  12500, 10000, 500, 0.06000)   -- synthetic/exotic
ON CONFLICT DO NOTHING;

-- ============================================================
-- BRAKE SERVICE  (per axle)
-- ============================================================
INSERT INTO pricing_rules (tenant_id, service_type, vehicle_class, location_type, base_price_cents, mobile_fee_cents, disposal_fee_cents, tax_rate) VALUES
  (TRS, 'brake_service', 'standard',  'suburban',  15000, 10000, 0, 0.06000),
  (TRS, 'brake_service', 'suv',       'suburban',  17500, 10000, 0, 0.06000),
  (TRS, 'brake_service', 'truck',     'suburban',  20000, 10000, 0, 0.06000),
  (TRS, 'brake_service', 'lt',        'suburban',  22500, 10000, 0, 0.06000),
  (TRS, 'brake_service', 'specialty', 'suburban',  25000, 10000, 0, 0.06000)
ON CONFLICT DO NOTHING;

END $$;
