import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Users, BookOpen, Check, ChevronDown, ChevronRight, Folder, FolderPlus, CornerLeftUp } from 'lucide-react'
import { useTrainingCourse, useLearnerGroups, flattenCourse } from '@/hooks/useTraining'
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
type LearnerGroup = Database['public']['Tables']['learner_groups']['Row']
type Session = Database['public']['Tables']['training_sessions']['Row']
type TrainingModule = Database['public']['Tables']['training_modules']['Row']
type SidebarView = 'session' | 'groupes' | 'apprenants' | 'infos'

function TrainingCoursePage() {
  const { id } = Route.useParams()
  const {
    course, sessions, modules, learners, loading,
    addSession, removeSession, updateSession, moveSession,
    addModule, renameModule, removeModule, moveModule,
    getAttendance, updateCourse, refresh,
  } = useTrainingCourse(id)
  const [showAddModule, setShowAddModule] = useState(false)
  const [newModuleName, setNewModuleName] = useState('')
  const [confirmDeleteModule, setConfirmDeleteModule] = useState<TrainingModule | null>(null)
  const groups = useLearnerGroups(id)
  const [editing, setEditing] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sideView, setSideView] = useState<SidebarView>('session')
  const [showAddSession, setShowAddSession] = useState(false)
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [attendance, setAttendance] = useState<Record<string, Attendance[]>>({} as Record<string, Attendance[]>)
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
            {(['session', 'groupes', 'apprenants', 'infos'] as SidebarView[]).map(v => (
              <button key={v} onClick={() => setSideView(v)}
                className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  sideView === v ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700')}>
                {v === 'session' ? 'Sessions' : v === 'groupes' ? 'Groupes' : v === 'apprenants' ? 'Apprenants' : 'Infos'}
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

      {showAddModule && (
        <Modal title="Nouveau module" subtitle="Un module regroupe son cours, ses cas et leurs corrections." icon={Folder} onClose={() => setShowAddModule(false)} size="sm">
          <form onSubmit={async e => {
            e.preventDefault()
            if (!newModuleName.trim()) return
            setSaving(true)
            await addModule(newModuleName.trim())
            setNewModuleName(''); setShowAddModule(false); setSaving(false)
          }} className="space-y-4">
            <div>
              <label className={fieldLabel}>Nom du module *</label>
              <input required value={newModuleName} onChange={e => setNewModuleName(e.target.value)}
                className={fieldInput} autoFocus placeholder="ex : Module 1 — Fondamentaux" />
            </div>
            <FormFooter onCancel={() => setShowAddModule(false)} saving={saving} label="Créer" />
          </form>
        </Modal>
      )}

      {confirmDeleteModule && (
        <ConfirmDialog
          title={`Supprimer le module "${confirmDeleteModule.name}" ?`}
          description="Son contenu n'est pas supprimé : il remonte à la racine de la formation."
          confirmLabel="Supprimer"
          icon={Trash2}
          onConfirm={async () => { await removeModule(confirmDeleteModule.id); setConfirmDeleteModule(null) }}
          onCancel={() => setConfirmDeleteModule(null)}
        />
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
          <SessionTree
            sessions={sessions}
            modules={modules}
            selectedId={selectedSessionId}
            onSelect={setSelectedSessionId}
            onAddSession={() => setShowAddSession(true)}
            onAddModule={() => setShowAddModule(true)}
            onMoveSession={moveSession}
            onMoveModule={moveModule}
            onRenameSession={(sid, title) => updateSession(sid, { title })}
            onRenameModule={renameModule}
            onDeleteSession={s => setConfirmDeleteSession({ id: s.id, title: s.title ?? 'ce contenu' })}
            onDeleteModule={m => setConfirmDeleteModule(m)}
          />

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
              </div>

              {/* Documents */}
              <div className="flex-1 overflow-hidden">
                <DocumentManager entityType="session" entityId={selectedSession.id} groups={groups.groups} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              {sessions.length === 0 ? 'Créez une première session' : 'Sélectionnez une session'}
            </div>
          )}
        </div>
      ) : sideView === 'groupes' ? (
        <div className="h-full overflow-y-auto bg-white">
          <GroupsPanel groups={groups} learners={learners} sessions={sessions} onChanged={() => refresh(true)} />
        </div>
      ) : sideView === 'apprenants' ? (
        <div className="h-full overflow-y-auto bg-white">
          <ApprenantsList
            learners={learners}
            groups={groups.groups}
            onAssign={async (learnerId, groupId) => { await groups.assignLearner(learnerId, groupId); await refresh() }}
          />
        </div>
      ) : (
        <div className="h-full overflow-y-auto p-6">
          <InfosPanel course={course} />
        </div>
      )}
    </>
  )
}

function SessionTree({ sessions, modules, selectedId, onSelect, onAddSession, onAddModule, onMoveSession, onMoveModule, onRenameSession, onRenameModule, onDeleteSession, onDeleteModule }: {
  sessions: Session[]
  modules: TrainingModule[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAddSession: () => void
  onAddModule: () => void
  onMoveSession: (sessionId: string, moduleId: string | null, toIndex: number) => Promise<unknown>
  onMoveModule: (moduleId: string, toIndex: number) => Promise<unknown>
  onRenameSession: (id: string, title: string) => Promise<unknown>
  onRenameModule: (id: string, name: string) => Promise<unknown>
  onDeleteSession: (s: Session) => void
  onDeleteModule: (m: TrainingModule) => void
}) {
  const [drag, setDrag] = useState<{ kind: 'session' | 'module'; id: string } | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [renaming, setRenaming] = useState<{ kind: 'session' | 'module'; id: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const ordered = [...modules].sort((a, b) => a.position - b.position)
  const loose = sessions.filter(s => !s.module_id).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const rank = new Map(flattenCourse(ordered, sessions).map((s, i) => [s.id, i + 1]))

  function startRename(kind: 'session' | 'module', id: string, value: string) {
    setRenaming({ kind, id }); setRenameValue(value)
  }
  async function commitRename() {
    if (!renaming) return
    const value = renameValue.trim()
    if (value) {
      if (renaming.kind === 'session') await onRenameSession(renaming.id, value)
      else await onRenameModule(renaming.id, value)
    }
    setRenaming(null)
  }
  const renameInput = (
    <input autoFocus value={renameValue}
      onChange={e => setRenameValue(e.target.value)}
      onBlur={commitRename}
      onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null) }}
      onClick={e => e.stopPropagation()}
      className="text-xs font-medium bg-white border border-blue-300 rounded px-1 py-0.5 outline-none w-full" />
  )

  // Déposer sur un contenu = s'insérer juste avant lui, dans son conteneur.
  async function dropOnSession(target: Session) {
    if (drag?.kind !== 'session' || drag.id === target.id) return
    const siblings = sessions
      .filter(s => s.module_id === target.module_id && s.id !== drag.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    await onMoveSession(drag.id, target.module_id, siblings.findIndex(s => s.id === target.id))
  }

  function sessionRow(s: Session, indented: boolean) {
    const isSelected = selectedId === s.id
    const isRenaming = renaming?.kind === 'session' && renaming.id === s.id
    return (
      <div key={s.id}
        draggable={!isRenaming}
        onDragStart={e => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', s.id)
          setDrag({ kind: 'session', id: s.id })
        }}
        onDragEnd={() => { setDrag(null); setOver(null) }}
        onDragOver={e => { if (drag?.kind === 'session' && drag.id !== s.id) { e.preventDefault(); setOver(s.id) } }}
        onDragLeave={() => setOver(o => o === s.id ? null : o)}
        onDrop={e => { e.preventDefault(); dropOnSession(s); setDrag(null); setOver(null) }}
        className={cn('group flex items-center gap-2 py-2 pr-2 transition-colors',
          indented ? 'pl-7' : 'pl-3',
          isSelected ? 'bg-gray-50' : 'hover:bg-gray-50/60',
          drag?.id === s.id && 'opacity-40',
          over === s.id && 'border-t-2 border-blue-400')}>
        {/* div et non button : un <button> absorbe le mousedown et empêche le
            parent draggable de démarrer le glissement (Chrome, Safari). */}
        <div role="button" tabIndex={0}
          onClick={() => onSelect(s.id)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.id) } }}
          className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-grab active:cursor-grabbing">
          <div className={cn('w-5 h-5 rounded flex items-center justify-center shrink-0 text-[9px] font-bold',
            isSelected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500')}>
            {rank.get(s.id)}
          </div>
          <div className="flex-1 min-w-0">
            {isRenaming ? renameInput : (
              <p className={cn('text-xs font-medium truncate', isSelected ? 'text-gray-900' : 'text-gray-600')}>
                {s.title ?? `Contenu ${rank.get(s.id)}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {s.module_id && (
            <button onClick={() => onMoveSession(s.id, null, loose.length)} title="Sortir du module"
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
              <CornerLeftUp className="w-3 h-3" />
            </button>
          )}
          <button onClick={() => startRename('session', s.id, s.title ?? '')}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={() => onDeleteSession(s)}
            className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-60 shrink-0 border-r border-gray-100 bg-white flex flex-col">
      <div className="h-12 px-2 border-b border-gray-100 flex items-center gap-1">
        <button onClick={onAddModule} title="Nouveau module"
          className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium transition-colors shrink-0">
          <FolderPlus className="w-3.5 h-3.5" />
        </button>
        <button onClick={onAddSession}
          className="flex items-center justify-center gap-1.5 flex-1 px-2 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" />Contenu
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 && modules.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6 px-4">Aucun contenu</p>
        ) : (
          <>
            {loose.map(s => sessionRow(s, false))}

            {/* Collante : sans défilement automatique pendant un glissement natif,
                une zone en flux serait hors d'atteinte dans une longue liste. */}
            {drag?.kind === 'session' && sessions.find(s => s.id === drag.id)?.module_id && (
              <div
                onDragOver={e => { e.preventDefault(); setOver('__root__') }}
                onDragLeave={() => setOver(o => o === '__root__' ? null : o)}
                onDrop={async e => {
                  e.preventDefault()
                  await onMoveSession(drag.id, null, loose.length)
                  setDrag(null); setOver(null)
                }}
                className={cn('sticky top-0 z-10 mx-3 my-1.5 py-2 rounded-lg border border-dashed text-center text-[10px] shadow-sm transition-colors',
                  over === '__root__' ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-300 bg-white text-gray-400')}>
                Sortir du module
              </div>
            )}

            {ordered.map((m, mi) => {
              const children = sessions.filter(s => s.module_id === m.id).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
              const isOpen = !collapsed.has(m.id)
              const isRenaming = renaming?.kind === 'module' && renaming.id === m.id
              return (
                <div key={m.id}>
                  <div
                    draggable={!isRenaming}
                    onDragStart={e => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', m.id)
                      setDrag({ kind: 'module', id: m.id })
                    }}
                    onDragEnd={() => { setDrag(null); setOver(null) }}
                    onDragOver={e => { if (drag && drag.id !== m.id) { e.preventDefault(); setOver(m.id) } }}
                    onDragLeave={() => setOver(o => o === m.id ? null : o)}
                    onDrop={async e => {
                      e.preventDefault()
                      if (drag?.kind === 'module') await onMoveModule(drag.id, mi)
                      else if (drag?.kind === 'session') await onMoveSession(drag.id, m.id, children.length)
                      setDrag(null); setOver(null)
                    }}
                    className={cn('group flex items-center gap-1.5 px-2 py-2 mt-0.5 transition-colors hover:bg-gray-50/60',
                      drag?.id === m.id && 'opacity-40',
                      over === m.id && (drag?.kind === 'module' ? 'border-t-2 border-blue-400' : 'ring-1 ring-inset ring-blue-400 bg-blue-50/50'))}>
                    <button onClick={() => setCollapsed(prev => {
                      const next = new Set(prev)
                      next.has(m.id) ? next.delete(m.id) : next.add(m.id)
                      return next
                    })} className="p-0.5 text-gray-400 hover:text-gray-600 shrink-0">
                      {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    <Folder className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <div className="flex-1 min-w-0 cursor-grab active:cursor-grabbing">
                      {isRenaming ? renameInput : (
                        <p className="text-xs font-semibold text-gray-700 truncate">{m.name}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{children.length}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => startRename('module', m.id, m.name)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => onDeleteModule(m)}
                        className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    children.length === 0
                      ? <p className="pl-7 pr-3 py-1.5 text-[10px] text-gray-300">Module vide</p>
                      : children.map(s => sessionRow(s, true))
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
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

function formatPeriod(g: LearnerGroup) {
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  if (g.starts_on && g.ends_on) return `${fmt(g.starts_on)} → ${fmt(g.ends_on)}`
  if (g.starts_on) return `à partir du ${fmt(g.starts_on)}`
  if (g.ends_on) return `jusqu'au ${fmt(g.ends_on)}`
  return null
}

function GroupsPanel({ groups, learners, sessions, onChanged }: {
  groups: ReturnType<typeof useLearnerGroups>
  learners: Learner[]
  sessions: Session[]
  onChanged: () => Promise<void>
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<LearnerGroup | null>(null)
  const [managing, setManaging] = useState<LearnerGroup | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<LearnerGroup | null>(null)

  const managedGroup = managing ? groups.groups.find(g => g.id === managing.id) ?? managing : null

  const countFor = (groupId: string) => learners.filter(l => l.group_id === groupId).length
  const ungrouped = learners.filter(l => !l.group_id).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Groupes d'apprenants</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Créez un groupe par promotion pour séparer les participants de chaque session de formation.
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0">
          <Plus className="w-3.5 h-3.5" />Nouveau groupe
        </button>
      </div>

      {groups.loading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : groups.groups.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-1">Aucun groupe pour cette formation.</p>
          <p className="text-xs text-gray-400">
            {learners.length > 1
              ? `Les ${learners.length} apprenants sont pour l'instant non affectés.`
              : learners.length === 1
                ? "L'unique apprenant est pour l'instant non affecté."
                : 'Aucun apprenant n\'est encore rattaché à cette formation.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {groups.groups.map(g => {
            const period = formatPeriod(g)
            const count = countFor(g.id)
            return (
              <div key={g.id} className="group flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-50/60 transition-colors">
                <button onClick={() => setManaging(g)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-violet-700 transition-colors">{g.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {[period, g.current_session_id
                        ? `accès jusqu'à « ${sessions.find(s => s.id === g.current_session_id)?.title ?? 'module'} »`
                        : 'aucun accès ouvert'].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </button>
                <span className="text-xs text-gray-500 shrink-0">
                  {count} apprenant{count > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => setEditingGroup(g)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(g)}
                    className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
          {ungrouped > 0 && (
            <p className="text-xs text-gray-400 pt-2">
              {ungrouped} apprenant{ungrouped > 1 ? 's' : ''} non affecté{ungrouped > 1 ? 's' : ''} — ouvrez un groupe pour {ungrouped > 1 ? 'les' : 'l\''}y ajouter.
            </p>
          )}
        </div>
      )}

      {(showForm || editingGroup) && (
        <Modal
          title={editingGroup ? 'Modifier le groupe' : 'Nouveau groupe'}
          subtitle="Un groupe correspond à une promotion de cette formation."
          icon={Users}
          size="sm"
          onClose={() => { setShowForm(false); setEditingGroup(null) }}>
          <GroupForm
            initial={editingGroup}
            onSubmit={async values => {
              if (editingGroup) await groups.update(editingGroup.id, values)
              else await groups.create(values)
              setShowForm(false); setEditingGroup(null)
            }}
            onCancel={() => { setShowForm(false); setEditingGroup(null) }}
          />
        </Modal>
      )}

      {managedGroup && (
        <Modal
          title={managedGroup.name}
          subtitle="Membres de la promotion et modules ouverts dans leur espace."
          icon={Users}
          onClose={() => setManaging(null)}>
          <ManageGroup
            group={managedGroup}
            learners={learners}
            sessions={sessions}
            onSetSession={async sessionId => { await groups.setGroupSession(managedGroup.id, sessionId); await onChanged() }}
            onSetMembers={async ids => { await groups.setMembers(managedGroup.id, ids); await onChanged() }}
            onClose={() => setManaging(null)}
          />
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Supprimer le groupe "${confirmDelete.name}" ?`}
          description="Les apprenants de ce groupe ne seront pas supprimés, ils redeviendront simplement non affectés."
          confirmLabel="Supprimer"
          icon={Trash2}
          onConfirm={async () => { await groups.remove(confirmDelete.id); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

function ManageGroup({ group, learners, sessions, onSetSession, onSetMembers, onClose }: {
  group: LearnerGroup
  learners: Learner[]
  sessions: Session[]
  onSetSession: (sessionId: string | null) => Promise<void>
  onSetMembers: (learnerIds: string[]) => Promise<void>
  onClose: () => void
}) {
  const [members, setMembers] = useState<Set<string>>(
    () => new Set(learners.filter(l => l.group_id === group.id).map(l => l.id))
  )
  const [showSessions, setShowSessions] = useState(false)
  const [saving, setSaving] = useState(false)

  // Un apprenant ne peut être que dans une promo : les autres groupes sont verrouillés.
  const available = learners.filter(l => !l.group_id || l.group_id === group.id)
  const takenCount = learners.length - available.length
  const currentSession = sessions.find(s => s.id === group.current_session_id)

  function toggle(id: string) {
    setMembers(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSetMembers([...members])
    setSaving(false)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={fieldLabel}>Modules ouverts dans l'espace apprenant</label>
        <div className="relative">
          <button type="button" onClick={() => setShowSessions(v => !v)}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition-colors">
            <span className={cn('truncate', currentSession ? 'text-gray-900' : 'text-gray-400')}>
              {currentSession ? `Jusqu'à « ${currentSession.title ?? 'module'} »` : 'Aucun accès ouvert'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
          </button>
          {showSessions && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSessions(false)} />
              <div className="absolute top-full mt-1.5 left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1 max-h-56 overflow-y-auto">
                <button type="button"
                  onClick={async () => { setShowSessions(false); setSaving(true); await onSetSession(null); setSaving(false) }}
                  className={cn('flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50 text-left transition-colors',
                    !group.current_session_id ? 'text-gray-900 font-medium' : 'text-gray-500')}>
                  Aucun accès
                  {!group.current_session_id && <Check className="w-3 h-3 shrink-0 ml-1" />}
                </button>
                {sessions.map((s, i) => (
                  <button key={s.id} type="button"
                    onClick={async () => { setShowSessions(false); setSaving(true); await onSetSession(s.id); setSaving(false) }}
                    className={cn('flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50 text-left transition-colors',
                      group.current_session_id === s.id ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                    <span className="truncate">{s.title ?? `Module ${i + 1}`}</span>
                    {group.current_session_id === s.id && <Check className="w-3 h-3 shrink-0 ml-1" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">
          Tous les modules jusqu'à celui-ci s'ouvrent d'un coup pour l'ensemble de la promotion.
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label className={cn(fieldLabel, 'mb-0')}>Membres</label>
          <span className="text-[11px] text-gray-400">{members.size} sélectionné{members.size > 1 ? 's' : ''}</span>
        </div>
        {available.length === 0 ? (
          <p className="text-xs text-gray-400 py-3">Aucun apprenant disponible pour cette formation.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-50 max-h-56 overflow-y-auto">
            {available.map(l => {
              const fullName = `${l.first_name} ${l.last_name}`
              const checked = members.has(l.id)
              return (
                <label key={l.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50/60 cursor-pointer transition-colors">
                  <input type="checkbox" checked={checked} onChange={() => toggle(l.id)}
                    className="w-3.5 h-3.5 rounded border-gray-200 accent-gray-900 cursor-pointer shrink-0" />
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold', avatarColor(fullName))}>
                    {l.first_name[0]}{l.last_name[0]}
                  </div>
                  <span className="text-xs text-gray-700 truncate">{fullName}</span>
                </label>
              )
            })}
          </div>
        )}
        {takenCount > 0 && (
          <p className="text-[11px] text-gray-400 mt-1.5">
            {takenCount} apprenant{takenCount > 1 ? 's' : ''} déjà rattaché{takenCount > 1 ? 's' : ''} à une autre promotion.
          </p>
        )}
      </div>

      <FormFooter onCancel={onClose} saving={saving} label="Enregistrer" />
    </form>
  )
}

function GroupForm({ initial, onSubmit, onCancel }: {
  initial?: LearnerGroup | null
  onSubmit: (v: { name: string; starts_on: string | null; ends_on: string | null }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [startsOn, setStartsOn] = useState(initial?.starts_on ?? '')
  const [endsOn, setEndsOn] = useState(initial?.ends_on ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSubmit({ name: name.trim(), starts_on: startsOn || null, ends_on: endsOn || null })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={fieldLabel}>Nom du groupe *</label>
        <input required value={name} onChange={e => setName(e.target.value)}
          className={fieldInput} autoFocus placeholder="ex : Promo janvier 2026" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabel}>Début</label>
          <input type="date" value={startsOn} onChange={e => setStartsOn(e.target.value)} className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Fin</label>
          <input type="date" value={endsOn} onChange={e => setEndsOn(e.target.value)} className={fieldInput} />
        </div>
      </div>
      <FormFooter onCancel={onCancel} saving={saving} label={initial ? 'Enregistrer' : 'Créer'} />
    </form>
  )
}

function GroupPicker({ learner, groups, onAssign }: {
  learner: Learner
  groups: LearnerGroup[]
  onAssign: (learnerId: string, groupId: string | null) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const current = groups.find(g => g.id === learner.group_id)

  if (groups.length === 0) {
    return <span className="text-xs text-gray-300">Aucun groupe créé</span>
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs transition-colors',
          current ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50')}>
        {current?.name ?? 'Non affecté'}
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 min-w-[180px]">
            <button onClick={async () => { await onAssign(learner.id, null); setOpen(false) }}
              className={cn('flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-left transition-colors',
                !learner.group_id ? 'text-gray-900 font-medium' : 'text-gray-500')}>
              Non affecté
              {!learner.group_id && <Check className="w-3 h-3 shrink-0 ml-1" />}
            </button>
            {groups.map(g => (
              <button key={g.id} onClick={async () => { await onAssign(learner.id, g.id); setOpen(false) }}
                className={cn('flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-left transition-colors',
                  learner.group_id === g.id ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                <span className="truncate">{g.name}</span>
                {learner.group_id === g.id && <Check className="w-3 h-3 shrink-0 ml-1" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ApprenantsList({ learners, groups, onAssign }: {
  learners: Learner[]
  groups: LearnerGroup[]
  onAssign: (learnerId: string, groupId: string | null) => Promise<void>
}) {
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
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Groupe</th>
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
                <td className="px-4 py-3">
                  <GroupPicker learner={l} groups={groups} onAssign={onAssign} />
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
