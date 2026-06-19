import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Calendar, Users, Building2, FileSearch, Clock, MapPin, ArrowRight, CheckSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'

export const Route = createFileRoute('/_admin/dashboard')({
  component: DashboardPage,
})

interface DashboardData {
  rdvToday: number
  activeCandidates: number
  totalCompanies: number
  newApplications: number
  todayAppointments: {
    id: string
    starts_at: string
    duration_minutes: number
    type: string
    status: string
    location: string | null
    entity_type: string
    entity_id: string
  }[]
  overdueTasks: {
    id: string
    title: string
    due_date: string
    entity_type: string
    entity_id: string
    priority: string
  }[]
}

const TYPE_LABELS: Record<string, string> = {
  coaching_1: 'Coaching 1', coaching_2: 'Coaching 2', coaching_3: 'Coaching 3',
  training: 'Formation', company: 'Entreprise', other: 'Autre',
}

const TYPE_COLORS: Record<string, string> = {
  coaching_1: 'bg-blue-100 text-blue-700',
  coaching_2: 'bg-indigo-100 text-indigo-700',
  coaching_3: 'bg-purple-100 text-purple-700',
  training: 'bg-emerald-100 text-emerald-700',
  company: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-600',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-orange-600 bg-orange-50',
  low: 'text-gray-500 bg-gray-100',
}

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Urgent', medium: 'Normal', low: 'Faible',
}

function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const today = new Date()
      const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999)

      const [
        { count: rdvToday },
        { count: activeCandidates },
        { count: totalCompanies },
        { count: newApplications },
        { data: todayAppointments },
        { data: overdueTasks },
      ] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true })
          .gte('starts_at', todayStart.toISOString()).lte('starts_at', todayEnd.toISOString()),
        supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('ats_applications').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('appointments').select('id, starts_at, duration_minutes, type, status, location, entity_type, entity_id')
          .gte('starts_at', todayStart.toISOString()).lte('starts_at', todayEnd.toISOString())
          .order('starts_at'),
        supabase.from('tasks').select('id, title, due_date, entity_type, entity_id, priority')
          .eq('completed', false).lt('due_date', today.toISOString().split('T')[0])
          .order('due_date').limit(10),
      ])

      setData({
        rdvToday: rdvToday ?? 0,
        activeCandidates: activeCandidates ?? 0,
        totalCompanies: totalCompanies ?? 0,
        newApplications: newApplications ?? 0,
        todayAppointments: (todayAppointments as DashboardData['todayAppointments'] | null) ?? [],
        overdueTasks: (overdueTasks as DashboardData['overdueTasks'] | null) ?? [],
      })
      setLoading(false)
    }
    load()
  }, [])

  return { data, loading }
}

function DashboardPage() {
  const { data, loading } = useDashboard()
  const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <PageHeader
        pathItems={[{ label: 'Dashboard' }]}
        secondBarRight={<span className="text-sm text-gray-400 capitalize">{todayLabel}</span>}
        secondBarLeft={
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {loading ? (
              <span>Chargement...</span>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <strong className="text-gray-700">{data?.rdvToday ?? 0}</strong> RDV ce jour
                </span>
                <span className="text-gray-200">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <strong className="text-gray-700">{data?.activeCandidates ?? 0}</strong> candidats actifs
                </span>
                <span className="text-gray-200">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <strong className="text-gray-700">{data?.overdueTasks.length ?? 0}</strong> relance{(data?.overdueTasks.length ?? 0) > 1 ? 's' : ''} en retard
                </span>
              </>
            )}
          </div>
        }
      />
    <div className="h-full overflow-y-auto p-8">

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar} label="RDV aujourd'hui" value={loading ? '…' : String(data?.rdvToday ?? 0)} color="blue" to="/appointments" />
        <StatCard icon={Users} label="Candidats actifs" value={loading ? '…' : String(data?.activeCandidates ?? 0)} color="green" to="/candidates" />
        <StatCard icon={Building2} label="Entreprises" value={loading ? '…' : String(data?.totalCompanies ?? 0)} color="purple" to="/companies" />
        <StatCard icon={FileSearch} label="Nouvelles candidatures" value={loading ? '…' : String(data?.newApplications ?? 0)} color="orange" to="/ats" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RDV du jour */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">RDV du jour</h2>
            <Link to="/appointments" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Agenda <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-6">Chargement...</p>
          ) : !data?.todayAppointments.length ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucun rendez-vous aujourd'hui</p>
          ) : (
            <div className="space-y-3">
              {data.todayAppointments.map(appt => (
                <div key={appt.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <div className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5', TYPE_COLORS[appt.type])}>
                    {TYPE_LABELS[appt.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(appt.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      <span>· {appt.duration_minutes} min</span>
                    </div>
                    {appt.location && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                        <MapPin className="w-3 h-3" />{appt.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tâches en retard */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Relances en retard</h2>
            {data?.overdueTasks.length ? (
              <span className="text-xs font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {data.overdueTasks.length}
              </span>
            ) : null}
          </div>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-6">Chargement...</p>
          ) : !data?.overdueTasks.length ? (
            <div className="text-center py-6">
              <CheckSquare className="w-8 h-8 text-green-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucune relance en retard</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.overdueTasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-red-100 bg-red-50/50">
                  <div className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', PRIORITY_COLORS[task.priority])}>
                    {PRIORITY_LABELS[task.priority]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-red-500 mt-0.5">
                      Échue le {new Date(task.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

function StatCard({ icon: Icon, label, value, color, to }: {
  icon: React.FC<{ className?: string }>
  label: string
  value: string
  color: 'blue' | 'green' | 'purple' | 'orange'
  to: string
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <Link to={to} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all block">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </Link>
  )
}
