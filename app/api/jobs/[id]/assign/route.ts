import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/session'
import { getJob, assignTech } from '@/lib/db/jobs'
import { AssignTechSchema } from '@/lib/validators/job'
import type { ApiError } from '@/types/api'
import type { Job } from '@/types/domain'

// PATCH /api/jobs/[id]/assign
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

  const result = AssignTechSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors[0]?.message ?? 'Validation error' },
      { status: 400 },
    )
  }

  const { assigned_tech_id } = result.data
  const supabase = await createClient()

  try {
    const job = await getJob(supabase, id, user.tenant_id)
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (job.status === 'complete' || job.status === 'cancelled') {
      return NextResponse.json(
        { error: `Cannot assign a tech to a ${job.status} job` },
        { status: 422 },
      )
    }

    // Verify the tech belongs to this tenant
    const { data: tech } = await supabase
      .from('users')
      .select('id')
      .eq('id', assigned_tech_id)
      .eq('tenant_id', user.tenant_id)
      .eq('role', 'tech')
      .eq('is_active', true)
      .single()

    if (!tech) {
      return NextResponse.json({ error: 'Tech not found in this tenant' }, { status: 400 })
    }

    const updated = await assignTech(supabase, {
      jobId: id,
      tenantId: user.tenant_id,
      techId: assigned_tech_id,
      assignedBy: user.id,
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to assign tech' }, { status: 500 })
  }
}
