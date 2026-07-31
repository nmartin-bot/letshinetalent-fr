import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'

type GoogleEvent = {
  title: string
  starts_at: string
  duration_minutes: number
  location?: string | null
  notes?: string | null
  appointment_id: string
}

async function getValidToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data } = await supabase
    .from('integrations')
    .select('access_token, refresh_token, token_expiry')
    .eq('provider', 'google_calendar')
    .single() as { data: { access_token: string; refresh_token: string | null; token_expiry: string } | null }

  if (!data) return null

  // If token still valid (with 2min buffer), use it
  if (new Date(data.token_expiry) > new Date(Date.now() + 2 * 60 * 1000)) {
    return data.access_token
  }

  // Refresh the token
  if (!data.refresh_token) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const tokens = await res.json() as { access_token: string; expires_in: number }
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from('integrations').update({
    access_token: tokens.access_token,
    token_expiry: expiry,
    updated_at: new Date().toISOString(),
  }).eq('provider', 'google_calendar')

  return tokens.access_token
}

export const createGoogleCalendarEvent = createServerFn({ method: 'POST' })
  .validator((d: GoogleEvent) => d)
  .handler(async ({ data }) => {
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const token = await getValidToken(supabase)
    if (!token) return { error: 'not_connected' }

    const startDt = new Date(data.starts_at)
    const endDt = new Date(startDt.getTime() + data.duration_minutes * 60 * 1000)

    const event = {
      summary: data.title,
      location: data.location ?? undefined,
      description: data.notes ?? undefined,
      start: { dateTime: startDt.toISOString(), timeZone: 'Europe/Paris' },
      end: { dateTime: endDt.toISOString(), timeZone: 'Europe/Paris' },
    }

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })

    if (!res.ok) return { error: 'api_error' }

    const created = await res.json() as { id: string }

    // Save google_event_id on the appointment
    await supabase.from('appointments').update({ google_event_id: created.id }).eq('id', data.appointment_id)

    return { success: true, eventId: created.id }
  })

export const deleteGoogleCalendarEvent = createServerFn({ method: 'POST' })
  .validator((d: { google_event_id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const token = await getValidToken(supabase)
    if (!token) return { error: 'not_connected' }

    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${data.google_event_id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    return { success: true }
  })
