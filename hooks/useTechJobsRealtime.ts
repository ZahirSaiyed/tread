'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useTechJobsRealtime(
  techUserId: string | null,
  onChange: (newRow: Record<string, unknown>) => void,
) {
  useEffect(() => {
    if (!techUserId) return

    const supabase = createClient()
    const filter = `assigned_tech_id=eq.${techUserId}`

    const channel = supabase
      .channel(`tech-jobs-${techUserId}`)
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
  }, [techUserId, onChange])
}
