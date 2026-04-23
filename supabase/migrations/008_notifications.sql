-- Migration 008: Notifications
-- In-app notification feed for operators and techs.
-- Written exclusively by server-side functions (service role).

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  payload    JSONB       NOT NULL DEFAULT '{}',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications (tenant_id, created_at DESC);

COMMENT ON TABLE  notifications       IS 'In-app notification feed. Inserted by server functions; never by client-side code.';
COMMENT ON COLUMN notifications.type  IS 'e.g. "job_assigned", "job_status_changed", "new_message". Drives notification icon and copy.';
COMMENT ON COLUMN notifications.payload IS 'Structured data for rendering the notification (job_id, status, etc.).';
