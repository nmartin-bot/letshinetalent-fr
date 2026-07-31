import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Bell, Shield, Lock, Download, AlertTriangle, Check, Eye, EyeOff, Save, CheckCircle2, LogOut } from 'lucide-react'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext'

export const Route = createFileRoute('/_admin/settings/')({
  component: SettingsPage,
})

type Section = 'profil' | 'general' | 'securite' | 'donnees' | 'integrations'

const NAV = [
  {
    section: 'COMPTE',
    items: [{ id: 'profil' as Section, label: 'Profil' }],
  },
  {
    section: 'PRÉFÉRENCES',
    items: [{ id: 'general' as Section, label: 'Général' }],
  },
  {
    section: 'INTÉGRATIONS',
    items: [{ id: 'integrations' as Section, label: 'Intégrations' }],
  },
  {
    section: 'SÉCURITÉ',
    items: [
      { id: 'securite' as Section, label: 'Confidentialité' },
      { id: 'donnees' as Section, label: 'Données' },
    ],
  },
]

function SettingsPage() {
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const tabParam = searchParams.get('tab') as Section | null
  const [active, setActive] = useState<Section>(tabParam ?? 'profil')

  return (
    <div className="flex flex-col h-full">
      <PageHeader pathItems={[{ label: 'Paramètres' }]} />

    <div className="flex flex-1 overflow-hidden">
      {/* Left nav */}
      <div className="w-52 border-r border-gray-100 py-6 px-3 shrink-0">
        {NAV.map(group => (
          <div key={group.section} className="mb-5">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {group.section}
            </p>
            {group.items.map(item => (
              <button key={item.id} onClick={() => setActive(item.id)}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-colors',
                  active === item.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                )}>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-10 py-8 max-w-2xl">
        {active === 'profil' && <ProfilSection />}
        {active === 'general' && <GeneralSection />}
        {active === 'integrations' && <IntegrationsSection />}
        {active === 'securite' && <SecuriteSection />}
        {active === 'donnees' && <DonneesSection />}
      </div>
    </div>
    </div>
  )
}

function ProfilSection() {
  const { profile, user } = useAuth()
  const supabase = createClient()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const email = profile?.email ?? user?.email ?? ''
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({ full_name: fullName } as never).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const initials = (fullName || email).split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Profil</h1>

      <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
        <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-lg font-semibold">{initials}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{fullName || email}</p>
          <p className="text-xs text-gray-400 mt-0.5">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5 max-w-sm">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Nom complet</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)}
            placeholder="Votre nom"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-300" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Adresse email</label>
          <input value={email} disabled
            className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400 cursor-not-allowed" />
          <p className="text-[11px] text-gray-400 mt-1">L'email ne peut pas être modifié ici.</p>
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
          {saved ? <><Check className="w-4 h-4" />Enregistré</> : <><Save className="w-4 h-4" />{saving ? 'Enregistrement...' : 'Enregistrer'}</>}
        </button>
      </form>
    </div>
  )
}

function GeneralSection() {
  const [notifRdv, setNotifRdv] = useState(true)
  const [notifTache, setNotifTache] = useState(true)
  const [notifAts, setNotifAts] = useState(false)
  const { preference, setPreference } = useTheme()

  const themes: { id: ThemePreference; label: string }[] = [
    { id: 'light', label: 'Clair' },
    { id: 'dark', label: 'Sombre' },
    { id: 'system', label: 'Système' },
  ]

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold text-gray-900">Général</h1>

      {/* Thème */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">Thème</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Choisissez l'apparence de l'application.</p>
        <div className="grid grid-cols-3 gap-3 max-w-sm">
          {themes.map(t => (
            <button key={t.id} onClick={() => setPreference(t.id)}
              className={cn('border-2 rounded-xl overflow-hidden text-left focus:outline-none transition-colors',
                preference === t.id ? 'border-blue-500' : 'border-transparent hover:border-gray-200'
              )}>
              {t.id === 'light' ? (
                <>
                  <div className="h-16 bg-white relative border-b border-gray-100" style={{ colorScheme: 'light' }}>
                    <div className="absolute inset-0 flex">
                      <div className="w-1/3 bg-gray-50 border-r border-gray-100" />
                      <div className="flex-1 p-2 space-y-1.5">
                        <div className="h-1.5 bg-gray-200 rounded w-3/4" />
                        <div className="h-1.5 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                  <div className="px-2.5 py-2 bg-white border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-900">{t.label}</span>
                  </div>
                </>
              ) : t.id === 'dark' ? (
                <>
                  <div className="h-16 bg-gray-800 relative border-b border-gray-700">
                    <div className="absolute inset-0 flex">
                      <div className="w-1/3 bg-gray-900 border-r border-gray-700" />
                      <div className="flex-1 p-2 space-y-1.5">
                        <div className="h-1.5 bg-gray-600 rounded w-3/4" />
                        <div className="h-1.5 bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                  <div className="px-2.5 py-2 bg-gray-800">
                    <span className="text-xs font-medium text-gray-200">{t.label}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-16 relative border-b border-gray-200 overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <div className="w-1/2 bg-white flex">
                        <div className="w-1/3 bg-gray-50 border-r border-gray-100" />
                        <div className="flex-1 p-2 space-y-1.5">
                          <div className="h-1.5 bg-gray-200 rounded w-3/4" />
                          <div className="h-1.5 bg-gray-100 rounded w-1/2" />
                        </div>
                      </div>
                      <div className="w-1/2 bg-gray-800 flex">
                        <div className="w-1/3 bg-gray-900 border-r border-gray-700" />
                        <div className="flex-1 p-2 space-y-1.5">
                          <div className="h-1.5 bg-gray-600 rounded w-3/4" />
                          <div className="h-1.5 bg-gray-700 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-2.5 py-2 bg-gray-50">
                    <span className="text-xs font-medium text-gray-700">{t.label}</span>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="border-t border-gray-100 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">Notifications</span>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { label: 'Rappels de rendez-vous par email', value: notifRdv, set: setNotifRdv },
            { label: 'Alertes tâches en retard', value: notifTache, set: setNotifTache },
            { label: 'Nouvelles candidatures ATS', value: notifAts, set: setNotifAts },
          ].map(({ label, value, set }) => (
            <div key={label} className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-600">{label}</span>
              <Toggle value={value} onChange={set} />
            </div>
          ))}
        </div>
      </div>

      {/* Langue */}
      <div className="border-t border-gray-100 pt-8">
        <span className="text-sm font-medium text-gray-900 block mb-3">Langue</span>
        <select className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300">
          <option value="fr">Français</option>
        </select>
      </div>
    </div>
  )
}

function SecuriteSection() {
  const supabase = createClient()
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  async function handleChangePwd(e: React.FormEvent) {
    e.preventDefault()
    if (newPwd !== confirmPwd) { setPwdMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' }); return }
    if (newPwd.length < 8) { setPwdMsg({ type: 'error', text: 'Minimum 8 caractères.' }); return }
    setPwdSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setPwdSaving(false)
    if (error) setPwdMsg({ type: 'error', text: error.message })
    else { setPwdMsg({ type: 'ok', text: 'Mot de passe modifié.' }); setNewPwd(''); setConfirmPwd('') }
    setTimeout(() => setPwdMsg(null), 4000)
  }

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold text-gray-900">Confidentialité</h1>

      {/* Changer mot de passe */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">Changer le mot de passe</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Minimum 8 caractères.</p>
        <form onSubmit={handleChangePwd} className="space-y-3 max-w-sm">
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
              placeholder="Nouveau mot de passe" required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm pr-9 focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-300" />
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input type={showPwd ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
            placeholder="Confirmer le mot de passe" required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-300" />
          {pwdMsg && (
            <p className={cn('text-xs px-3 py-2 rounded-lg', pwdMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
              {pwdMsg.text}
            </p>
          )}
          <button type="submit" disabled={pwdSaving}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            <Lock className="w-3.5 h-3.5" />
            {pwdSaving ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>

      {/* 2FA */}
      <div className="border-t border-gray-100 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">Sécurité avancée</span>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-gray-50">
          <span className="text-sm text-gray-600">Authentification à deux facteurs</span>
          <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Bientôt</span>
        </div>
      </div>
    </div>
  )
}

function DonneesSection() {
  const { user } = useAuth()
  const supabase = createClient()
  const [deleteConfirm, setDeleteConfirm] = useState('')

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold text-gray-900">Données</h1>

      {/* Export */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Download className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">Exporter mes données</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Téléchargez vos données personnelles à tout moment.</p>
        <button className="text-sm border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors text-gray-700">
          Télécharger mes données
        </button>
      </div>

      {/* Zone dangereuse */}
      <div className="border-t border-gray-100 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span className="text-sm font-medium text-rose-600">Zone dangereuse</span>
        </div>
        <div className="border border-rose-200 bg-rose-50 rounded-xl p-5">
          <p className="text-sm font-medium text-rose-900 mb-1">Supprimer mon compte</p>
          <p className="text-xs text-rose-700/70 mb-4">Cette action est irréversible. Toutes vos données associées seront définitivement perdues.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
              placeholder='Tapez "SUPPRIMER" pour confirmer'
              className="text-sm border border-rose-200 bg-white px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-300 w-64 placeholder:text-rose-300" />
            {deleteConfirm === 'SUPPRIMER' && (
              <button
                onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
                className="text-sm border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                Confirmer la suppression
              </button>
            )}
          </div>
        </div>
      </div>

      {user && (
        <div className="border-t border-gray-100 pt-6 text-[11px] text-gray-300">
          Compte créé le {new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      )}
    </div>
  )
}

function IntegrationsSection() {
  const { status, email, disconnect } = useGoogleCalendar()
  const [flash, setFlash] = useState<'success' | 'error' | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'google_connected') setFlash('success')
    else if (params.get('error')) setFlash('error')
    // Clean URL
    if (params.has('success') || params.has('error')) {
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations')
    }
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Intégrations</h1>
        <p className="text-xs text-gray-400">Connectez des services externes pour enrichir votre expérience.</p>
      </div>

      {flash === 'success' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Google Calendar connecté avec succès.
        </div>
      )}
      {flash === 'error' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
          La connexion a échoué. Vérifiez vos variables d'environnement <code className="font-mono">GOOGLE_CLIENT_ID</code> et <code className="font-mono">GOOGLE_CLIENT_SECRET</code>.
        </div>
      )}

      {/* Google Calendar card */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Google Calendar</p>
            {status === 'connected' && email
              ? <p className="text-[11px] text-gray-400">{email}</p>
              : <p className="text-[11px] text-gray-400">Synchronisation des rendez-vous</p>
            }
          </div>

          <div className="flex items-center gap-3">
            {status === 'loading' && (
              <span className="text-[11px] text-gray-400">Chargement...</span>
            )}
            {status === 'connected' && (
              <>
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
                  <CheckCircle2 className="w-3 h-3" />Connecté
                </span>
                <button onClick={disconnect}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />Déconnecter
                </button>
              </>
            )}
            {status === 'disconnected' && (
              <button onClick={() => {
                const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
                if (!clientId) return alert('VITE_GOOGLE_CLIENT_ID non configuré')
                const params = new URLSearchParams({
                  client_id: clientId,
                  redirect_uri: `${window.location.origin}/api/auth/google/callback`,
                  response_type: 'code',
                  scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
                  access_type: 'offline',
                  prompt: 'consent',
                })
                window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
              }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Se connecter avec Google
              </button>
            )}
          </div>
        </div>

        {status === 'connected' && (
          <div className="px-5 pb-4 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">
              Les rendez-vous créés dans l'agenda seront automatiquement ajoutés à votre Google Calendar.
            </p>
          </div>
        )}
      </div>

    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200', value ? 'bg-gray-900' : 'bg-gray-200')}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5',
          value ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}
