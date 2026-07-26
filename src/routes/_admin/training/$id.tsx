import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Users, BookOpen } from 'lucide-react'
import { useTrainingCourse } from '@/hooks/useTraining'
import { CourseForm } from '@/routes/_admin/training/index'
import PageHeader from '@/components/layout/PageHeader'
import DocumentManager from '@/components/shared/DocumentManager'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Modal, { fieldLabel, fieldInput, FormFooter } from '@/components/shared/Modal'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

export const Route = createFileRoute('/_admin/training/$id')({
  component: TrainingCoursePage,
})

type Attendance = Database['public']['Tables']['attendance']['Row']
type Learner = Database['public']['Tables']['learners']['Row']
type SidebarView = 'session' | 'apprenants' | 'infos'

function TrainingCoursePage() {
  const { id } = Route.useParams()
  const { course, sessions, learners, loading, addSession, removeSession, updateSession, getAttendance, updateCourse } = useTrainingCourse(id)
  const [editing, setEditing] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sideView, setSideView] = useState<SidebarView>('session')
  const [showAddSession, setShowAddSession] = useState(false)
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [attendance, setAttendance] = useState<Record<string, Attendance[]>>({} as Record<string, Attendance[]>)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteSession, setConfirmDeleteSession] = useState<{ id: string; title: string } | null>(null)

  const selectedSession = sessions.find(s => s.id === selectedSessionId) ?? sessions[0] ?? null

  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) setSelectedSessionId(sessions[0].id)
  }, [sessions, selectedSessionId])

  useEffect(() => {
    if (selectedSession && !attendance[selectedSession.id]) {
      getAttendance(selectedSession.id).then(data =>
        setAttendance(prev => ({ ...prev, [selectedSession.id]: data }))
      )
    }
  }, [selectedSession?.id])

  async function handleAddSession(e: React.FormEvent) {
    e.preventDefault()
    if (!newSessionTitle.trim()) return
    setSaving(true)
    const { data, error } = await addSession({ title: newSessionTitle.trim() })
    if (error) {
      console.error('Erreur création session:', error)
      setSaving(false)
      return
    }
    if (data) setSelectedSessionId(data.id)
    setNewSessionTitle('')
    setShowAddSession(false)
    setSaving(false)
  }

  async function handleRename(sessionId: string) {
    if (!renameValue.trim()) return
    await updateSession(sessionId, { title: renameValue.trim() })
    setRenamingId(null)
  }

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>
  if (!course) return <div className="p-8 text-gray-500">Formation introuvable.</div>

  const sessionAttendance = selectedSession ? (attendance[selectedSession.id] ?? []) : []
  const presentCount = sessionAttendance.filter(a => a.present).length

  return (
    <>
      <PageHeader
        pathItems={[
          { label: 'Formations', href: '/training' },
          { label: course.title },
        ]}
        secondBarLeft={
          <div className="flex items-center gap-1">
            {(['session', 'apprenants', 'infos'] as SidebarView[]).map(v => (
              <button key={v} onClick={() => setSideView(v)}
                className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  sideView === v ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700')}>
                {v === 'session' ? 'Sessions' : v === 'apprenants' ? 'Apprenants' : 'Infos'}
              </button>
            ))}
          </div>
        }
        secondBarRight={
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
            <Pencil className="w-3.5 h-3.5" />Modifier
          </button>
        }
      />

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b"><h2 className="font-semibold">Modifier la formation</h2></div>
            <div className="p-6">
              <CourseForm initial={course} onSubmit={async v => { await updateCourse(v); setEditing(false) }} onCancel={() => setEditing(false)} />
            </div>
          </div>
        </div>
      )}

      {showAddSession && (
        <Modal title="Nouvelle session" onClose={() => setShowAddSession(false)} size="sm">
          <form onSubmit={handleAddSession} className="space-y-4">
            <div>
              <label className={fieldLabel}>Titre de la session *</label>
              <input required value={newSessionTitle} onChange={e => setNewSessionTitle(e.target.value)}
                className={fieldInput} autoFocus placeholder="ex : Module 1 — Introduction" />
            </div>
            <FormFooter onCancel={() => setShowAddSession(false)} saving={saving} label="Créer" />
          </form>
        </Modal>
      )}

      {confirmDeleteSession && (
        <ConfirmDialog
          title={`Supprimer "${confirmDeleteSession.title}" ?`}
          description="Cette session et tous ses documents seront définitivement supprimés."
          confirmLabel="Supprimer"
          icon={Trash2}
          onConfirm={async () => {
            await removeSession(confirmDeleteSession.id)
            if (selectedSessionId === confirmDeleteSession.id) setSelectedSessionId(null)
            setConfirmDeleteSession(null)
          }}
          onCancel={() => setConfirmDeleteSession(null)}
        />
      )}

      {sideView === 'session' ? (
        <div className="flex h-full overflow-hidden">
          {/* Sessions sidebar */}
          <div className="w-60 shrink-0 border-r border-gray-100 bg-white flex flex-col">
            <div className="h-12 px-3 border-b border-gray-100 flex items-center">
              <button onClick={() => setShowAddSession(true)}
                className="flex items-center gap-1.5 w-full px-3 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors">
                <Plus className="w-3.5 h-3.5" />Nouvelle session
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {sessions.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 px-4">Aucune session</p>
              ) : (
                sessions.map((s, i) => {
                  const isSelected = selectedSessionId === s.id
                  return (
                    <div key={s.id} className={cn('group flex items-center gap-2.5 px-3 py-2.5 transition-colors', isSelected ? 'bg-gray-50' : 'hover:bg-gray-50/60')}>
                      <button onClick={() => setSelectedSessionId(s.id)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold',
                          isSelected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500')}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          {renamingId === s.id ? (
                            <input autoFocus value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onBlur={() => handleRename(s.id)}
                              onKeyDown={e => { if (e.key === 'Enter') handleRename(s.id); if (e.key === 'Escape') setRenamingId(null) }}
                              className="text-xs font-medium bg-white border border-blue-300 rounded px-1 py-0.5 outline-none w-full"
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <p className={cn('text-xs font-medium truncate', isSelected ? 'text-gray-900' : 'text-gray-600')}>
                              {s.title ?? `Session ${i + 1}`}
                            </p>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => { setRenamingId(s.id); setRenameValue(s.title ?? '') }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => setConfirmDeleteSession({ id: s.id, title: s.title ?? `Session ${i + 1}` })}
                          className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Session detail — documents */}
          {selectedSession ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Session header */}
              <div className="h-12 border-b border-gray-100 flex items-center justify-between px-5 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {selectedSession.title ?? `Session ${sessions.indexOf(selectedSession) + 1}`}
                  </span>
                  {learners.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Users className="w-3.5 h-3.5" />{presentCount}/{learners.length} présents
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setRenamingId(selectedSession.id); setRenameValue(selectedSession.title ?? '') }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Documents */}
              <div className="flex-1 overflow-hidden">
                <DocumentManager entityType="session" entityId={selectedSession.id} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              {sessions.length === 0 ? 'Créez une première session' : 'Sélectionnez une session'}
            </div>
          )}
        </div>
      ) : sideView === 'apprenants' ? (
        <div className="h-full overflow-y-auto bg-white">
          <ApprenantsList learners={learners} />
        </div>
      ) : (
        <div className="h-full overflow-y-auto p-6">
          <InfosPanel course={course} />
        </div>
      )}
    </>
  )
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function ApprenantsList({ learners }: { learners: Learner[] }) {
  if (learners.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-500 mb-2">Aucun apprenant lié à cette formation.</p>
        <Link to="/learners" className="text-xs text-blue-600 hover:underline">Gérer les apprenants →</Link>
      </div>
    )
  }
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left pl-6 pr-4 py-2.5 text-xs font-medium text-gray-400">Apprenant</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Email</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Téléphone</th>
            <th className="text-left px-4 py-2.5 pr-6 text-xs font-medium text-gray-400">Fonction</th>
          </tr>
        </thead>
        <tbody>
          {learners.map(l => {
            const fullName = `${l.first_name} ${l.last_name}`
            return (
              <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                <td className="pl-6 pr-4 py-3">
                  <Link to="/learners/$id" params={{ id: l.id }} className="flex items-center gap-2.5 group/link">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold', avatarColor(fullName))}>
                      {l.first_name[0]}{l.last_name[0]}
                    </div>
                    <span className="font-medium text-gray-900 group-hover/link:text-blue-600 transition-colors">{fullName}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{l.email ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{l.phone ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 pr-6 text-xs text-gray-500">{l.function ?? <span className="text-gray-300">—</span>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function InfosPanel({ course }: { course: Database['public']['Tables']['training_courses']['Row'] & { companies?: { name: string } | null } }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-lg">
      {[
        { label: 'Titre', value: course.title },
        { label: 'Entreprise', value: (course as typeof course & { companies?: { name: string } | null }).companies?.name },
      ].filter(f => f.value).map(({ label, value }) => (
        <div key={label}>
          <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
          <dd className="text-sm text-gray-900">{value}</dd>
        </div>
      ))}
      {course.description && (
        <div className="sm:col-span-2">
          <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Description</dt>
          <dd className="text-sm text-gray-900 whitespace-pre-wrap">{course.description}</dd>
        </div>
      )}
    </dl>
  )
}
