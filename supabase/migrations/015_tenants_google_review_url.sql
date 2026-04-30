-- Migration 015: Add google_review_url to tenants
-- Stores the Google Maps (or Yelp) review URL per tenant.
-- Used by the review request engine to send personalized post-job SMS.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS google_review_url TEXT;

COMMENT ON COLUMN tenants.google_review_url IS
  'Direct Google Maps / Yelp review link for this tenant. Sent via SMS on job completion.';
