import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Trash2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { useAppointments, type AppointmentWithLabel } from '@/hooks/useAppointments'
import AppointmentForm from '@/components/appointments/AppointmentForm'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_admin/appointments/')({
  component: AgendaPage,
})

type ViewMode = 'week' | 'month'
type Appointment = AppointmentWithLabel

const TYPE_COLORS: Record<string, string> = {
  coaching_1: 'bg-blue-100 text-blue-700 border-blue-200',
  coaching_2: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  coaching_3: 'bg-purple-100 text-purple-700 border-purple-200',
  training: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  company: 'bg-orange-100 text-orange-700 border-orange-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
}

const TYPE_LABELS: Record<string, string> = {
  coaching_1: 'Coaching 1',
  coaching_2: 'Coaching 2',
  coaching_3: 'Coaching 3',
  training: 'Formation',
  company: 'Entreprise',
  other: 'Autre',
}

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-yellow-400',
  confirmed: 'bg-green-400',
  cancelled: 'bg-red-400',
  done: 'bg-gray-400',
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDateRange(start: Date, mode: ViewMode) {
  if (mode === 'week') {
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} — ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
  }
  return start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function AgendaPage() {
  const [mode, setMode] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Appointment | null>(null)

  const periodStart = useMemo(() =>
    mode === 'week' ? startOfWeek(anchor) : startOfMonth(anchor),
    [anchor, mode]
  )

  const periodEnd = useMemo(() => {
    const d = new Date(periodStart)
    if (mode === 'week') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
    return d
  }, [periodStart, mode])

  const { appointments, loading, create, remove } = useAppointments(
    periodStart.toISOString(),
    periodEnd.toISOString()
  )

  function navigate(dir: 1 | -1) {
    const d = new Date(anchor)
    if (mode === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setAnchor(d)
  }

  function goToday() { const d = new Date(); d.setHours(0,0,0,0); setAnchor(d) }

  async function handleCreate(values: Parameters<typeof create>[0]) {
    await create(values)
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce rendez-vous ?')) return
    await remove(id)
    setSelected(null)
  }

  const days = useMemo(() => {
    if (mode === 'week') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(periodStart)
        d.setDate(d.getDate() + i)
        return d
      })
    }
    const firstDay = new Date(periodStart)
    const dayOfWeek = firstDay.getDay()
    const startPad = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const start = new Date(firstDay)
    start.setDate(start.getDate() - startPad)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [periodStart, mode])

  const today = new Date(); today.setHours(0,0,0,0)

  return (
    <>
      <PageHeader
        pathItems={[{ label: 'Agenda' }]}
        secondBarLeft={
          <div className="flex items-center gap-2">
            <button onClick={goToday} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 font-medium">
              Aujourd'hui
            </button>
            <div className="flex items-center gap-0.5">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 border border-gray-200">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 border border-gray-200">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-sm font-medium text-gray-700">{formatDateRange(periodStart, mode)}</span>
          </div>
        }
        secondBarRight={
          <>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(['week', 'month'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors',
                    mode === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                  {m === 'week' ? 'Semaine' : 'Mois'}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" />Nouveau RDV
            </button>
          </>
        }
      />

      <div className="h-full overflow-hidden p-6">

      {/* Modal création */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold text-lg">Nouveau rendez-vous</h2>
            </div>
            <div className="p-6">
              <AppointmentForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal détail RDV */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', TYPE_COLORS[selected.type])}>
                  {TYPE_LABELS[selected.type]}
                </span>
                <h3 className="font-semibold mt-2 text-gray-900">{selected.entityLabel} —
                  {new Date(selected.starts_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>
              <button onClick={() => handleDelete(selected.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                {new Date(selected.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                {' '}— {selected.duration_minutes} min
              </div>
              {selected.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {selected.location}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', STATUS_DOT[selected.status])} />
                <span className="capitalize">{selected.status}</span>
              </div>
            </div>
            {selected.notes && (
              <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selected.notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Grille jours */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1">
        {/* Header jours */}
        <div className={cn('grid border-b', mode === 'week' ? 'grid-cols-7' : 'grid-cols-7')}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Chargement...</div>
        ) : mode === 'week' ? (
          <WeekView days={days} appointments={appointments} onSelect={setSelected} today={today} />
        ) : (
          <MonthView days={days} appointments={appointments} onSelect={setSelected} today={today} periodStart={periodStart} />
        )}
      </div>
    </div>
    </>
  )
}

function WeekView({ days, appointments, onSelect, today }: {
  days: Date[]
  appointments: Appointment[]
  onSelect: (a: Appointment) => void
  today: Date
}) {
  return (
    <div className="grid grid-cols-7 divide-x h-full min-h-[500px]">
      {days.map(day => {
        const dayAppts = appointments.filter(a => isSameDay(new Date(a.starts_at), day))
        const isToday = isSameDay(day, today)
        return (
          <div key={day.toISOString()} className="flex flex-col">
            <div className={cn('py-3 text-center border-b', isToday && 'bg-blue-50')}>
              <p className="text-xs text-gray-400">{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
              <p className={cn('text-lg font-semibold mt-0.5',
                isToday ? 'text-blue-600' : 'text-gray-900')}>
                {day.getDate()}
              </p>
            </div>
            <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
              {dayAppts.map(appt => (
                <button key={appt.id} onClick={() => onSelect(appt)}
                  className={cn('w-full text-left rounded-md px-2 py-1.5 text-xs font-medium border transition-opacity hover:opacity-80', TYPE_COLORS[appt.type])}>
                  <p className="truncate">{new Date(appt.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {appt.entityLabel}</p>
                  <p className="truncate mt-0.5 opacity-70">{TYPE_LABELS[appt.type]}</p>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonthView({ days, appointments, onSelect, today, periodStart }: {
  days: Date[]
  appointments: Appointment[]
  onSelect: (a: Appointment) => void
  today: Date
  periodStart: Date
}) {
  return (
    <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y">
      {days.map(day => {
        const dayAppts = appointments.filter(a => isSameDay(new Date(a.starts_at), day))
        const isToday = isSameDay(day, today)
        const isCurrentMonth = day.getMonth() === periodStart.getMonth()
        return (
          <div key={day.toISOString()} className={cn('p-1.5 min-h-[80px]', !isCurrentMonth && 'bg-gray-50')}>
            <p className={cn('text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1',
              isToday ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-400')}>
              {day.getDate()}
            </p>
            <div className="space-y-0.5">
              {dayAppts.slice(0, 3).map(appt => (
                <button key={appt.id} onClick={() => onSelect(appt)}
                  className={cn('w-full text-left rounded px-1.5 py-0.5 text-xs font-medium truncate border', TYPE_COLORS[appt.type])}>
                  {new Date(appt.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {appt.entityLabel}
                </button>
              ))}
              {dayAppts.length > 3 && (
                <p className="text-xs text-gray-400 pl-1">+{dayAppts.length - 3} autres</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
