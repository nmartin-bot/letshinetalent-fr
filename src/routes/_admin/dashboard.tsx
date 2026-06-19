import { createFileRoute } from '@tanstack/react-router'
import { Calendar, Users, Building2, FileSearch } from 'lucide-react'

export const Route = createFileRoute('/_admin/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bonjour 👋</h1>
        <p className="text-gray-500 mt-1">Voici un aperçu de votre activité.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar} label="RDV aujourd'hui" value="—" color="blue" />
        <StatCard icon={Users} label="Candidats actifs" value="—" color="green" />
        <StatCard icon={Building2} label="Entreprises" value="—" color="purple" />
        <StatCard icon={FileSearch} label="Nouvelles candidatures" value="—" color="orange" />
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="RDV du jour" empty="Aucun rendez-vous aujourd'hui" />
        <Section title="Relances en retard" empty="Aucune relance en retard" />
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.FC<{ className?: string }>
  label: string
  value: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function Section({ title, empty }: { title: string; empty: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
      <p className="text-sm text-gray-400 text-center py-8">{empty}</p>
    </div>
  )
}
