import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'

export const handleGoogleCallback = createServerFn({ method: 'POST' })
  .validator((d: { code: string }) => d)
  .handler(async ({ data: { code } }) => {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const appUrl = process.env.VITE_APP_URL ?? 'http://localhost:3000'

    if (!clientId || !clientSecret) return { error: 'not_configured' }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) return { error: 'token_exchange' }

    const tokens = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const userInfo = userRes.ok ? await userRes.json() as { email?: string } : {}

    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await supabase.from('integrations').upsert({
      provider: 'google_calendar',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expiry: expiry,
      email: userInfo.email ?? null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider' })

    return { success: true }
  })
