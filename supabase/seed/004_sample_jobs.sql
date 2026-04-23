-- Seed 004: Sample Jobs (local dev only)
-- Creates 4 jobs in various states for UI development against local Supabase.
-- Requires seed 001 (TRS tenant) and that the TRS operator/tech users exist in auth.users.
-- Safe to skip if those users haven't been created yet — jobs reference users via assigned_tech_id.

DO $$
DECLARE
  TRS UUID := 'a1b2c3d4-0000-0000-0000-000000000001';
BEGIN

INSERT INTO jobs (
  id, tenant_id, customer_name, customer_phone, address,
  lat, lng, vehicle_year, vehicle_make, vehicle_model,
  service_type, service_variant, status, price_cents, source
) VALUES
  (
    'c0000001-0000-0000-0000-000000000001',
    TRS, 'Sarah Mitchell', '+17035550101',
    '4521 Dale Blvd, Dale City, VA 22193',
    38.6312, -77.3441, 2021, 'Toyota', 'Camry',
    'mount_balance', 'stock', 'pending', NULL, 'sms'
  ),
  (
    'c0000001-0000-0000-0000-000000000002',
    TRS, 'James Okafor', '+17035550102',
    '14300 Smoketown Rd, Woodbridge, VA 22192',
    38.6534, -77.2692, 2019, 'Ford', 'F-150',
    'tire_repair', 'plug', 'pending', NULL, 'web'
  ),
  (
    'c0000001-0000-0000-0000-000000000003',
    TRS, 'Linda Pham', '+17035550103',
    '2801 Centreville Rd, Herndon, VA 20171',
    38.9696, -77.3855, 2022, 'Honda', 'CR-V',
    'jumpstart', NULL, 'complete', 7500, 'manual'
  ),
  (
    'c0000001-0000-0000-0000-000000000004',
    TRS, 'Derek Washington', '+17035550104',
    '6600 Loisdale Rd, Springfield, VA 22150',
    38.7754, -77.1789, 2020, 'Chevrolet', 'Silverado',
    'mount_balance', 'lt', 'cancelled', NULL, 'sms'
  )
ON CONFLICT (id) DO NOTHING;

-- Mark the cancelled job
UPDATE jobs
SET cancelled_at = NOW() - INTERVAL '2 days',
    cancellation_reason = 'Customer resolved issue on their own'
WHERE id = 'c0000001-0000-0000-0000-000000000004';

-- Mark the completed job
UPDATE jobs
SET completed_at = NOW() - INTERVAL '1 day',
    started_at   = NOW() - INTERVAL '1 day' - INTERVAL '45 minutes',
    assigned_at  = NOW() - INTERVAL '1 day' - INTERVAL '1 hour'
WHERE id = 'c0000001-0000-0000-0000-000000000003';

END $$;
