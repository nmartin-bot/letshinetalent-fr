import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, MapPin } from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'

type Appointment = {
  id: string
  type: string
  status: string
  starts_at: string
  duration_minutes: number
  location: string | null
}

const STATUS: Record<string, { label: string; class: string }> = {
  confirmed: { label: 'Confirmé',   class: 'bg-green-100 text-green-700' },
  pending:   { label: 'En attente', class: 'bg-yellow-100 text-yellow-700' },
  done:      { label: 'Effectué',   class: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'Annulé',     class: 'bg-red-100 text-red-500' },
}

const TYPE_LABELS: Record<string, string> = {
  coaching_1: 'Session 1 — Analyse CV',
  coaching_2: 'Session 2 — Simulation entretien',
  coaching_3: 'Session 3 — Bilan final',
  other: 'Rendez-vous',
}

export default function ClientAgenda({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!entityId) return
    const supabase = createClient()
    supabase.from('appointments')
      .select('id, type, status, starts_at, duration_minutes, location')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('starts_at', { ascending: false })
      .then(({ data }) => {
        setAppointments((data ?? []) as Appointment[])
        setLoading(false)
      })
  }, [entityType, entityId])

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">Chargement...</div>

  if (appointments.length === 0) {
    return (
      <EmptyState
        variant="table"
        title="Aucun rendez-vous"
        description="Vos prochains rendez-vous apparaîtront ici."
        ghostOpacity={0.7}
      />
    )
  }

  const upcoming = appointments.filter(a => new Date(a.starts_at) >= new Date() && a.status !== 'cancelled')
  const past = appointments.filter(a => new Date(a.starts_at) < new Date() || a.status === 'cancelled')

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-2xl space-y-8">
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">À venir</h2>
            <div className="space-y-3">
              {upcoming.map(a => <AppointmentCard key={a.id} appt={a} />)}
            </div>
          </section>
        )}
        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Passés</h2>
            <div className="space-y-3 opacity-70">
              {past.map(a => <AppointmentCard key={a.id} appt={a} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function AppointmentCard({ appt }: { appt: Appointment }) {
  const s = STATUS[appt.status] ?? STATUS.pending
  const date = new Date(appt.starts_at)
  const isUpcoming = date >= new Date() && appt.status !== 'cancelled'

  return (
    <div className={cn('bg-white border rounded-2xl p-4 flex items-start gap-4', isUpcoming ? 'border-gray-200' : 'border-gray-100')}>
      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center shrink-0">
        <span className="text-[10px] font-semibold text-gray-400 uppercase">
          {date.toLocaleDateString('fr-FR', { month: 'short' })}
        </span>
        <span className="text-lg font-bold text-gray-900 leading-tight">{date.getDate()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-sm text-gray-900">{TYPE_LABELS[appt.type] ?? appt.type}</p>
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', s.class)}>{s.label}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {appt.duration_minutes} min
          </span>
          {appt.location && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5" />{appt.location}
            </span>
          )}
        </div>
      </div>
      <Calendar className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
    </div>
  )
}
