import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/session'
import { getJob, getJobEvents, getJobPhotos, updateJobOperatorFields } from '@/lib/db/jobs'
import { PatchJobSchema } from '@/lib/validators/job'
import { withSignedJobPhotoUrls } from '@/lib/tech/signJobPhotos'
import type { ApiError, JobDetail } from '@/types/api'
import type { Job } from '@/types/domain'

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

function patchBodyToRow(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

// PATCH /api/jobs/[id] — operator field edits (pending / assigned only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<Job | ApiError>> {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'tech') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = PatchJobSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors[0]?.message ?? 'Validation error' },
      { status: 400 },
    )
  }

  const patch = patchBodyToRow(result.data as Record<string, unknown>)
  const supabase = await createClient()

  try {
    const job = await getJob(supabase, id, user.tenant_id)
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const updated = await updateJobOperatorFields(supabase, {
      jobId: id,
      tenantId: user.tenant_id,
      patch,
      updatedBy: user.id,
    })

    return NextResponse.json(updated)
  } catch (e) {
    const code = e instanceof Error ? (e as Error & { code?: string }).code : undefined
    if (code === 'JOB_NOT_FOUND') {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    if (code === 'JOB_NOT_EDITABLE') {
      return NextResponse.json(
        { error: 'Job can only be edited while pending or assigned (before en route)' },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
