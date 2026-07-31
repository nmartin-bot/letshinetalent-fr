import { createFileRoute, redirect, Outlet, Link, useRouterState } from '@tanstack/react-router'
import { createContext, useContext, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { FileText, ScanSearch, Mail, LogOut, Moon, Sun, Download, BookOpen, X, GraduationCap, User, Building2, FolderOpen, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

async function downloadAsPdf(elementId: string, filename: string) {
  const { default: html2canvas } = await import('html2canvas')
  const { default: jsPDF } = await import('jspdf')
  const el = document.getElementById(elementId)
  if (!el) return

  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;overflow:hidden;'
  document.body.appendChild(wrapper)
  wrapper.appendChild(el)
  el.style.display = 'block'
  el.style.width = '794px'

  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })

  el.style.display = ''
  el.style.width = ''
  document.body.appendChild(el)
  document.body.removeChild(wrapper)

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pdfW = pdf.internal.pageSize.getWidth()
  const pdfH = pdf.internal.pageSize.getHeight()
  const imgH = (canvas.height * pdfW) / canvas.width
  let y = 0
  let remaining = imgH
  while (remaining > 0) {
    pdf.addImage(imgData, 'PNG', 0, y, pdfW, imgH)
    remaining -= pdfH
    if (remaining > 0) { pdf.addPage(); y -= pdfH }
  }
  pdf.save(filename)
}

export const Route = createFileRoute('/outils')({
  beforeLoad: async ({ location }) => {
    if (location.pathname === '/outils/login') return
    if (typeof window === 'undefined') return // skip SSR — magic link token is in URL hash, client-only

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw redirect({ to: '/outils/login' })

    const { data: profile } = await supabase
      .from('profiles').select('role, client_type').eq('id', session.user.id).maybeSingle() as { data: { role: string; client_type: string | null } | null }

    if (!profile) {
      await supabase.from('profiles').insert({ id: session.user.id, role: 'public' } as never)
    }
  },
  loader: async () => {
    if (import.meta.env.DEV) return { clientType: null as string | null }
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { clientType: null }
    const { data: profile } = await supabase
      .from('profiles').select('role, client_type').eq('id', session.user.id).single() as
      { data: { role: string; client_type: string | null } | null }
    if (profile?.role !== 'client') return { clientType: null }
    return { clientType: profile.client_type }
  },
  component: OutilsLayout,
})

type OutilsThemeCtx = { dark: boolean }
export const OutilsThemeContext = createContext<OutilsThemeCtx>({ dark: false })
export function useOutilsTheme() { return useContext(OutilsThemeContext) }

/* ──────────────────── GUIDE CONSEILS ──────────────────── */

const GUIDE = [
  {
    num: 1,
    title: 'En-tête',
    color: '#c9a84c',
    desc: 'La première impression. Ton nom doit être bien visible et le poste recherché aide le recruteur à comprendre ton objectif immédiatement.',
    conseil: 'Indique un intitulé de poste précis, aligné avec l\'offre à laquelle tu postules. Évite les formulations génériques comme "En recherche d\'emploi".',
  },
  {
    num: 2,
    title: 'Accroche / Profil',
    color: '#c9a84c',
    desc: 'Une courte introduction (2-3 phrases) qui résume ton profil et ton objectif professionnel. Elle capte l\'attention du recruteur en quelques secondes.',
    conseil: 'Commence par ton niveau d\'expérience, ta spécialité et ce que tu apportes. Ex. : "Développeur fullstack avec 4 ans d\'expérience en React et Node.js, je cherche à contribuer à des projets d\'envergure."',
  },
  {
    num: 3,
    title: 'Expériences professionnelles',
    color: '#c9a84c',
    desc: 'Le cœur du CV. Elles montrent ton parcours, tes responsabilités et tes résultats concrets.',
    conseil: 'Indique toujours les dates, le poste, l\'entreprise et 3 à 5 missions clés. Privilégie les verbes d\'action (piloté, conçu, développé, réduit...) et les résultats chiffrés quand c\'est possible.',
  },
  {
    num: 4,
    title: 'Formations',
    color: '#c9a84c',
    desc: 'Tes diplômes et études. Ils prouvent ton niveau académique et tes compétences théoriques.',
    conseil: 'Mentionne le nom de l\'école, le diplôme et l\'année d\'obtention. Pour les diplômes récents, tu peux ajouter la spécialité ou les modules clés.',
  },
  {
    num: 5,
    title: 'Atouts personnalité',
    color: '#c9a84c',
    desc: 'Tes qualités personnelles (ex. : rigueur, créativité, esprit d\'équipe). Elles reflètent ton comportement au travail et ta façon de collaborer.',
    conseil: 'Choisis 4 à 6 atouts en lien avec le poste visé. Évite les clichés trop génériques — préfère des qualités que tu peux illustrer concrètement.',
  },
  {
    num: 6,
    title: 'Compétences',
    color: '#c9a84c',
    desc: 'Ce que tu sais faire concrètement : outils, méthodes, langages, techniques. Elles passent les filtres ATS.',
    conseil: 'Mets en avant les compétences clés du métier ciblé. Piocher dans l\'offre d\'emploi pour reprendre les mots-clés exacts utilisés par le recruteur.',
  },
  {
    num: 7,
    title: 'Logiciels',
    color: '#c9a84c',
    desc: 'Les outils numériques que tu maîtrises (ex. : Excel, Photoshop, Salesforce, Figma).',
    conseil: 'Indique ton niveau pour chaque outil : débutant, intermédiaire ou avancé. Ne liste que les logiciels réellement maîtrisés.',
  },
  {
    num: 8,
    title: 'Langues',
    color: '#c9a84c',
    desc: 'Tes niveaux de langues parlées et écrites. Un atout important pour de nombreux postes.',
    conseil: 'Précise le niveau clairement : Notions / Intermédiaire / Courant / Bilingue / Langue maternelle. Tu peux aussi utiliser le cadre européen (A1 à C2).',
  },
  {
    num: 9,
    title: 'Centres d\'intérêt',
    color: '#c9a84c',
    desc: 'Tes passions et activités extraprofessionnelles. Elles donnent un aperçu de ta personnalité.',
    conseil: 'Choisis des centres d\'intérêt valorisants ou liés au poste. Évite les activités trop banales — préfère des loisirs qui te différencient ou montrent un engagement.',
  },
]

export function GuideModal({ onClose, dark }: { onClose: () => void; dark: boolean }) {
  return createPortal(
    <div data-outils-dark={dark ? 'true' : undefined} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: 560, maxHeight: '88vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <span className="font-semibold text-sm text-gray-900">Aide à la rédaction de votre CV</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {GUIDE.map(({ num, title, desc, conseil }) => (
            <div key={num}>
              <h3 className="font-semibold text-sm mb-1 text-gray-900">
                {num}. {title}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-2">{desc}</p>
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5">
                <p className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-semibold text-gray-800">Conseil : </span>{conseil}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ──────────────────── LAYOUT ──────────────────── */

type ClientType = 'candidate' | 'learner' | 'company' | null

const CLIENT_NAV: Record<string, { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  candidate: [
    { href: '/client/candidat', label: 'Accueil', icon: User },
    { href: '/outils/cv', label: 'Mon CV', icon: FileText },
    { href: '/outils/lettre', label: 'Ma lettre', icon: Mail },
    { href: '/outils/analyse', label: 'Analyse ATS', icon: ScanSearch },
    { href: '/client/candidat/documents', label: 'Mes documents', icon: FolderOpen },
    { href: '/client/candidat/agenda', label: 'Mon agenda', icon: Calendar },
  ],
  learner: [
    { href: '/client/apprenant', label: 'Accueil', icon: GraduationCap },
    { href: '/outils/cv', label: 'Mon CV', icon: FileText },
    { href: '/outils/lettre', label: 'Ma lettre', icon: Mail },
    { href: '/outils/analyse', label: 'Analyse ATS', icon: ScanSearch },
    { href: '/client/apprenant/formations', label: 'Mes formations', icon: BookOpen },
    { href: '/client/apprenant/documents', label: 'Mes documents', icon: FolderOpen },
    { href: '/client/apprenant/agenda', label: 'Mon agenda', icon: Calendar },
  ],
  company: [
    { href: '/client/entreprise', label: 'Accueil', icon: Building2 },
    { href: '/client/entreprise/documents', label: 'Documents', icon: FolderOpen },
    { href: '/client/entreprise/agenda', label: 'Agenda', icon: Calendar },
  ],
}

const CLIENT_COLOR: Record<string, string> = {
  candidate: 'bg-rose-500',
  learner: 'bg-violet-500',
  company: 'bg-blue-500',
}

function ClientSidebarInOutils({ clientType }: { clientType: string }) {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const nav = CLIENT_NAV[clientType] ?? []
  const backHref = clientType === 'learner' ? '/client/apprenant' : clientType === 'company' ? '/client/entreprise' : '/client/candidat'

  async function handleLogout() {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="w-56 shrink-0 border-r border-gray-100 flex flex-col bg-white">
      <div className="h-12 flex items-center gap-2 px-4 border-b border-gray-100 shrink-0">
        <span className="font-semibold text-xs text-gray-900">Let Shine Talent</span>
      </div>
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href.startsWith('/outils') && pathname.startsWith(href))
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
      <div className="px-3 py-3 border-t border-gray-100">
        <button onClick={handleLogout}
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors w-full">
          <LogOut className="w-3.5 h-3.5" />Se déconnecter
        </button>
      </div>
    </aside>
  )
}

function OutilsLayout() {
  const { clientType } = Route.useLoaderData()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('outils-dark') === 'true'
  })
  const [guideOpen, setGuideOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { localStorage.setItem('outils-dark', String(dark)) }, [dark])

  async function handleLogout() {
    await createClient().auth.signOut()
    window.location.href = '/outils/login'
  }

  const NAV = [
    { href: '/outils/cv', label: 'CV', icon: FileText },
    { href: '/outils/lettre', label: 'Lettre de motivation', icon: Mail },
    { href: '/outils/analyse', label: 'Analyse ATS', icon: ScanSearch },
  ]

  const isCV = pathname.startsWith('/outils/cv')
  const isLogin = pathname === '/outils/login'

  if (clientType) {
    return (
      <OutilsThemeContext.Provider value={{ dark }}>
        <div className="h-screen bg-gray-50 flex overflow-hidden" data-outils-dark={dark ? 'true' : undefined}>
          <ClientSidebarInOutils clientType={clientType} />
          <div className="flex-1 flex flex-col overflow-hidden">
            {isCV && (
              <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 shrink-0">
                <button onClick={() => setGuideOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                  <BookOpen className="w-3.5 h-3.5" />Aide à la rédaction
                </button>
                <button onClick={() => downloadAsPdf('cv-print-area', 'mon-cv.pdf')}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                  <Download className="w-3.5 h-3.5" />PDF
                </button>
                <button onClick={() => setDark(d => !d)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-auto">
                  {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            )}
            <div className="flex-1 flex overflow-hidden">
              <Outlet />
            </div>
          </div>
          {mounted && guideOpen && <GuideModal onClose={() => setGuideOpen(false)} dark={dark} />}
        </div>
      </OutilsThemeContext.Provider>
    )
  }

  return (
    <OutilsThemeContext.Provider value={{ dark }}>
      <div
        className="h-screen bg-gray-50 flex flex-col overflow-hidden"
        data-outils-dark={dark ? 'true' : undefined}
      >
        {!isLogin && <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} to={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                )}>
                <Icon className="w-3.5 h-3.5" />{label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            {isCV && (
              <>
                <button
                  onClick={() => setGuideOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />Aide à la rédaction
                </button>
                <button
                  onClick={() => downloadAsPdf('cv-print-area', 'mon-cv.pdf')}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />PDF
                </button>
              </>
            )}
            <button
              onClick={() => setDark(d => !d)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title={dark ? 'Mode clair' : 'Mode sombre'}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1.5">
              <LogOut className="w-3.5 h-3.5" />Se déconnecter
            </button>
          </div>
        </header>}

        <div className="flex-1 flex overflow-hidden">
          <Outlet />
        </div>

        {mounted && guideOpen && <GuideModal onClose={() => setGuideOpen(false)} dark={dark} />}
      </div>
    </OutilsThemeContext.Provider>
  )
}
