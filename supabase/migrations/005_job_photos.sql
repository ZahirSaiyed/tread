-- Migration 005: Job Photos
-- Before / during / after photos uploaded by techs via the mobile job view.

CREATE TABLE IF NOT EXISTS job_photos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  photo_type  TEXT        NOT NULL CHECK (photo_type IN ('before','during','after')),
  storage_url TEXT        NOT NULL,
  uploaded_by UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_photos_job_id    ON job_photos (job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_tenant_id ON job_photos (tenant_id);

COMMENT ON TABLE  job_photos             IS 'Photos attached to a job. Files live in Supabase Storage; this table holds metadata.';
COMMENT ON COLUMN job_photos.storage_url IS 'Supabase Storage public URL or signed URL path. Path format: {tenant_id}/{job_id}/{photo_type}/{uuid}.jpg';
