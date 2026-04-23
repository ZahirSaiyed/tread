-- Migration 009: SOP Documents
-- Standard operating procedures for the tenant. Operators write them; techs read published ones.

CREATE TABLE IF NOT EXISTS sop_documents (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  category         TEXT        NOT NULL CHECK (category IN ('safety','procedures','customer_service')),
  content_markdown TEXT        NOT NULL DEFAULT '',
  is_published     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sop_documents_tenant          ON sop_documents (tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_sop_documents_tenant_published ON sop_documents (tenant_id) WHERE is_published = TRUE;

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_sop_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER sop_documents_updated_at
  BEFORE UPDATE ON sop_documents
  FOR EACH ROW EXECUTE FUNCTION update_sop_updated_at();

COMMENT ON TABLE  sop_documents              IS 'Operator-authored SOPs and training docs. Techs see published docs in the /training route.';
COMMENT ON COLUMN sop_documents.is_published IS 'Draft SOPs are only visible to operators. Publish to make visible to techs.';
