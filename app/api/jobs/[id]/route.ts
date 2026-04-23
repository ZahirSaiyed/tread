import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/session'
import { getJob, getJobEvents, getJobPhotos } from '@/lib/db/jobs'
import { withSignedJobPhotoUrls } from '@/lib/tech/signJobPhotos'
import type { ApiError, JobDetail } from '@/types/api'

// GET /api/jobs/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<JobDetail | ApiError>> {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const supabase = await createClient()

  try {
    const job = await getJob(supabase, id, user.tenant_id)
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // Tech can only access their own assigned jobs
    if (user.role === 'tech' && job.assigned_tech_id !== user.id) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const [events, photos] = await Promise.all([
      getJobEvents(supabase, id),
      getJobPhotos(supabase, id),
    ])

    const photosOut = await withSignedJobPhotoUrls(supabase, photos)

    return NextResponse.json({ ...job, events, photos: photosOut })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}
