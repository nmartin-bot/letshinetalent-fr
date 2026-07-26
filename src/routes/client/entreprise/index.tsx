import { createFileRoute, Link } from '@tanstack/react-router'
import { FolderOpen, Calendar, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/client/entreprise/')({
  component: EntrepriseHome,
})

const TOOLS = [
  { href: '/client/entreprise/documents', icon: FolderOpen, color: 'bg-amber-50 text-amber-600', title: 'Documents', desc: 'Retrouvez tous les documents partagés par votre conseiller.' },
  { href: '/client/entreprise/agenda', icon: Calendar, color: 'bg-cyan-50 text-cyan-600', title: 'Agenda', desc: 'Consultez vos prochains rendez-vous.' },
]

function EntrepriseHome() {
  return (
    <div className="flex-1 overflow-auto p-8">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Bienvenue sur votre espace</h1>
      <p className="text-sm text-gray-500 mb-8">Accédez à vos documents et suivez vos rendez-vous.</p>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {TOOLS.map(({ href, icon: Icon, color, title, desc }) => (
          <Link key={href} to={href}
            className="flex flex-col gap-3 bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm transition-all group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{title}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors mt-auto" />
          </Link>
        ))}
      </div>
    </div>
  )
}
