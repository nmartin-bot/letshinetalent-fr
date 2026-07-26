import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export const Route = createFileRoute('/client/changer-mot-de-passe')({
  component: ChangePasswordPage,
})

function ChangePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return }
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setLoading(false); return }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('profiles').update({ password_changed: true } as never).eq('id', session.user.id)
      const { data: profile } = await supabase
        .from('profiles').select('client_type').eq('id', session.user.id).single() as
        { data: { client_type: string | null } | null }
      const dest = profile?.client_type === 'learner' ? '/client/apprenant'
        : profile?.client_type === 'company' ? '/client/entreprise'
        : '/client/candidat'
      navigate({ to: dest })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#111' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-10">
          <span className="font-semibold text-white">Let Shine Talent</span>
        </div>
        <div className="rounded-2xl p-8 space-y-6" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <div>
            <h1 className="font-bold text-white text-lg">Choisissez votre mot de passe</h1>
            <p className="text-gray-400 text-sm mt-1">Créez un mot de passe personnel pour sécuriser votre accès.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
              style={{ background: '#111', border: '1px solid #333' }}
            />
            <input
              type="password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirmer le mot de passe"
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
              style={{ background: '#111', border: '1px solid #333' }}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ background: '#c9a84c', color: '#111' }}
            >
              {loading ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
