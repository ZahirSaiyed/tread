'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/** Live updates for a single job row (e.g. operator reassignment or status sync). */
export function useTechJobDetailRealtime(
  jobId: string | null,
  onChange: (newRow: Record<string, unknown>) => void,
) {
  useEffect(() => {
    if (!jobId) return

    const supabase = createClient()
    const filter = `id=eq.${jobId}`

    const channel = supabase
      .channel(`tech-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && !Array.isArray(payload.new)) {
            onChange(payload.new as Record<string, unknown>)
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [jobId, onChange])
}
