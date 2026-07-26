import { createFileRoute, Link } from '@tanstack/react-router'
import { FileText, ScanSearch, Mail, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/outils/')({
  component: OutilsHome,
})

const TOOLS = [
  {
    href: '/outils/cv',
    icon: FileText,
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    title: 'Créer mon CV',
    desc: 'Construisez un CV professionnel section par section, choisissez votre mise en page et téléchargez-le en PDF.',
  },
  {
    href: '/outils/lettre',
    icon: Mail,
    color: 'bg-violet-50 text-violet-600 border-violet-100',
    title: 'Rédiger ma lettre',
    desc: 'Rédigez une lettre de motivation structurée et percutante, adaptée au poste que vous visez.',
  },
  {
    href: '/outils/analyse',
    icon: ScanSearch,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    title: 'Analyser mon CV (ATS)',
    desc: 'Collez votre CV et obtenez une analyse IA : score ATS, mots-clés manquants, points à améliorer.',
  },
]

function OutilsHome() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Vos outils carrière</h1>
          <p className="text-gray-500">Choisissez un outil pour commencer. Vos données sont sauvegardées automatiquement.</p>
        </div>
        <div className="grid gap-4">
          {TOOLS.map(({ href, icon: Icon, color, title, desc }) => (
            <Link key={href} to={href}
              className="flex items-center gap-5 bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm transition-all group">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
