import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/session'
import { aggregateCompletedRevenue } from '@/lib/db/jobs'
import { revenueRangeFromParams } from '@/lib/validators/revenueQuery'
import type { ApiError } from '@/types/api'

export interface RevenueResponse {
  totalCents: number
  jobCount: number
  from: string
  to: string
}

// GET /api/jobs/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(
  request: NextRequest,
): Promise<NextResponse<RevenueResponse | ApiError>> {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'tech') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = revenueRangeFromParams(request.nextUrl.searchParams)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    const { totalCents, jobCount } = await aggregateCompletedRevenue(supabase, {
      tenantId: user.tenant_id,
      completedFromIso: parsed.fromIso,
      completedToIso: parsed.toIso,
    })

    return NextResponse.json({
      totalCents,
      jobCount,
      from: parsed.fromIso,
      to: parsed.toIso,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load revenue' }, { status: 500 })
  }
}
