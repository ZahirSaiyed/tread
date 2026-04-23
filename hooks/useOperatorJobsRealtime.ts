'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useOperatorJobsRealtime(
  tenantId: string | null,
  onChange: (newRow: Record<string, unknown>) => void,
) {
  useEffect(() => {
    if (!tenantId) return

    const supabase = createClient()
    const filter = `tenant_id=eq.${tenantId}`

    const channel = supabase
      .channel(`operator-jobs-${tenantId}`)
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
  }, [tenantId, onChange])
}
