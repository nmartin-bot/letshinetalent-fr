import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Trash2, Pencil } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import Modal from '@/components/shared/Modal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import HelpTooltip from '@/components/shared/HelpTooltip'
import { useAppointments, type AppointmentWithLabel } from '@/hooks/useAppointments'
import AppointmentForm from '@/components/appointments/AppointmentForm'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_admin/appointments/')({
  component: AgendaPage,
})

type ViewMode = 'week' | 'month'
type Appointment = AppointmentWithLabel


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
  const [mode, setMode] = useState<ViewMode>('month')
  const [anchor, setAnchor] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Appointment | null>(null)

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

  const { appointments, loading, create, update, remove, totalCount } = useAppointments(
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

  async function handleUpdate(values: Parameters<typeof create>[0]) {
    if (!editing) return
    await update(editing.id, values)
    setEditing(null)
    setSelected(null)
  }

  async function handleDelete(appt: Appointment) {
    setSelected(null)
    setConfirmDelete(appt)
  }

  async function confirmDeleteAppt() {
    if (!confirmDelete) return
    await remove(confirmDelete.id)
    setConfirmDelete(null)
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
    // Nombre de jours dans le mois
    const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate()
    // Semaines nécessaires pour couvrir tout le mois
    const weeksNeeded = Math.ceil((startPad + daysInMonth) / 7)
    const totalDays = Math.min(weeksNeeded, 5) * 7
    const finalDays = weeksNeeded <= 5 ? totalDays : weeksNeeded * 7
    return Array.from({ length: finalDays }, (_, i) => {
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
            <HelpTooltip
              id="agenda-week"
              title="Calendrier semaine"
              description="Chaque bloc représente un rendez-vous. Les couleurs indiquent le type (coaching, formation, entreprise). Cliquez sur un bloc pour voir le détail ou le modifier."
              visual={
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {['L', 'M', 'M', 'J', 'V'].map((d, i) => (
                      <div key={i} className="flex-1 text-center text-[9px] font-semibold text-gray-400">{d}</div>
                    ))}
                  </div>
                  <div className="flex gap-1 h-12">
                    {[null, 'rose', null, 'violet', null].map((color, i) => (
                      <div key={i} className="flex-1 rounded bg-gray-100 relative overflow-hidden">
                        {color && <div className={`absolute inset-x-0.5 top-1 bottom-1 rounded bg-${color}-100 border border-${color}-200`} />}
                      </div>
                    ))}
                  </div>
                </div>
              }
            />
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" />Nouveau RDV
            </button>
          </>
        }
      />

      <div className="flex flex-col h-full overflow-hidden p-6">

      {showForm && (
        <Modal title="Nouveau rendez-vous" subtitle="Planifiez une séance, une formation ou une réunion." onClose={() => setShowForm(false)}>
          <AppointmentForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Supprimer ce rendez-vous ?"
          description={`Le rendez-vous avec ${confirmDelete.entityLabel} sera définitivement supprimé.`}
          confirmLabel="Supprimer"
          icon={Trash2}
          onConfirm={confirmDeleteAppt}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {editing && (
        <Modal title="Modifier le rendez-vous" subtitle="Mettez à jour les informations du RDV." onClose={() => setEditing(null)}>
          <AppointmentForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} label="Enregistrer" />
        </Modal>
      )}

      {/* Modal détail RDV */}
      {selected && (() => {
        const colors = EVENT_COLORS[selected.type] ?? EVENT_COLORS.other
        const start = new Date(selected.starts_at)
        const end = new Date(start.getTime() + selected.duration_minutes * 60000)
        const initials = entityInitials(selected.entityLabel)
        const statusLabels: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmé', cancelled: 'Annulé', done: 'Effectué' }
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              {/* Header coloré */}
              <div className={cn('px-5 pt-5 pb-4', colors.card)}>
                <div className="flex items-start justify-between">
                  <p className={cn('text-[10px] font-semibold uppercase tracking-widest mb-2', colors.label)}>
                    {TYPE_LABELS[selected.type] ?? selected.type}
                  </p>
                  <div className="flex items-center gap-1 -mt-1 -mr-1">
                    <button onClick={() => { setEditing(selected); setSelected(null) }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/60 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(selected)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white/60 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setSelected(null)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/60 transition-colors">
                      <span className="text-sm leading-none">×</span>
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 text-base leading-snug">{selected.entityLabel}</h3>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">
                  {start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                {/* Avatars */}
                <div className="flex items-center gap-1.5 mt-3">
                  <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm', colors.adminAvatar)}>A</span>
                  <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm', colors.entityAvatar)}>{initials}</span>
                </div>
              </div>
              {/* Corps */}
              <div className="px-5 py-4 space-y-0">
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5" />Horaire
                  </div>
                  <span className="text-xs text-gray-900 font-medium">
                    {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {selected.duration_minutes} min
                  </span>
                </div>
                {selected.location && (
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <MapPin className="w-3.5 h-3.5" />Lieu
                    </div>
                    <span className="text-xs text-gray-900">{selected.location}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className={cn('w-2 h-2 rounded-full', STATUS_DOT[selected.status])} />Statut
                  </div>
                  <span className="text-xs text-gray-900">{statusLabels[selected.status] ?? selected.status}</span>
                </div>
                {selected.notes && (
                  <div className="pt-3">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">Notes</p>
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">{selected.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {!loading && totalCount === 0 ? (
        <EmptyState
          variant="calendar"
          title="Aucun rendez-vous"
          description="Planifiez vos séances de coaching, formations et réunions entreprises."
          action={{ label: 'Nouveau RDV', onClick: () => setShowForm(true) }}
          className="flex-1"
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">Chargement...</div>
          ) : mode === 'week' ? (
            <WeekView days={days} appointments={appointments} onSelect={setSelected} today={today} />
          ) : (
            <MonthView days={days} appointments={appointments} onSelect={setSelected} today={today} periodStart={periodStart} />
          )}
        </div>
      )}
    </div>
    </>
  )
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7h → 20h
const HOUR_H = 96 // px par heure

const EVENT_COLORS: Record<string, { card: string; label: string; entityAvatar: string; adminAvatar: string; pill: string }> = {
  coaching_1: { card: 'bg-rose-50 border-rose-200',       label: 'text-rose-500',    entityAvatar: 'bg-rose-200 text-rose-800',     adminAvatar: 'bg-rose-100 text-rose-400',    pill: 'bg-rose-50 border-rose-300 text-rose-700' },
  coaching_2: { card: 'bg-violet-50 border-violet-200',   label: 'text-violet-500',  entityAvatar: 'bg-violet-200 text-violet-800', adminAvatar: 'bg-violet-100 text-violet-400', pill: 'bg-violet-50 border-violet-300 text-violet-700' },
  coaching_3: { card: 'bg-blue-50 border-blue-200',       label: 'text-blue-500',    entityAvatar: 'bg-blue-200 text-blue-800',     adminAvatar: 'bg-blue-100 text-blue-400',    pill: 'bg-blue-50 border-blue-300 text-blue-700' },
  training:   { card: 'bg-emerald-50 border-emerald-200', label: 'text-emerald-600', entityAvatar: 'bg-emerald-200 text-emerald-800', adminAvatar: 'bg-emerald-100 text-emerald-400', pill: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  company:    { card: 'bg-yellow-50 border-yellow-200',   label: 'text-yellow-600',  entityAvatar: 'bg-yellow-200 text-yellow-800', adminAvatar: 'bg-yellow-100 text-yellow-500', pill: 'bg-yellow-50 border-yellow-300 text-yellow-700' },
  other:      { card: 'bg-orange-50 border-orange-200',   label: 'text-orange-500',  entityAvatar: 'bg-orange-200 text-orange-800', adminAvatar: 'bg-orange-100 text-orange-400', pill: 'bg-orange-50 border-orange-300 text-orange-700' },
}

function entityInitials(label: string) {
  const parts = label.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : label.slice(0, 2).toUpperCase()
}

function WeekView({ days, appointments, onSelect, today }: {
  days: Date[]
  appointments: Appointment[]
  onSelect: (a: Appointment) => void
  today: Date
}) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b border-gray-100 shrink-0">
        <div className="w-14 shrink-0" />
        {days.map(day => {
          const isToday = isSameDay(day, today)
          return (
            <div key={day.toISOString()} className="flex-1 py-2.5 text-center border-l border-gray-100 first:border-l-0">
              <p className={cn('text-xs font-medium uppercase tracking-wide', isToday ? 'text-blue-500' : 'text-gray-400')}>
                {day.getDate()} {day.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase()}
              </p>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex flex-1 overflow-y-auto">
        {/* Hour labels */}
        <div className="w-14 shrink-0 relative" style={{ height: HOURS.length * HOUR_H }}>
          {HOURS.map((h, i) => (
            <div key={h} className="absolute w-full flex items-start justify-end pr-3" style={{ top: i * HOUR_H, height: HOUR_H }}>
              <span className="text-xs text-gray-300 -translate-y-2">
                {h < 12 ? `${h}h` : h === 12 ? '12h' : `${h}h`}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex flex-1 divide-x divide-gray-100">
          {days.map(day => {
            const dayAppts = appointments.filter(a => isSameDay(new Date(a.starts_at), day))
            return (
              <div key={day.toISOString()} className="flex-1 relative" style={{ height: HOURS.length * HOUR_H }}>
                {/* Hour lines */}
                {HOURS.map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: i * HOUR_H }} />
                ))}
                {/* Events */}
                {dayAppts.map(appt => {
                  const start = new Date(appt.starts_at)
                  const startDecimal = start.getHours() + start.getMinutes() / 60
                  const top = (startDecimal - HOURS[0]) * HOUR_H
                  const height = Math.max((appt.duration_minutes / 60) * HOUR_H - 4, 24)
                  const end = new Date(start.getTime() + appt.duration_minutes * 60000)
                  const colors = EVENT_COLORS[appt.type] ?? EVENT_COLORS.other
                  const initials = entityInitials(appt.entityLabel)
                  const timeStr = `${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                  const tall = height >= 72
                  return (
                    <button key={appt.id} onClick={() => onSelect(appt)}
                      style={{ top: top + 2, height, left: 4, right: 4 }}
                      className={cn('absolute rounded-lg border px-2 py-1.5 text-left hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between', colors.card)}>
                      <div className="min-w-0">
                        <p className={cn('text-[9px] font-semibold uppercase tracking-wide leading-tight mb-0.5', colors.label)}>{TYPE_LABELS[appt.type] ?? appt.type}</p>
                        <p className="text-xs font-semibold leading-tight truncate text-gray-900">{appt.entityLabel}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{timeStr}</p>
                        {tall && appt.location && (
                          <p className="flex items-center gap-0.5 text-[10px] text-gray-400 mt-0.5 leading-tight truncate">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />{appt.location}
                          </p>
                        )}
                      </div>
                      {tall && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0', colors.adminAvatar)}>A</span>
                          <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0', colors.entityAvatar)}>{initials}</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
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
  const DAY_NAMES = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 shrink-0">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2.5 text-center">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{d}</span>
          </div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-100 flex-1 overflow-y-auto">
        {days.map(day => {
          const dayAppts = appointments.filter(a => isSameDay(new Date(a.starts_at), day))
          const isToday = isSameDay(day, today)
          const isCurrentMonth = day.getMonth() === periodStart.getMonth()
          return (
            <div key={day.toISOString()} className={cn('flex flex-col p-2', !isCurrentMonth && 'bg-gray-50/60')}>
              <p className={cn('text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1.5 ml-auto shrink-0',
                isToday ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300')}>
                {day.getDate()}
              </p>
              <div className="overflow-y-auto space-y-1 flex-1 scrollbar-none">
                {dayAppts.map(appt => {
                  const colors = EVENT_COLORS[appt.type] ?? EVENT_COLORS.other
                  return (
                    <button key={appt.id} onClick={() => onSelect(appt)}
                      className={cn('w-full text-left rounded-md px-2 py-1 text-xs font-medium border truncate transition-shadow hover:shadow-sm', colors.pill)}>
                      {appt.entityLabel}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
