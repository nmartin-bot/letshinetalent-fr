import { createAPIFileRoute } from '@tanstack/react-start/api'

export const APIRoute = createAPIFileRoute('/api/auth/google/calendar')({
  GET: () => {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return new Response('GOOGLE_CLIENT_ID not configured', { status: 500 })
    }

    const redirectUri = `${process.env.VITE_APP_URL ?? 'http://localhost:3000'}/api/auth/google/callback`

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent',
    })

    return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  },
})
