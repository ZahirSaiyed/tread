-- Seed 003: TRS Location Fees (Northern Virginia service area)
-- Fee tiers match FEE_TIER_AMOUNTS in types/enums.ts.
-- Tier 1 = $100 (home base), Tier 5 = $175 (far suburbs / highway minimum).

DO $$
DECLARE
  TRS UUID := 'a1b2c3d4-0000-0000-0000-000000000001';
BEGIN

INSERT INTO location_fees (tenant_id, city, state_code, fee_cents, fee_tier) VALUES
  -- Tier 1 — Home base ($100)
  (TRS, 'Woodbridge',        'VA', 10000, 1),

  -- Tier 2 — Close suburbs ($110)
  (TRS, 'Dale City',         'VA', 11000, 2),
  (TRS, 'Lake Ridge',        'VA', 11000, 2),
  (TRS, 'Dumfries',          'VA', 11000, 2),
  (TRS, 'Triangle',          'VA', 11000, 2),
  (TRS, 'Occoquan',          'VA', 11000, 2),

  -- Tier 3 — Mid suburbs ($125)
  (TRS, 'Manassas',          'VA', 12500, 3),
  (TRS, 'Manassas Park',     'VA', 12500, 3),
  (TRS, 'Stafford',          'VA', 12500, 3),
  (TRS, 'Quantico',          'VA', 12500, 3),
  (TRS, 'Nokesville',        'VA', 12500, 3),
  (TRS, 'Gainesville',       'VA', 12500, 3),
  (TRS, 'Haymarket',         'VA', 12500, 3),

  -- Tier 4 — DC + outer NoVA ($150)
  (TRS, 'Alexandria',        'VA', 15000, 4),
  (TRS, 'Arlington',         'VA', 15000, 4),
  (TRS, 'Fairfax',           'VA', 15000, 4),
  (TRS, 'Springfield',       'VA', 15000, 4),
  (TRS, 'Centreville',       'VA', 15000, 4),
  (TRS, 'Chantilly',         'VA', 15000, 4),
  (TRS, 'Herndon',           'VA', 15000, 4),
  (TRS, 'Reston',            'VA', 15000, 4),
  (TRS, 'Sterling',          'VA', 15000, 4),
  (TRS, 'Ashburn',           'VA', 15000, 4),
  (TRS, 'Leesburg',          'VA', 15000, 4),
  (TRS, 'Washington',        'DC', 15000, 4),

  -- Tier 5 — Far suburbs / highway minimum ($175)
  (TRS, 'McLean',            'VA', 17500, 5),
  (TRS, 'Tysons',            'VA', 17500, 5),
  (TRS, 'Vienna',            'VA', 17500, 5),
  (TRS, 'Falls Church',      'VA', 17500, 5),
  (TRS, 'Lorton',            'VA', 17500, 5),
  (TRS, 'Fort Belvoir',      'VA', 17500, 5)

ON CONFLICT (tenant_id, city, state_code, country_code) DO NOTHING;

END $$;
