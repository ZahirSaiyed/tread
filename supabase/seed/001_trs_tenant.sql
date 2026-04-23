-- Seed 001: TRS Tenant
-- Insert TRS with a fixed UUID so it can be referenced in other seeds

INSERT INTO tenants (
  id,
  name,
  slug,
  logo_url,
  primary_color,
  plan_tier,
  after_hours_fee_cents,
  after_hours_start,
  after_hours_end,
  highway_minimum_fee_cents
)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'TRS Mobile Tire Shop',
  'trs',
  '/branding/trs-default-logo.png', -- app-relative; replace with Supabase Storage public URL in prod if desired
  '#F5A623',
  'starter',
  7500,     -- $75 after hours
  '22:00',  -- after 10PM
  '08:00',  -- before 8AM
  17500     -- $175 highway minimum
)
ON CONFLICT (id) DO NOTHING;
