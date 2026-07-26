import { createFileRoute, redirect, Outlet, Link, useRouterState } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Mail, ScanSearch, FolderOpen, Calendar, BookOpen, LogOut, Building2, User, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

type EntityType = 'candidate' | 'learner' | 'company'

type PortalContext = {
  entityType: EntityType
  entityId: string
  entityName: string
}


export const Route = createFileRoute('/client')({
  beforeLoad: async ({ location }) => {
    if (location.pathname === '/login' || location.pathname === '/client/changer-mot-de-passe') return

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw redirect({ to: '/login' })

    const { data: profile } = await supabase
      .from('profiles').select('role, client_type, entity_id, password_changed').eq('id', session.user.id).single() as
      { data: { role: string; client_type: string | null; entity_id: string | null; password_changed: boolean | null } | null }

    if (profile?.role === 'admin') throw redirect({ to: '/dashboard' })

    if (!profile?.client_type || !profile?.entity_id) {
      throw redirect({ to: '/login' })
    }

    const segment = profile.client_type === 'company' ? 'entreprise' : profile.client_type === 'learner' ? 'apprenant' : 'candidat'
    const base = `/client/${segment}`
    const isSharedRoute = location.pathname.startsWith('/client/outils') || location.pathname.startsWith('/client/changer-mot-de-passe')
    if (!isSharedRoute && !location.pathname.startsWith(base)) throw redirect({ to: `${base}/` })

    return { entityId: profile.entity_id, entityType: profile.client_type }
  },
  loader: async ({ context }) => {
    const ctx = context as { entityId?: string; entityType?: string }
    if (!ctx.entityId || !ctx.entityType) {
      return { entityType: 'candidate' as EntityType, entityId: '', entityName: '', mustChangePassword: false }
    }

    const entityType = ctx.entityType as EntityType
    const entityId = ctx.entityId

    const supabase = createClient()

    const { data: profile } = await supabase
      .from('profiles').select('password_changed').eq('id', (await supabase.auth.getUser()).data.user?.id ?? '').single() as
      { data: { password_changed: boolean | null } | null }
    const mustChangePassword = profile?.password_changed === false

    let entityName = ''
    if (entityType === 'candidate') {
      const { data } = await supabase.from('candidates').select('first_name, last_name').eq('id', entityId).single() as { data: { first_name: string; last_name: string } | null }
      entityName = data ? `${data.first_name} ${data.last_name}` : ''
    } else if (entityType === 'learner') {
      const { data } = await supabase.from('learners').select('first_name, last_name').eq('id', entityId).single() as { data: { first_name: string; last_name: string } | null }
      entityName = data ? `${data.first_name} ${data.last_name}` : ''
    } else if (entityType === 'company') {
      const { data } = await supabase.from('companies').select('name').eq('id', entityId).single() as { data: { name: string } | null }
      entityName = data?.name ?? ''
    }

    return { entityType, entityId, entityName, mustChangePassword }
  },
  component: ClientLayout,
})

const NAV: Record<EntityType, { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  candidate: [
    { href: '/client/candidat/', label: 'Accueil', icon: User },
    { href: '/client/outils/cv', label: 'Mon CV', icon: FileText },
    { href: '/client/outils/lettre', label: 'Ma lettre', icon: Mail },
    { href: '/client/outils/analyse', label: 'Analyse ATS', icon: ScanSearch },
    { href: '/client/candidat/documents', label: 'Mes documents', icon: FolderOpen },
    { href: '/client/candidat/agenda', label: 'Mon agenda', icon: Calendar },
  ],
  learner: [
    { href: '/client/apprenant/', label: 'Accueil', icon: GraduationCap },
    { href: '/client/outils/cv', label: 'Mon CV', icon: FileText },
    { href: '/client/outils/lettre', label: 'Ma lettre', icon: Mail },
    { href: '/client/outils/analyse', label: 'Analyse ATS', icon: ScanSearch },
    { href: '/client/apprenant/formations', label: 'Mes formations', icon: BookOpen },
    { href: '/client/apprenant/documents', label: 'Mes documents', icon: FolderOpen },
    { href: '/client/apprenant/agenda', label: 'Mon agenda', icon: Calendar },
  ],
  company: [
    { href: '/client/entreprise/', label: 'Accueil', icon: Building2 },
    { href: '/client/entreprise/documents', label: 'Documents', icon: FolderOpen },
    { href: '/client/entreprise/agenda', label: 'Agenda', icon: Calendar },
  ],
}

const ENTITY_LABEL: Record<EntityType, string> = {
  candidate: 'Espace candidat',
  learner: 'Espace apprenant',
  company: 'Espace entreprise',
}

const ENTITY_COLOR: Record<EntityType, string> = {
  candidate: 'bg-rose-500',
  learner: 'bg-violet-500',
  company: 'bg-blue-500',
}

function ChangePasswordModal({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8) { setError('Minimum 8 caractères.'); return }
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setLoading(false); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('profiles').update({ password_changed: true } as never).eq('id', session.user.id)
    }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8">
        <h2 className="font-bold text-gray-900 text-lg mb-1">Choisissez votre mot de passe</h2>
        <p className="text-gray-500 text-sm mb-6">Créez un mot de passe personnel pour sécuriser votre accès.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <input
            type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Confirmer le mot de passe"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60">
            {loading ? 'Enregistrement...' : 'Confirmer'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ClientLayout() {
  const loaderData = Route.useLoaderData()
  const pathname = useRouterState({ select: s => s.location.pathname })

  const [entityType, setEntityType] = useState<EntityType>(loaderData.entityType)
  const [entityName, setEntityName] = useState(loaderData.entityName)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setReady(true); return }
      const { data: profile } = await supabase
        .from('profiles').select('client_type, entity_id, password_changed')
        .eq('id', user.id).single() as
        { data: { client_type: string | null; entity_id: string | null; password_changed: boolean | null } | null }
      if (!profile?.client_type || !profile?.entity_id) { setReady(true); return }

      const type = profile.client_type as EntityType
      const eid = profile.entity_id
      setEntityType(type)
      if (profile.password_changed === false) setShowPasswordModal(true)

      let name = ''
      if (type === 'candidate') {
        const { data } = await supabase.from('candidates').select('first_name, last_name').eq('id', eid).single() as { data: { first_name: string; last_name: string } | null }
        name = data ? `${data.first_name} ${data.last_name}` : ''
      } else if (type === 'learner') {
        const { data } = await supabase.from('learners').select('first_name, last_name').eq('id', eid).single() as { data: { first_name: string; last_name: string } | null }
        name = data ? `${data.first_name} ${data.last_name}` : ''
      } else if (type === 'company') {
        const { data } = await supabase.from('companies').select('name').eq('id', eid).single() as { data: { name: string } | null }
        name = data?.name ?? ''
      }
      setEntityName(name)
      setReady(true)
    })
  }, [])

  if (pathname === '/login') return <Outlet />
  if (!ready) return null

  const nav = NAV[entityType]

  async function handleLogout() {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {showPasswordModal && <ChangePasswordModal onDone={() => setShowPasswordModal(false)} />}
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-100 flex flex-col bg-white">
        {/* Entity badge */}
        <div className="px-3 py-3 border-b border-gray-100">
          <div className={cn('flex items-center gap-2 px-2.5 py-2 rounded-xl', ENTITY_COLOR[entityType].replace('bg-', 'bg-').replace('500', '50'))}>
            <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center shrink-0', ENTITY_COLOR[entityType])}>
              {entityType === 'candidate' && <User className="w-3 h-3 text-white" />}
              {entityType === 'learner' && <GraduationCap className="w-3 h-3 text-white" />}
              {entityType === 'company' && <Building2 className="w-3 h-3 text-white" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{ENTITY_LABEL[entityType]}</p>
              <p className="text-xs font-medium text-gray-900 truncate">{entityName}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const isHome = href.endsWith('/')
            const active = pathname === href || pathname === href.replace(/\/$/, '') || (!isHome && pathname.startsWith(href))
            return (
              <Link key={href} to={href}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                  active ? 'bg-gray-900 text-white font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}>
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-3 border-t border-gray-100">
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors w-full">
            <LogOut className="w-3.5 h-3.5" />Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 border-b border-gray-100 flex items-center px-6 shrink-0 bg-white">
          <div id="client-header-slot" className="flex-1 flex items-center" />
        </div>
        <div className="flex-1 flex overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
