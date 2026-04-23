import type { SupabaseClient } from '@supabase/supabase-js'
import type { JobPhoto } from '@/types/domain'
import type { Database } from '@/types/database.types'

const BUCKET = 'job-photos'

/**
 * Replace object paths with short-lived signed URLs for API responses.
 * Leaves already-absolute URLs unchanged (legacy rows).
 */
export async function withSignedJobPhotoUrls(
  client: SupabaseClient<Database>,
  photos: JobPhoto[],
  expiresSec = 3600,
): Promise<JobPhoto[]> {
  return Promise.all(
    photos.map(async (p) => {
      const raw = p.storage_url
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        return { ...p, storage_path: null }
      }
      const { data, error } = await client.storage.from(BUCKET).createSignedUrl(raw, expiresSec)
      if (error || !data?.signedUrl) {
        return { ...p, storage_path: raw }
      }
      return { ...p, storage_path: raw, storage_url: data.signedUrl }
    }),
  )
}
