import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Pencil, CheckCircle, Star, TrendingUp, Calendar, MapPin, Clock, ChevronDown, Check, User, Target, FileText, Zap, ListTodo, FolderOpen } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Modal from '@/components/shared/Modal'
import { useCandidate } from '@/hooks/useCandidates'
import { useAppointments } from '@/hooks/useAppointments'
import CandidateForm from '@/components/candidates/CandidateForm'
import EntityTimeline from '@/components/shared/EntityTimeline'
import TaskList from '@/components/shared/TaskList'
import DocumentManager from '@/components/shared/DocumentManager'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

export const Route = createFileRoute('/_admin/candidates/$id')({
  component: CandidatePage,
})

type Tab = 'profil' | 'coaching' | 'cv' | 'rdv' | 'activite' | 'taches' | 'docs'

const TABS: { id: Tab; label: string; color: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profil', label: 'Profil', color: 'bg-rose-400', icon: User },
  { id: 'coaching', label: 'Coaching', color: 'bg-violet-500', icon: Target },
  { id: 'cv', label: 'CV', color: 'bg-blue-500', icon: FileText },
  { id: 'rdv', label: 'RDV', color: 'bg-cyan-400', icon: Calendar },
  { id: 'activite', label: 'Activité', color: 'bg-green-500', icon: Zap },
  { id: 'taches', label: 'Tâches', color: 'bg-yellow-400', icon: ListTodo },
  { id: 'docs', label: 'Documents', color: 'bg-orange-500', icon: FolderOpen },
]

const SESSION_CONFIG = {
  1: { label: 'Session 1', sublabel: 'Analyse & optimisation CV', type: 'cv_analysis' },
  2: { label: 'Session 2', sublabel: 'Simulation d\'entretien', type: 'interview_sim' },
  3: { label: 'Session 3', sublabel: 'Simulation finale & bilan', type: 'final_review' },
} as const

const STATUS_CONFIG = {
  active: { label: 'En cours', class: 'bg-green-100 text-green-700 border border-green-200' },
  completed: { label: 'Terminé', class: 'bg-gray-100 text-gray-500 border border-gray-200' },
  paused: { label: 'En pause', class: 'bg-orange-100 text-orange-700 border border-orange-200' },
} as const

// Grille d'évaluation entretien (sessions 2 et 3)
const INTERVIEW_CRITERIA = [
  { key: 'presentation', label: 'Présentation & posture', desc: 'Tenue, langage non-verbal, poignée de main' },
  { key: 'clarte', label: 'Clarté du discours', desc: 'Structuration des réponses, exemples concrets' },
  { key: 'connaissance', label: 'Connaissance du poste', desc: 'Compréhension du métier et du secteur' },
  { key: 'stress', label: 'Gestion du stress', desc: 'Aisance, gestion des silences et questions difficiles' },
  { key: 'questions', label: 'Questions posées', desc: 'Pertinence et qualité des questions au recruteur' },
]

function CandidatePage() {
  const { id } = Route.useParams()
  const { candidate, sessions, cvVersions, loading, update, upsertSession } = useCandidate(id)
  const [tab, setTab] = useState<Tab>('profil')
  const [showTabMenu, setShowTabMenu] = useState(false)
  const [editing, setEditing] = useState(false)

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>
  if (!candidate) return <div className="p-8 text-gray-500">Candidat introuvable.</div>

  async function handleUpdate(values: Database['public']['Tables']['candidates']['Insert']) {
    await update(values)
    setEditing(false)
  }


  // Score de progression global
  const scoredSessions = sessions.filter(s => s.score != null).sort((a, b) => a.session_number - b.session_number)
  const firstScore = scoredSessions[0]?.score ?? null
  const lastScore = scoredSessions[scoredSessions.length - 1]?.score ?? null
  const progression = firstScore != null && lastScore != null && scoredSessions.length > 1
    ? lastScore - firstScore : null

  const infoFields = [
    { label: 'Email', value: candidate.email },
    { label: 'Téléphone', value: candidate.phone },
    { label: 'Adresse', value: candidate.address },
    { label: 'Situation', value: candidate.current_situation },
    { label: 'Objectif', value: candidate.objective },
  ]

  return (
    <>
      <PageHeader
        pathItems={[
          { label: 'CRM', href: '/candidates' },
          { label: 'Candidats', href: '/candidates' },
          { label: `${candidate.first_name} ${candidate.last_name}` },
        ]}
        secondBarRight={
          <>
            {progression !== null && (
              <span className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
                progression >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                <TrendingUp className="w-3 h-3" />
                {progression >= 0 ? '+' : ''}{progression} pts
              </span>
            )}
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
              <Pencil className="w-3.5 h-3.5" />Modifier
            </button>
          </>
        }
        secondBarLeft={
          <div className="relative">
            <button onClick={() => setShowTabMenu(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
              {(() => { const active = TABS.find(t => t.id === tab)!; return <span className={cn('w-4 h-4 rounded flex items-center justify-center shrink-0', active.color)}><active.icon className="w-2.5 h-2.5 text-white" /></span> })()}
              {TABS.find(t => t.id === tab)?.label}
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>
            {showTabMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTabMenu(false)} />
                <div className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 min-w-[160px]">
                  {TABS.map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); setShowTabMenu(false) }}
                      className={cn('flex items-center gap-2.5 w-full pl-1 pr-3 py-1 rounded-lg text-sm hover:bg-gray-50 text-left transition-colors',
                        tab === t.id ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                      <span className={cn('w-4 h-4 rounded flex items-center justify-center shrink-0', t.color)}><t.icon className="w-2.5 h-2.5 text-white" /></span>
                      {t.label}
                      {tab === t.id && <Check className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        }
      />

      {/* Two-column layout */}
      <div className="flex h-full overflow-hidden">
        {/* Left panel */}
        <div className="w-72 shrink-0 border-r border-gray-100 overflow-y-auto bg-white">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="font-bold text-gray-900 text-lg">{candidate.first_name} {candidate.last_name}</h2>
              {candidate.current_situation && <p className="text-sm text-gray-500 mt-0.5">{candidate.current_situation}</p>}
              {STATUS_CONFIG[candidate.status as keyof typeof STATUS_CONFIG] && (
                <span className={cn('mt-2 inline-flex text-xs font-medium px-2 py-0.5 rounded-full border', STATUS_CONFIG[candidate.status as keyof typeof STATUS_CONFIG].class)}>
                  {STATUS_CONFIG[candidate.status as keyof typeof STATUS_CONFIG].label}
                </span>
              )}
            </div>

            {/* Info fields */}
            <div className="border-t border-gray-100">
              {infoFields.filter(f => f.value).map(f => (
                <div key={f.label} className="flex justify-between items-start py-2.5 border-b border-gray-50">
                  <span className="text-xs text-gray-400 shrink-0">{f.label}</span>
                  <span className="text-sm text-gray-900 text-right max-w-[160px] break-words">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'profil' && <ProfilTab candidate={candidate} />}
          {tab === 'coaching' && <CoachingTab candidateId={id} sessions={sessions} upsertSession={upsertSession} />}
          {tab === 'cv' && <CvTab cvVersions={cvVersions} />}
          {tab === 'rdv' && <RdvTab candidateId={id} />}
          {tab === 'activite' && <EntityTimeline entityType="candidate" entityId={id} />}
          {tab === 'taches' && <TaskList entityType="candidate" entityId={id} />}
          {tab === 'docs' && <DocumentManager entityType="candidate" entityId={id} />}
        </div>
      </div>

      {editing && (
        <Modal title={`Modifier ${candidate.first_name} ${candidate.last_name}`} subtitle="Mettez à jour le profil du candidat." icon={User} onClose={() => setEditing(false)}>
          <CandidateForm initial={candidate} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </>
  )
}

function ProfilTab({ candidate }: { candidate: Database['public']['Tables']['candidates']['Row'] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {[
        { label: 'Email', value: candidate.email },
        { label: 'Téléphone', value: candidate.phone },
        { label: 'Adresse', value: candidate.address },
        { label: 'Situation actuelle', value: candidate.current_situation },
        { label: 'Objectif professionnel', value: candidate.objective, full: true },
      ].map(({ label, value, full }) => value ? (
        <div key={label} className={full ? 'sm:col-span-2' : ''}>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
          <dd className="text-sm text-gray-900 whitespace-pre-wrap">{value}</dd>
        </div>
      ) : null)}
    </dl>
  )
}

function CoachingTab({ candidateId, sessions, upsertSession }: {
  candidateId: string
  sessions: Database['public']['Tables']['coaching_sessions']['Row'][]
  upsertSession: (s: Database['public']['Tables']['coaching_sessions']['Insert']) => Promise<{ data: unknown; error: unknown }>
}) {
  const [editingSession, setEditingSession] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [score, setScore] = useState('')
  const [grid, setGrid] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  function getSession(num: 1 | 2 | 3) {
    return sessions.find(s => s.session_number === num) ?? null
  }

  function openEdit(num: 1 | 2 | 3) {
    const session = getSession(num)
    setEditingSession(num)
    setNotes(session?.notes ?? '')
    setScore(session?.score?.toString() ?? '')
    const savedGrid = session?.evaluation_grid as Record<string, number> | null
    if (num !== 1 && savedGrid) setGrid(savedGrid)
    else setGrid({})
  }

  function gridScore() {
    const vals = INTERVIEW_CRITERIA.map(c => grid[c.key] ?? 0)
    return Math.round(vals.reduce((a, b) => a + b, 0) / INTERVIEW_CRITERIA.length * 5)
  }

  async function handleSave(num: 1 | 2 | 3) {
    setSaving(true)
    const hasGrid = num !== 1 && Object.keys(grid).length > 0
    const finalScore = hasGrid ? gridScore() : (score ? parseInt(score) : null)
    await upsertSession({
      candidate_id: candidateId,
      session_number: num,
      type: SESSION_CONFIG[num].type,
      status: 'done',
      notes: notes || null,
      evaluation_grid: hasGrid ? grid as never : null,
      score: finalScore,
    })
    setEditingSession(null)
    setSaving(false)
  }

  // Progression
  const scored = sessions.filter(s => s.score != null).sort((a, b) => a.session_number - b.session_number)

  return (
    <div className="space-y-6">
      {/* Barre de progression */}
      {scored.length >= 2 && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">Progression du candidat</p>
          <div className="flex items-center gap-4">
            {scored.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                {i > 0 && <div className="h-0.5 w-8 bg-indigo-200 flex-shrink-0" />}
                <div className="text-center">
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm mx-auto',
                    i === scored.length - 1 ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-indigo-200 text-indigo-700')}>
                    {s.score}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">S{s.session_number}</p>
                </div>
              </div>
            ))}
            <div className="ml-4 pl-4 border-l border-indigo-200">
              <p className="text-2xl font-bold text-indigo-700">
                {(scored[scored.length - 1].score ?? 0) >= (scored[0].score ?? 0) ? '+' : ''}
                {(scored[scored.length - 1].score ?? 0) - (scored[0].score ?? 0)} pts
              </p>
              <p className="text-xs text-indigo-500">depuis le début</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {([1, 2, 3] as const).map(num => {
          const session = getSession(num)
          const config = SESSION_CONFIG[num]
          const isDone = session?.status === 'done'
          const isEditing = editingSession === num
          const savedGrid = session?.evaluation_grid as Record<string, number> | null
          const hasGrid = num !== 1

          return (
            <div key={num} className={cn('rounded-xl border p-5', isDone ? 'border-green-200 bg-green-50/40' : 'border-gray-200')}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm',
                    isDone ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400')}>
                    {isDone ? <CheckCircle className="w-5 h-5" /> : num}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{config.label}</p>
                    <p className="text-xs text-gray-500">{config.sublabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session?.score != null && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />{session.score}/100
                    </span>
                  )}
                  <button onClick={() => isEditing ? setEditingSession(null) : openEdit(num)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50">
                    {isDone ? 'Modifier' : 'Compléter'}
                  </button>
                </div>
              </div>

              {!isEditing && isDone && hasGrid && savedGrid && (
                <div className="mt-3 pl-11 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INTERVIEW_CRITERIA.map(c => (
                    <div key={c.key} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border text-xs">
                      <span className="text-gray-500 truncate mr-2">{c.label.split(' ')[0]}</span>
                      <span className="font-semibold text-gray-900 shrink-0">{savedGrid[c.key] ?? '—'}/20</span>
                    </div>
                  ))}
                </div>
              )}

              {session?.notes && !isEditing && (
                <p className="text-sm text-gray-600 mt-3 pl-11 whitespace-pre-wrap">{session.notes}</p>
              )}

              {isEditing && (
                <div className="mt-4 pl-11 space-y-4">
                  {hasGrid && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Grille d'évaluation entretien</p>
                      <div className="space-y-2">
                        {INTERVIEW_CRITERIA.map(c => (
                          <div key={c.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{c.label}</p>
                              <p className="text-xs text-gray-400">{c.desc}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {[4, 8, 12, 16, 20].map(v => (
                                <button key={v} onClick={() => setGrid(g => ({ ...g, [c.key]: v }))}
                                  className={cn('w-9 h-8 rounded text-xs font-medium border transition-colors',
                                    grid[c.key] === v
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300')}>
                                  {v}
                                </button>
                              ))}
                              <span className="text-xs text-gray-400 ml-1">/20</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {Object.keys(grid).length > 0 && (
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <span className="text-xs text-gray-500">Score calculé :</span>
                          <span className="text-sm font-bold text-indigo-700">{gridScore()}/100</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Notes de la session</p>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Points abordés, axes d'amélioration, observations..." rows={3}
                      className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>

                  {!hasGrid && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Score CV</p>
                      <input type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)}
                        placeholder="Score /100"
                        className="w-28 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button onClick={() => handleSave(num)} disabled={saving}
                      className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                      {saving ? 'Enregistrement...' : 'Valider la session'}
                    </button>
                    <button onClick={() => setEditingSession(null)} className="text-sm text-gray-500 hover:text-gray-700">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CvTab({ cvVersions }: { cvVersions: Database['public']['Tables']['cv_versions']['Row'][] }) {
  if (cvVersions.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Aucune version de CV enregistrée</p>
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900">Versions du CV</h3>
      {cvVersions.map(cv => (
        <div key={cv.id} className="flex items-center gap-4 p-4 rounded-lg border">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-blue-600">v{cv.version_number}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Version {cv.version_number} — {cv.stage ?? 'N/A'}</p>
            {cv.analyzed_at && <p className="text-xs text-gray-400">Analysé le {new Date(cv.analyzed_at).toLocaleDateString('fr-FR')}</p>}
          </div>
          {cv.score && (
            <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />{cv.score}/100
            </span>
          )}
          {cv.file_url && (
            <a href={cv.file_url} target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 hover:underline font-medium">
              Voir le CV
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

function RdvTab({ candidateId }: { candidateId: string }) {
  const { appointments, loading } = useAppointments(undefined, undefined)
  const candidateAppts = appointments
    .filter(a => a.entity_type === 'candidate' && a.entity_id === candidateId)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  const TYPE_LABELS: Record<string, string> = {
    coaching_1: 'Session 1 — Analyse CV',
    coaching_2: 'Session 2 — Simulation entretien',
    coaching_3: 'Session 3 — Bilan final',
    other: 'Autre',
  }

  const STATUS_COLORS: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    done: 'bg-gray-100 text-gray-500',
    cancelled: 'bg-red-100 text-red-600',
  }

  if (loading) return <p className="text-sm text-gray-400">Chargement...</p>
  if (candidateAppts.length === 0) {
    return (
      <div className="text-center py-10">
        <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Aucun rendez-vous enregistré</p>
        <p className="text-xs text-gray-300 mt-1">Créez un RDV depuis l'agenda en sélectionnant ce candidat</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900">Historique des rendez-vous</h3>
      {candidateAppts.map(appt => {
        const isPast = new Date(appt.starts_at) < new Date()
        return (
          <div key={appt.id} className={cn('flex items-start gap-4 p-4 rounded-xl border',
            isPast && appt.status !== 'cancelled' ? 'bg-gray-50' : 'bg-white')}>
            <div className="text-center shrink-0 w-12">
              <p className="text-lg font-bold text-gray-900">{new Date(appt.starts_at).getDate()}</p>
              <p className="text-xs text-gray-400">{new Date(appt.starts_at).toLocaleDateString('fr-FR', { month: 'short' })}</p>
              <p className="text-xs text-gray-300">{new Date(appt.starts_at).getFullYear()}</p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm text-gray-900">{TYPE_LABELS[appt.type] ?? appt.type}</p>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[appt.status])}>
                  {appt.status === 'confirmed' ? 'Confirmé' : appt.status === 'done' ? 'Effectué' : appt.status === 'cancelled' ? 'Annulé' : 'En attente'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(appt.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {appt.duration_minutes} min
                </span>
                {appt.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{appt.location}
                  </span>
                )}
              </div>
              {appt.notes && <p className="text-xs text-gray-500 mt-1.5 bg-gray-100 rounded px-2 py-1">{appt.notes}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
