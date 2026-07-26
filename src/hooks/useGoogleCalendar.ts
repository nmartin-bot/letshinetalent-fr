import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export type GoogleCalendarStatus = 'loading' | 'connected' | 'disconnected'

export function useGoogleCalendar() {
  const supabase = createClient()
  const [status, setStatus] = useState<GoogleCalendarStatus>('loading')
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      const { data } = await supabase
        .from('integrations')
        .select('email, token_expiry')
        .eq('provider', 'google_calendar')
        .maybeSingle() as { data: { email: string | null; token_expiry: string | null } | null }

      if (data?.token_expiry) {
        setEmail(data.email)
        setStatus('connected')
      } else {
        setStatus('disconnected')
      }
    }
    check()
  }, [])

  async function disconnect() {
    await supabase.from('integrations').delete().eq('provider', 'google_calendar')
    setStatus('disconnected')
    setEmail(null)
  }

  return { status, email, disconnect }
}
