-- Migration 007: Messaging
-- SMS message log (Twilio) and review request tracking.

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id     UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  direction  TEXT        NOT NULL CHECK (direction IN ('inbound','outbound')),
  from_number TEXT       NOT NULL,
  to_number  TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'queued',
  twilio_sid TEXT        UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_job_id    ON messages (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_from      ON messages (tenant_id, from_number) WHERE direction = 'inbound';

COMMENT ON TABLE  messages           IS 'Twilio SMS log. Inbound written by webhook handler; outbound written before/after send.';
COMMENT ON COLUMN messages.status    IS 'Mirrors Twilio message status: queued, sent, delivered, failed, received.';
COMMENT ON COLUMN messages.twilio_sid IS 'Twilio Message SID (SM...). NULL for messages not yet confirmed by Twilio.';

-- ============================================================
-- REVIEW REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS review_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id          UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_phone  TEXT        NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clicked_at      TIMESTAMPTZ,
  review_url      TEXT        NOT NULL,
  twilio_sid      TEXT,

  CONSTRAINT review_requests_job_unique UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_review_requests_tenant ON review_requests (tenant_id, sent_at DESC);

COMMENT ON TABLE  review_requests          IS 'One review request per completed job. Tracks whether the customer clicked the link.';
COMMENT ON COLUMN review_requests.review_url IS 'Google Maps / Yelp review URL configured per tenant. Sent via SMS on job completion.';
