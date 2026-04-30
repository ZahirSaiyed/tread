import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/r/[token]
 *
 * Click-tracking redirect for review request links.
 * Records clicked_at on first tap, then 302s to the tenant's Google review page.
 * Idempotent — repeated clicks still redirect correctly.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const supabase = await createClient()

  const { data: reviewRequest, error } = await supabase
    .from('review_requests')
    .select('id, review_url, clicked_at')
    .eq('id', token)
    .maybeSingle()

  if (error || !reviewRequest) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Record first click (idempotent — skip if already clicked)
  if (!reviewRequest.clicked_at) {
    await supabase
      .from('review_requests')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', reviewRequest.id)
  }

  return NextResponse.redirect(reviewRequest.review_url, { status: 302 })
}
