import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

// Browser singleton — safe to call multiple times, returns same instance
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  return client
}
