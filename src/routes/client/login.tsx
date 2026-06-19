import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export const Route = createFileRoute('/client/login')({
  component: ClientLoginPage,
})

function ClientLoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/client/dashboard` },
    })
    if (error) setError("Une erreur est survenue. Vérifiez votre email.")
    else setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center space-y-3 py-12">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-green-600 text-xl">✓</span>
        </div>
        <h2 className="font-semibold text-lg">Lien envoyé !</h2>
        <p className="text-gray-500 text-sm">Vérifiez votre boîte email pour vous connecter.</p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Accès portail client</h1>
        <p className="text-gray-500 text-sm mt-1">Entrez votre email pour recevoir un lien de connexion.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="votre@email.com"
          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Envoi...' : 'Recevoir le lien'}
        </button>
      </form>
    </div>
  )
}
