import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { useTrainingCourse } from '@/hooks/useTraining'
import { CourseForm } from '@/routes/_admin/training/index'
import PageHeader from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

export const Route = createFileRoute('/_admin/training/$id')({
  component: TrainingCoursePage,
})

type Tab = 'sessions' | 'apprenants' | 'infos'
type Session = Database['public']['Tables']['training_sessions']['Row']
type Attendance = Database['public']['Tables']['attendance']['Row']
type Learner = Database['public']['Tables']['learners']['Row']


function TrainingCoursePage() {
  const { id } = Route.useParams()
  const { course, sessions, learners, loading, addSession, removeSession, getAttendance, toggleAttendance, updateCourse } = useTrainingCourse(id)
  const [tab, setTab] = useState<Tab>('sessions')
  const [editing, setEditing] = useState(false)
  const [showAddSession, setShowAddSession] = useState(false)
  const [sessionForm, setSessionForm] = useState({ session_date: '', duration_hours: '', location: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [attendance, setAttendance] = useState<Record<string, Attendance[]>>({})

  async function handleExpandSession(sessionId: string) {
    if (expandedSession === sessionId) { setExpandedSession(null); return }
    setExpandedSession(sessionId)
    if (!attendance[sessionId]) {
      const data = await getAttendance(sessionId)
      setAttendance(prev => ({ ...prev, [sessionId]: data }))
    }
  }

  async function handleToggle(sessionId: string, learnerId: string, present: boolean) {
    await toggleAttendance(sessionId, learnerId, present)
    const data = await getAttendance(sessionId)
    setAttendance(prev => ({ ...prev, [sessionId]: data }))
  }

  async function handleAddSession(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await addSession({
      session_date: sessionForm.session_date,
      duration_hours: sessionForm.duration_hours ? parseInt(sessionForm.duration_hours) : null,
      location: sessionForm.location || null,
      notes: sessionForm.notes || null,
    })
    setSessionForm({ session_date: '', duration_hours: '', location: '', notes: '' })
    setShowAddSession(false)
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>
  if (!course) return <div className="p-8 text-gray-500">Formation introuvable.</div>

  return (
    <>
      <PageHeader
        pathItems={[
          { label: 'Formations', href: '/training' },
          { label: course.title },
        ]}
        secondBarRight={
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Pencil className="w-3.5 h-3.5" />Modifier
          </button>
        }
        secondBarLeft={
          <div className="flex items-center gap-1">
            {(['sessions', 'apprenants', 'infos'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('px-3 py-1 rounded-full text-sm font-medium transition-colors',
                  tab === t ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700')}>
                {t === 'sessions' ? 'Sessions' : t === 'apprenants' ? 'Apprenants' : 'Infos'}
              </button>
            ))}
          </div>
        }
      />

      <div className="h-full overflow-y-auto p-8">
        {editing && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b"><h2 className="font-semibold text-lg">Modifier la formation</h2></div>
              <div className="p-6">
                <CourseForm initial={course} onSubmit={async v => { await updateCourse(v); setEditing(false) }} onCancel={() => setEditing(false)} />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {tab === 'sessions' && (
            <SessionsTab
              sessions={sessions}
              learners={learners}
              attendance={attendance}
              onExpand={handleExpandSession}
              expandedSession={expandedSession}
              onToggle={handleToggle}
              onRemove={removeSession}
              showAddSession={showAddSession}
              setShowAddSession={setShowAddSession}
              sessionForm={sessionForm}
              setSessionForm={setSessionForm}
              onAddSession={handleAddSession}
              saving={saving}
            />
          )}
          {tab === 'apprenants' && <LearnersTab learners={learners} companyId={course.company_id} />}
          {tab === 'infos' && <InfosTab course={course} />}
        </div>
      </div>
    </>
  )
}

function SessionsTab({ sessions, learners, attendance, onExpand, expandedSession, onToggle, onRemove, showAddSession, setShowAddSession, sessionForm, setSessionForm, onAddSession, saving }: {
  sessions: Session[]
  learners: Learner[]
  attendance: Record<string, Attendance[]>
  onExpand: (id: string) => Promise<void>
  expandedSession: string | null
  onToggle: (sessionId: string, learnerId: string, present: boolean) => Promise<void>
  onRemove: (id: string) => Promise<{ error: unknown }>
  showAddSession: boolean
  setShowAddSession: (v: boolean) => void
  sessionForm: { session_date: string; duration_hours: string; location: string; notes: string }
  setSessionForm: (v: typeof sessionForm) => void
  onAddSession: (e: React.FormEvent) => Promise<void>
  saving: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Sessions ({sessions.length})</h3>
        <button onClick={() => setShowAddSession(!showAddSession)}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
          <Plus className="w-4 h-4" />Ajouter une session
        </button>
      </div>

      {showAddSession && (
        <form onSubmit={onAddSession} className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input required type="date" value={sessionForm.session_date}
                onChange={e => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Durée (heures)</label>
              <input type="number" value={sessionForm.duration_hours}
                onChange={e => setSessionForm({ ...sessionForm, duration_hours: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lieu</label>
              <input value={sessionForm.location}
                onChange={e => setSessionForm({ ...sessionForm, location: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input value={sessionForm.notes}
                onChange={e => setSessionForm({ ...sessionForm, notes: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowAddSession(false)} className="text-sm text-gray-500 px-3 py-1.5">Annuler</button>
            <button type="submit" disabled={saving}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}

      {sessions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Aucune session planifiée</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session, i) => {
            const isExpanded = expandedSession === session.id
            const sessionAttendance = attendance[session.id] ?? []
            return (
              <div key={session.id} className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer" onClick={() => onExpand(session.id)}>
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-gray-600">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">
                      {new Date(session.session_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      {session.duration_hours && <span>{session.duration_hours}h</span>}
                      {session.location && <span>{session.location}</span>}
                    </div>
                  </div>
                  {learners.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {sessionAttendance.filter(a => a.present).length}/{learners.length} présents
                    </span>
                  )}
                  <button onClick={e => { e.stopPropagation(); onRemove(session.id) }}
                    className="p-1.5 text-gray-300 hover:text-red-500 rounded-md hover:bg-red-50 ml-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {isExpanded && learners.length > 0 && (
                  <div className="border-t bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Feuille de présence</p>
                    <div className="space-y-2">
                      {learners.map(learner => {
                        const record = sessionAttendance.find(a => a.learner_id === learner.id)
                        const present = record?.present ?? false
                        return (
                          <div key={learner.id} className="flex items-center gap-3">
                            <button onClick={() => handleToggleWrapper(onToggle, session.id, learner.id, !present)}
                              className={cn('w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors shrink-0',
                                present ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-300 hover:border-green-400')}>
                              {present ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            </button>
                            <span className={cn('text-sm', present ? 'text-gray-900' : 'text-gray-400')}>
                              {learner.first_name} {learner.last_name}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {isExpanded && learners.length === 0 && (
                  <div className="border-t bg-gray-50 p-4 text-sm text-gray-400 text-center">
                    Aucun apprenant rattaché à cette formation
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function handleToggleWrapper(fn: (a: string, b: string, c: boolean) => Promise<void>, ...args: [string, string, boolean]) {
  fn(...args)
}

function LearnersTab({ learners, companyId }: { learners: Learner[]; companyId: string | null }) {
  if (learners.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500 mb-2">Aucun apprenant trouvé pour cette entreprise.</p>
        {companyId && (
          <Link to="/learners" className="text-sm text-blue-600 hover:underline">
            Gérer les apprenants →
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900">Apprenants ({learners.length})</h3>
      <div className="space-y-2">
        {learners.map(l => (
          <Link key={l.id} to="/learners/$id" params={{ id: l.id }}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
            <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-emerald-600">{l.first_name[0]}{l.last_name[0]}</span>
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900">{l.first_name} {l.last_name}</p>
              {l.function && <p className="text-xs text-gray-400">{l.function}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function InfosTab({ course }: { course: Database['public']['Tables']['training_courses']['Row'] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {[
        { label: 'Titre', value: course.title },
        { label: 'Type', value: course.type },
        { label: 'Statut', value: course.status },
        { label: 'Heures totales', value: course.total_hours ? `${course.total_hours}h` : null },
        { label: 'Date de début', value: course.start_date ? new Date(course.start_date).toLocaleDateString('fr-FR') : null },
        { label: 'Date de fin', value: course.end_date ? new Date(course.end_date).toLocaleDateString('fr-FR') : null },
      ].map(({ label, value }) => value ? (
        <div key={label}>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
          <dd className="text-sm text-gray-900">{value}</dd>
        </div>
      ) : null)}
    </dl>
  )
}
