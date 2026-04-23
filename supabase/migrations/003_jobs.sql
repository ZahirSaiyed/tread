-- Migration 003: Jobs
-- Core dispatch entity. All job state transitions are tracked via job_events (004).

CREATE TABLE IF NOT EXISTS jobs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_name        TEXT        NOT NULL,
  customer_phone       TEXT        NOT NULL,
  address              TEXT        NOT NULL,
  lat                  DECIMAL(9,6),
  lng                  DECIMAL(9,6),
  vehicle_year         INTEGER,
  vehicle_make         TEXT,
  vehicle_model        TEXT,
  service_type         TEXT        NOT NULL
                         CHECK (service_type IN (
                           'mount_balance','tire_repair','wheel_repair',
                           'jumpstart','spare_installation','tire_rotation',
                           'tire_balancing','tpms_service','oil_change','brake_service'
                         )),
  service_variant      TEXT,
  status               TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','assigned','en_route','on_site','complete','cancelled')),
  assigned_tech_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  price_cents          INTEGER,
  notes                TEXT,
  source               TEXT        NOT NULL DEFAULT 'manual'
                         CHECK (source IN ('sms','web','manual')),
  tracking_token       TEXT        NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  tracking_expires_at  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_at          TIMESTAMPTZ,
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  cancellation_reason  TEXT,

  CONSTRAINT jobs_tracking_token_unique UNIQUE (tracking_token)
);

CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id        ON jobs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status    ON jobs (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_tech    ON jobs (tenant_id, assigned_tech_id) WHERE assigned_tech_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_tracking_token   ON jobs (tracking_token);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at       ON jobs (tenant_id, created_at DESC);

COMMENT ON TABLE  jobs                      IS 'One row per roadside service dispatch. Status transitions are append-only in job_events.';
COMMENT ON COLUMN jobs.tracking_token       IS 'Public token for customer tracking link — no auth required.';
COMMENT ON COLUMN jobs.price_cents          IS 'Final charged amount. NULL until job is priced (may be set at create or complete time).';
COMMENT ON COLUMN jobs.source               IS 'How the job entered the system: inbound SMS, web form, or manually by operator.';
