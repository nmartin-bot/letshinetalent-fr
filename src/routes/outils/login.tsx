import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail } from 'lucide-react'

export const Route = createFileRoute('/outils/login')({
  component: OutilsLogin,
})

function OutilsLogin() {
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    if (prenom) localStorage.setItem('outils-prenom', prenom)
    if (nom) localStorage.setItem('outils-nom', nom)
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/outils/cv` },
    })
    if (error) setError('Une erreur est survenue. Réessayez.')
    else setSent(true)
    setLoading(false)
  }

  return (
    <div
      className="flex-1 flex items-center justify-center p-6"
      style={{ background: '#111' }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-10">
          <span className="font-semibold" style={{ color: '#f4f4f4' }}>Let Shine Talent</span>
        </div>

        {sent ? (
          <div className="rounded-2xl border p-8 text-center space-y-3" style={{ background: '#1e1e1e', borderColor: '#2d2d2d' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: '#1a2e1a', border: '1px solid #2d4d2d' }}>
              <Mail className="w-5 h-5" style={{ color: '#4ade80' }} />
            </div>
            <h2 className="font-semibold" style={{ color: '#f4f4f4' }}>Vérifiez votre boîte email</h2>
            <p className="text-sm" style={{ color: '#888' }}>
              Un lien de connexion a été envoyé à <span style={{ color: '#ccc', fontWeight: 500 }}>{email}</span>
            </p>
            <p className="text-xs" style={{ color: '#555' }}>Vérifiez vos spams si vous ne le voyez pas.</p>
          </div>
        ) : (
          <div className="rounded-2xl border p-8 space-y-6" style={{ background: '#1e1e1e', borderColor: '#2d2d2d' }}>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#f4f4f4' }}>Accéder aux outils</h1>
              <p className="text-sm mt-1" style={{ color: '#888' }}>Créez votre CV, votre lettre ou analysez votre profil. Aucun mot de passe nécessaire.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>Prénom</label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={e => setPrenom(e.target.value)}
                    placeholder="Marie"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{ background: '#111', border: '1px solid #2d2d2d', color: '#f4f4f4', '--tw-ring-color': '#c9a84c' } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>Nom</label>
                  <input
                    type="text"
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                    placeholder="Dupont"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{ background: '#111', border: '1px solid #2d2d2d', color: '#f4f4f4', '--tw-ring-color': '#c9a84c' } as React.CSSProperties}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>Adresse email <span style={{ color: '#c9a84c' }}>*</span></label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ background: '#111', border: '1px solid #2d2d2d', color: '#f4f4f4', '--tw-ring-color': '#c9a84c' } as React.CSSProperties}
                />
              </div>
              {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full font-medium py-2.5 px-4 rounded-xl text-sm transition-opacity disabled:opacity-50"
                style={{ background: '#c9a84c', color: '#1a1200' }}
              >
                {loading ? 'Envoi...' : 'Recevoir le lien de connexion'}
              </button>
            </form>
            <p className="text-xs text-center" style={{ color: '#555' }}>
              Vous recevrez un lien par email valable 1 heure.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
