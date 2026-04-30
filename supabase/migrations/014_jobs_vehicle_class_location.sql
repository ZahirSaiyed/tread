-- Migration 014: Add vehicle_class and location_type to jobs
-- These are the two pricing dimensions needed to look up a pricing_rules row.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS vehicle_class TEXT
    CHECK (vehicle_class IN ('standard','suv','truck','lt','specialty')),
  ADD COLUMN IF NOT EXISTS location_type TEXT
    CHECK (location_type IN ('suburban','highway'));
