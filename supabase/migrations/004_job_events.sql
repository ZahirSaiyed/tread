-- Migration 004: Job Events
-- Append-only audit log for every status change and notable action on a job.
-- tenant_id is denormalized here for RLS performance (avoids a JOIN to jobs on every policy check).

CREATE TABLE IF NOT EXISTS job_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL,
  payload     JSONB       NOT NULL DEFAULT '{}',
  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_events_job_id    ON job_events (job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_events_tenant_id ON job_events (tenant_id, created_at DESC);

COMMENT ON TABLE  job_events            IS 'Immutable event log for each job. Never UPDATE or DELETE rows here.';
COMMENT ON COLUMN job_events.event_type IS 'e.g. "job_created", "status_changed", "tech_assigned", "note_added", "photo_uploaded"';
COMMENT ON COLUMN job_events.payload    IS 'Structured context for the event (e.g. {from: "pending", to: "assigned", tech_id: "..."})';
COMMENT ON COLUMN job_events.tenant_id  IS 'Denormalized from jobs.tenant_id to avoid RLS join penalty.';
