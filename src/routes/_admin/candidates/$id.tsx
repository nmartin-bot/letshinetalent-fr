import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { Pencil, CheckCircle, Star, TrendingUp, Calendar, MapPin, Clock, ChevronDown, Check, User, Target, FileText, Zap, ListTodo, FolderOpen, Upload, ArrowUp, ArrowDown, Minus, Eye, Download, Trash2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Modal from '@/components/shared/Modal'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
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
  const { candidate, sessions, cvVersions, loading, update, upsertSession, uploadCvVersion, removeCvVersion } = useCandidate(id)
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
            <div className="mb-5">
              <h2 className="font-bold text-gray-900 text-lg">{candidate.first_name} {candidate.last_name}</h2>
              {candidate.current_situation && <p className="text-sm text-gray-500 mt-0.5">{candidate.current_situation}</p>}
              {STATUS_CONFIG[candidate.status as keyof typeof STATUS_CONFIG] && (
                <span className={cn('mt-2 inline-flex text-xs font-medium px-2 py-0.5 rounded-full border', STATUS_CONFIG[candidate.status as keyof typeof STATUS_CONFIG].class)}>
                  {STATUS_CONFIG[candidate.status as keyof typeof STATUS_CONFIG].label}
                </span>
              )}
            </div>

            {/* Programme */}
            <div className="bg-violet-50 rounded-xl p-3.5 mb-5 border border-violet-100">
              <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide mb-2.5">Programme coaching</p>
              <div className="flex items-center gap-1.5 mb-2">
                {([1, 2, 3] as const).map(n => {
                  const done = sessions.find(s => s.session_number === n)?.status === 'done'
                  return (
                    <div key={n} className="flex-1">
                      <div className={cn('h-1.5 rounded-full', done ? 'bg-violet-500' : 'bg-violet-200')} />
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-violet-600">
                {sessions.filter(s => s.status === 'done').length}/3 sessions complétées
              </p>
              {candidate.program_start_date && (
                <p className="text-[10px] text-violet-400 mt-1">
                  Démarré le {new Date(candidate.program_start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
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
        <div className={cn('flex-1 overflow-y-auto', tab === 'cv' || tab === 'docs' ? '' : 'p-6')}>
          {tab === 'profil' && <ProfilTab candidate={candidate} />}
          {tab === 'coaching' && <CoachingTab candidateId={id} sessions={sessions} cvVersions={cvVersions} upsertSession={upsertSession} uploadCvVersion={uploadCvVersion} />}
          {tab === 'cv' && <CvTab cvVersions={cvVersions} uploadCvVersion={uploadCvVersion} removeCvVersion={removeCvVersion} />}
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

function CoachingTab({ candidateId, sessions, cvVersions, upsertSession, uploadCvVersion }: {
  candidateId: string
  sessions: Database['public']['Tables']['coaching_sessions']['Row'][]
  cvVersions: Database['public']['Tables']['cv_versions']['Row'][]
  upsertSession: (s: Database['public']['Tables']['coaching_sessions']['Insert']) => Promise<{ data: unknown; error: unknown }>
  uploadCvVersion: (file: File, score?: number | null) => Promise<{ data: unknown; error: unknown }>
}) {
  const [editingSession, setEditingSession] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [score, setScore] = useState('')
  const [grid, setGrid] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [uploadingCv, setUploadingCv] = useState(false)
  const cvFileRef = useRef<HTMLInputElement>(null)

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

  async function handleCvUpload(file: File) {
    setUploadingCv(true)
    await uploadCvVersion(file, null)
    setUploadingCv(false)
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
  const session2Grid = getSession(2)?.evaluation_grid as Record<string, number> | null
  const session3Grid = getSession(3)?.evaluation_grid as Record<string, number> | null

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
              {/* Header */}
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

              {/* Session 1 — CV versions résumé */}
              {num === 1 && !isEditing && cvVersions.length > 0 && (
                <div className="mt-3 pl-11 space-y-1.5">
                  {cvVersions.slice(0, 3).map(cv => (
                    <div key={cv.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border text-xs">
                      <span className="font-semibold text-blue-600 shrink-0">v{cv.version_number}</span>
                      <span className="text-gray-400 shrink-0">{cv.stage ?? ''}</span>
                      <span className="flex-1" />
                      {cv.score != null && <span className="font-semibold text-amber-600">{cv.score}/100</span>}
                      <a href={cv.file_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Voir</a>
                    </div>
                  ))}
                </div>
              )}

              {/* Sessions 2/3 — grille résumé */}
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

              {/* Session 3 — comparaison avec session 2 */}
              {num === 3 && !isEditing && isDone && session2Grid && session3Grid && (
                <div className="mt-4 pl-11">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Progression S2 → S3</p>
                  <div className="space-y-1.5">
                    {INTERVIEW_CRITERIA.map(c => {
                      const s2 = session2Grid[c.key] ?? 0
                      const s3 = session3Grid[c.key] ?? 0
                      const delta = s3 - s2
                      return (
                        <div key={c.key} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border text-xs">
                          <span className="text-gray-600 flex-1 truncate">{c.label}</span>
                          <span className="text-gray-400 shrink-0">{s2}/20</span>
                          <span className="text-gray-300">→</span>
                          <span className="font-semibold text-gray-900 shrink-0">{s3}/20</span>
                          <span className={cn('flex items-center gap-0.5 font-semibold shrink-0 w-12 justify-end',
                            delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-gray-400')}>
                            {delta > 0 ? <ArrowUp className="w-3 h-3" /> : delta < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {session?.notes && !isEditing && (
                <p className="text-sm text-gray-600 mt-3 pl-11 whitespace-pre-wrap">{session.notes}</p>
              )}

              {/* Formulaire d'édition */}
              {isEditing && (
                <div className="mt-4 pl-11 space-y-4">
                  {/* Session 1 : upload CV */}
                  {num === 1 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">CV du candidat</p>
                      <div className="space-y-2">
                        {cvVersions.map(cv => (
                          <div key={cv.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border text-xs">
                            <span className="font-semibold text-blue-600">v{cv.version_number}</span>
                            <span className="text-gray-500 flex-1 truncate">{cv.stage}</span>
                            {cv.score != null && <span className="text-amber-600 font-semibold">{cv.score}/100</span>}
                            <a href={cv.file_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Voir</a>
                          </div>
                        ))}
                        <button onClick={() => cvFileRef.current?.click()} disabled={uploadingCv}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingCv ? 'Envoi en cours...' : `Importer ${cvVersions.length > 0 ? 'une nouvelle version' : 'le CV initial'}`}
                        </button>
                        <input ref={cvFileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f) }} />
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Score CV /100</p>
                        <input type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)}
                          placeholder="Ex : 72"
                          className="w-28 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  )}

                  {/* Sessions 2/3 : grille entretien */}
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

const STAGE_LABELS: Record<string, string> = { initial: 'CV initial', revised: 'Version retravaillée', final: 'Version finale' }
const STAGE_COLORS: Record<string, string> = { initial: 'bg-gray-100 text-gray-600', revised: 'bg-blue-100 text-blue-700', final: 'bg-green-100 text-green-700' }

function CvTab({ cvVersions, uploadCvVersion, removeCvVersion }: {
  cvVersions: Database['public']['Tables']['cv_versions']['Row'][]
  uploadCvVersion: (file: File, score?: number | null) => Promise<{ data: unknown; error: unknown }>
  removeCvVersion: (id: string) => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<Database['public']['Tables']['cv_versions']['Row'] | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  async function handleUpload(file: File) {
    setUploading(true)
    await uploadCvVersion(file, null)
    setUploading(false)
  }

  return (
    <div className="flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">
            {cvVersions.length > 0 ? `${cvVersions.length} version${cvVersions.length > 1 ? 's' : ''}` : 'CV'}
          </span>
          {selected.size > 0 && (
            <>
              <div className="w-px h-4 bg-gray-200" />
              <button onClick={() => setConfirmBulkDelete(true)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors">
                <Trash2 className="w-3.5 h-3.5" />Supprimer ({selected.size})
              </button>
            </>
          )}
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
          <Upload className="w-3.5 h-3.5" />{uploading ? 'Envoi...' : 'Importer'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
      </div>

      {cvVersions.length === 0 ? (
        <EmptyState
          variant="list"
          title="Aucun CV importé"
          description="Importez le CV initial du candidat pour démarrer le suivi des versions."
          action={{ label: 'Importer un CV', onClick: () => fileRef.current?.click() }}
        />
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pl-6 pr-3 py-2.5 w-10">
                <input type="checkbox"
                  checked={selected.size === cvVersions.length && cvVersions.length > 0}
                  onChange={e => setSelected(e.target.checked ? new Set(cvVersions.map(c => c.id)) : new Set())}
                  className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900 cursor-pointer" />
              </th>
              <th className="text-left pr-4 py-2.5 text-xs font-medium text-gray-400">Version</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Stade</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Score</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Date</th>
              <th className="pr-6 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {cvVersions.map(cv => {
              const isSelected = selected.has(cv.id)
              return (
                <tr key={cv.id} className={cn('border-b border-gray-50 transition-colors group', isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/60')}>
                  <td className="pl-6 pr-3 py-3 w-10">
                    <input type="checkbox" checked={isSelected}
                      onChange={e => {
                        const next = new Set(selected)
                        e.target.checked ? next.add(cv.id) : next.delete(cv.id)
                        setSelected(next)
                      }}
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                  </td>
                  <td className="pr-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 border border-blue-100">
                        <span className="text-xs font-bold text-blue-600">v{cv.version_number}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Version {cv.version_number}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {cv.stage ? (
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STAGE_COLORS[cv.stage] ?? 'bg-gray-100 text-gray-600')}>
                        {STAGE_LABELS[cv.stage] ?? cv.stage}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {cv.score != null ? (
                      <span className="flex items-center gap-1 text-sm font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{cv.score}/100
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {cv.analyzed_at
                      ? new Date(cv.analyzed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="pr-6 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={cv.file_url} target="_blank" rel="noreferrer"
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                      <a href={cv.file_url} download={`cv_v${cv.version_number}.pdf`}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        onClick={() => setConfirmDelete(cv)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Supprimer la version ${confirmDelete.version_number} ?`}
          description="Ce fichier CV sera définitivement supprimé."
          confirmLabel="Supprimer"
          icon={Trash2}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => { await removeCvVersion(confirmDelete.id); setConfirmDelete(null) }}
        />
      )}

      {confirmBulkDelete && (
        <ConfirmDialog
          title={`Supprimer ${selected.size} version${selected.size > 1 ? 's' : ''} ?`}
          description="Ces fichiers CV seront définitivement supprimés."
          confirmLabel="Supprimer"
          icon={Trash2}
          onCancel={() => setConfirmBulkDelete(false)}
          onConfirm={async () => {
            await Promise.all([...selected].map(id => removeCvVersion(id)))
            setSelected(new Set())
            setConfirmBulkDelete(false)
          }}
        />
      )}
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
