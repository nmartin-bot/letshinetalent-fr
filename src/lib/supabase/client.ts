import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  const isServer = typeof window === 'undefined'

  return createBrowserClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    isServer
      ? {
          realtime: {
            // Node.js < 22 has no native WebSocket — provide ws package
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            transport: require('ws') as typeof WebSocket,
          },
        }
      : {},
  )
}
