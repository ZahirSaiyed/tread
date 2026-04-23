-- SM 2.3: Private Storage bucket for job evidence + RLS on storage.objects.
-- Path convention: {tenant_id}/{job_id}/{photo_type}/{filename}.jpg

INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', false)
ON CONFLICT (id) DO NOTHING;

-- One row per (job, photo_type) for completion gate + replace flows
CREATE UNIQUE INDEX IF NOT EXISTS job_photos_job_id_photo_type_uidx
  ON job_photos (job_id, photo_type);

-- Allow assigned tech to remove a photo row before re-uploading (incomplete jobs only)
DROP POLICY IF EXISTS "job_photos_delete_assigned_tech" ON job_photos;
CREATE POLICY "job_photos_delete_assigned_tech"
  ON job_photos FOR DELETE
  USING (
    tenant_id = get_user_tenant_id()
    AND get_user_role() = 'tech'
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_photos.job_id
        AND jobs.assigned_tech_id = auth.uid()
        AND jobs.status NOT IN ('complete', 'cancelled')
    )
  );

-- ============================================================
-- STORAGE.OBJECTS — job-photos bucket
-- ============================================================

DROP POLICY IF EXISTS "job_photos_storage_select_operator" ON storage.objects;
CREATE POLICY "job_photos_storage_select_operator"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND split_part(name, '/', 1) = get_user_tenant_id()::text
    AND get_user_role() IN ('operator', 'admin')
  );

DROP POLICY IF EXISTS "job_photos_storage_select_tech" ON storage.objects;
CREATE POLICY "job_photos_storage_select_tech"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND get_user_role() = 'tech'
    AND split_part(name, '/', 1) = get_user_tenant_id()::text
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id::text = split_part(name, '/', 2)
        AND jobs.assigned_tech_id = auth.uid()
        AND jobs.tenant_id = get_user_tenant_id()
    )
  );

DROP POLICY IF EXISTS "job_photos_storage_insert_tech" ON storage.objects;
CREATE POLICY "job_photos_storage_insert_tech"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'job-photos'
    AND get_user_role() = 'tech'
    AND split_part(name, '/', 1) = get_user_tenant_id()::text
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id::text = split_part(name, '/', 2)
        AND jobs.assigned_tech_id = auth.uid()
        AND jobs.tenant_id = get_user_tenant_id()
        AND jobs.status NOT IN ('complete', 'cancelled')
    )
  );

DROP POLICY IF EXISTS "job_photos_storage_delete_tech" ON storage.objects;
CREATE POLICY "job_photos_storage_delete_tech"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND get_user_role() = 'tech'
    AND split_part(name, '/', 1) = get_user_tenant_id()::text
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id::text = split_part(name, '/', 2)
        AND jobs.assigned_tech_id = auth.uid()
        AND jobs.tenant_id = get_user_tenant_id()
        AND jobs.status NOT IN ('complete', 'cancelled')
    )
  );

COMMENT ON INDEX job_photos_job_id_photo_type_uidx IS 'SM 2.3: enforce one before/during/after row per job for completion gate.';
