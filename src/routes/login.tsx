import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase
      .from('profiles').select('role, client_type')
      .eq('id', session.user.id).single() as
      { data: { role: string; client_type: string | null } | null }
    if (profile?.role === 'admin') throw redirect({ to: '/' })
    if (profile?.client_type === 'learner') throw redirect({ to: '/client/apprenant/' })
    if (profile?.client_type === 'company') throw redirect({ to: '/client/entreprise/' })
    if (profile?.client_type === 'candidate') throw redirect({ to: '/client/candidat/' })
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !session) {
      setError(error?.message || 'Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('profiles').select('role, client_type')
      .eq('id', session.user.id).single() as
      { data: { role: string; client_type: string | null } | null }

    if (profile?.role === 'admin') {
      navigate({ to: '/' })
    } else if (profile?.client_type === 'learner') {
      navigate({ to: '/client/apprenant/' })
    } else if (profile?.client_type === 'company') {
      navigate({ to: '/client/entreprise/' })
    } else {
      navigate({ to: '/client/candidat/' })
    }
    setLoading(false)
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setForgotSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <span className="font-semibold text-gray-900 text-lg">Let Shine Talent</span>
        </div>

        <div className="border border-gray-100 rounded-2xl p-8 shadow-[0_1px_8px_rgba(0,0,0,0.06)] bg-white">
          {!showForgot ? (
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl font-semibold text-gray-900">Connexion</h1>
                <p className="text-gray-400 text-xs mt-1">Accédez à votre espace de travail</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5" htmlFor="email">
                    Adresse email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 placeholder:text-gray-300"
                    placeholder="vous@exemple.fr"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-700" htmlFor="password">
                      Mot de passe
                    </label>
                    <button type="button" onClick={() => setShowForgot(true)}
                      className="text-xs text-blue-600 hover:text-blue-700">
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 mt-1"
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
              </form>

              <p className="text-center text-xs text-gray-400 mt-6">
                Vous n'avez pas de compte ? Contactez votre administrateur.
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl font-semibold text-gray-900">Mot de passe oublié</h1>
                <p className="text-gray-400 text-xs mt-1">On vous envoie un lien de réinitialisation</p>
              </div>

              {forgotSent ? (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-green-600 text-xl">✓</span>
                  </div>
                  <p className="text-xs text-gray-500">Un email a été envoyé à <strong>{email}</strong>.</p>
                  <button onClick={() => { setShowForgot(false); setForgotSent(false) }}
                    className="text-xs text-blue-600 hover:underline">
                    Retour à la connexion
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Adresse email</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-300"
                      placeholder="vous@exemple.fr" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-50">
                    {loading ? 'Envoi...' : 'Envoyer le lien'}
                  </button>
                  <button type="button" onClick={() => setShowForgot(false)}
                    className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
                    ← Retour
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
