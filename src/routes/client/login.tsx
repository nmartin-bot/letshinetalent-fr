import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/client/login')({
  beforeLoad: () => { throw redirect({ to: '/login' }) },
  component: () => null,
})

function entityBase(type: string) {
  if (type === 'learner') return '/client/apprenant'
  if (type === 'company') return '/client/entreprise'
  return '/client/candidat'
}

function ClientLoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Si déjà connecté, rediriger directement
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_type, role')
        .eq('id', session.user.id)
        .single() as { data: { client_type: string | null; role: string } | null }
      if (profile?.role === 'admin') {
        window.location.href = '/dashboard'
        return
      }
      if (profile?.client_type) navigate({ to: entityBase(profile.client_type) })
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError || !session) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('client_type, role')
      .eq('id', session.user.id)
      .single() as { data: { client_type: string | null; role: string } | null }

    if (profile?.role === 'admin') {
      window.location.href = '/dashboard'
      return
    }

    if (profile?.client_type) {
      navigate({ to: entityBase(profile.client_type) })
    } else {
      setError('Aucun espace associé à ce compte. Contactez votre conseiller.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-10">
          <span className="font-semibold text-gray-900">Let Shine Talent</span>
        </div>

        <div className="bg-white rounded-2xl p-8 space-y-6 shadow-sm border border-gray-100">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Accès à votre espace</h1>
            <p className="text-gray-500 text-sm mt-1">Connectez-vous avec vos identifiants.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
