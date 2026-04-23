import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/session'
import { getJob, getJobPhotos, updateJobStatus } from '@/lib/db/jobs'
import { hasCompletionPhotos } from '@/lib/tech/jobPhotos'
import { UpdateJobStatusSchema, isValidTransition } from '@/lib/validators/job'
import type { ApiError } from '@/types/api'
import type { Job } from '@/types/domain'
import type { JobStatus } from '@/types/enums'

// PATCH /api/jobs/[id]/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<Job | ApiError>> {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = UpdateJobStatusSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors[0]?.message ?? 'Validation error' },
      { status: 400 },
    )
  }

  const { status: newStatus, cancellation_reason } = result.data

  const supabase = await createClient()

  try {
    const job = await getJob(supabase, id, user.tenant_id)
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // Techs can only update their own assigned jobs
    if (user.role === 'tech' && job.assigned_tech_id !== user.id) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (!isValidTransition(job.status as JobStatus, newStatus as JobStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from "${job.status}" to "${newStatus}"` },
        { status: 422 },
      )
    }

    if (newStatus === 'complete') {
      const photos = await getJobPhotos(supabase, id)
      if (!hasCompletionPhotos(photos)) {
        return NextResponse.json(
          {
            error:
              'Upload before, during, and after photos before completing this job.',
          },
          { status: 422 },
        )
      }
    }

    const updated = await updateJobStatus(supabase, {
      jobId: id,
      tenantId: user.tenant_id,
      previousStatus: job.status as JobStatus,
      newStatus: newStatus as JobStatus,
      cancellationReason: cancellation_reason,
      updatedBy: user.id,
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update job status' }, { status: 500 })
  }
}
