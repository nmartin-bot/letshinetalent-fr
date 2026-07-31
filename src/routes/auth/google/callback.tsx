import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { handleGoogleCallback } from '@/server/google-callback'

export const Route = createFileRoute('/auth/google/callback')({
  component: GoogleCallback,
})

function GoogleCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    const error = new URLSearchParams(window.location.search).get('error')

    if (error || !code) {
      navigate({ to: '/settings', search: { tab: 'integrations', error: 'google_denied' } as never })
      return
    }

    handleGoogleCallback({ data: { code } }).then(result => {
      if ('error' in result) {
        navigate({ to: '/settings', search: { tab: 'integrations' } as never })
      } else {
        navigate({ to: '/settings', search: { tab: 'integrations', success: 'google_connected' } as never })
      }
    })
  }, [])

  return (
    <div className="h-screen flex items-center justify-center text-sm text-gray-500">
      Connexion Google en cours…
    </div>
  )
}
