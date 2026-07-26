import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { Pencil, CheckCircle, Star, TrendingUp, ChevronDown, Check, User, Target, FileText, FolderOpen, Upload, ArrowUp, ArrowDown, Minus, Download, Trash2, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sendAccessFn } from '@/server/send-access'
import PageHeader from '@/components/layout/PageHeader'
import Modal from '@/components/shared/Modal'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useCandidate } from '@/hooks/useCandidates'
import CandidateForm from '@/components/candidates/CandidateForm'
import EntityTimeline from '@/components/shared/EntityTimeline'

import DocumentManager from '@/components/shared/DocumentManager'
import { DocViewer } from '@/components/shared/DocPreview'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

export const Route = createFileRoute('/_admin/candidates/$id')({
  component: CandidatePage,
})

type Tab = 'profil' | 'coaching' | 'docs'

const TABS: { id: Tab; label: string; color: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profil', label: 'Profil', color: 'bg-rose-400', icon: User },
  { id: 'coaching', label: 'Coaching', color: 'bg-violet-500', icon: Target },
  { id: 'docs', label: 'Documents', color: 'bg-cyan-400', icon: FolderOpen },
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
  const [sendingAccess, setSendingAccess] = useState(false)
  const [accessSent, setAccessSent] = useState(false)
  const [accessError, setAccessError] = useState(false)

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>
  if (!candidate) return <div className="p-8 text-gray-500">Candidat introuvable.</div>

  async function handleUpdate(values: Database['public']['Tables']['candidates']['Insert']) {
    await update(values)
    setEditing(false)
  }

  async function handleSendAccess() {
    if (!candidate?.email || sendingAccess) return
    setSendingAccess(true)
    try {
      const result = await sendAccessFn({ data: { email: candidate.email, entityType: 'candidate', entityId: id } })
      if (!result.ok) throw new Error(result.error ?? 'Erreur')
      setAccessSent(true)
    } catch (e) {
      console.error('sendAccess error:', e)
      setAccessError(true)
    } finally {
      setSendingAccess(false)
    }
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
            <button
              onClick={handleSendAccess}
              disabled={!candidate.email || sendingAccess || accessSent}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                accessSent
                  ? 'border-green-200 bg-green-50 text-green-700 cursor-default'
                  : candidate.email
                  ? 'border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
              )}>
              <Mail className="w-3.5 h-3.5" />
              {accessSent ? 'Accès envoyé !' : accessError ? 'Erreur !' : sendingAccess ? 'Envoi...' : "Envoyer l'accès"}
            </button>
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
        <div className="flex-1 overflow-hidden flex flex-col">
          {tab === 'profil' && (
            <div className="overflow-y-auto h-full flex flex-col">
              <div className="p-6"><ProfilTab candidate={candidate} /></div>
              <div className="flex-1 border-t border-gray-100">
                <EntityTimeline entityType="candidate" entityId={id} />
              </div>
            </div>
          )}
          {tab === 'coaching' && <CoachingTab candidateId={id} sessions={sessions} cvVersions={cvVersions} upsertSession={upsertSession} uploadCvVersion={uploadCvVersion} removeCvVersion={removeCvVersion} />}
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
  const fields = [
    { label: 'Email', value: candidate.email, full: false },
    { label: 'Téléphone', value: candidate.phone, full: false },
    { label: 'Adresse', value: candidate.address, full: false },
    { label: 'Situation actuelle', value: candidate.current_situation, full: false },
    { label: 'Objectif professionnel', value: candidate.objective, full: true },
  ].filter(f => f.value)

  if (fields.length === 0) {
    return (
      <EmptyState
        variant="table"
        title="Aucune information"
        description="Complétez le profil de ce candidat via le bouton Modifier."
        ghostOpacity={0.7}
      />
    )
  }

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {fields.map(({ label, value, full }) => (
        <div key={label} className={full ? 'sm:col-span-2' : ''}>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
          <dd className="text-sm text-gray-900 whitespace-pre-wrap">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

// Grille d'évaluation : score 1-5 par critère → max 25 pts → converti en /100
function starScore(grid: Record<string, number>) {
  const vals = INTERVIEW_CRITERIA.map(c => grid[c.key] ?? 0)
  const total = vals.reduce((a, b) => a + b, 0)
  return Math.round((total / (INTERVIEW_CRITERIA.length * 5)) * 100)
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(v => (
        <button key={v} type="button"
          onClick={() => onChange?.(v)}
          className={cn('w-6 h-6 transition-colors', onChange ? 'cursor-pointer' : 'cursor-default',
            v <= value ? 'text-amber-400' : 'text-gray-200')}>
          <Star className={cn('w-5 h-5', v <= value ? 'fill-amber-400' : '')} />
        </button>
      ))}
    </div>
  )
}

function CoachingTab({ candidateId, sessions, cvVersions, upsertSession, uploadCvVersion, removeCvVersion }: {
  candidateId: string
  sessions: Database['public']['Tables']['coaching_sessions']['Row'][]
  cvVersions: Database['public']['Tables']['cv_versions']['Row'][]
  upsertSession: (s: Database['public']['Tables']['coaching_sessions']['Insert']) => Promise<{ data: unknown; error: unknown }>
  uploadCvVersion: (file: File, score?: number | null) => Promise<{ data: unknown; error: unknown }>
  removeCvVersion: (id: string) => Promise<void>
}) {
  const [openSession, setOpenSession] = useState<number | null>(
    // Ouvrir automatiquement la prochaine session non complétée
    [1, 2, 3].find(n => !sessions.find(s => s.session_number === n && s.status === 'done')) ?? null
  )
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [grids, setGrids] = useState<Record<number, Record<string, number>>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [uploadingCv, setUploadingCv] = useState(false)
  const [confirmDeleteCv, setConfirmDeleteCv] = useState<Database['public']['Tables']['cv_versions']['Row'] | null>(null)
  const [previewCv, setPreviewCv] = useState<Database['public']['Tables']['cv_versions']['Row'] | null>(null)
  const cvFileRef = useRef<HTMLInputElement>(null)

  function getSession(num: number) {
    return sessions.find(s => s.session_number === num) ?? null
  }

  function openEdit(num: number) {
    const session = getSession(num)
    if (openSession === num) { setOpenSession(null); return }
    setOpenSession(num)
    setNotes(prev => ({ ...prev, [num]: prev[num] ?? (session?.notes ?? '') }))
    const savedGrid = session?.evaluation_grid as Record<string, number> | null
    setGrids(prev => ({ ...prev, [num]: prev[num] ?? (savedGrid ?? {}) }))
  }

  async function handleSave(num: 1 | 2 | 3) {
    setSaving(num)
    const existingSession = getSession(num)
    const currentNotes = notes[num] ?? ''
    const currentGrid = grids[num] ?? {}
    const hasGrid = num !== 1 && Object.keys(currentGrid).length > 0
    const finalScore = hasGrid ? starScore(currentGrid) : null
    await upsertSession({
      ...(existingSession?.id ? { id: existingSession.id } : {}),
      candidate_id: candidateId,
      session_number: num,
      type: SESSION_CONFIG[num].type,
      status: 'done',
      notes: currentNotes || null,
      evaluation_grid: hasGrid ? currentGrid as never : null,
      score: finalScore,
    })
    setSaving(null)
  }

  async function handleCvUpload(file: File) {
    setUploadingCv(true)
    await uploadCvVersion(file, null)
    setUploadingCv(false)
    if (cvFileRef.current) cvFileRef.current.value = ''
  }

  const session2Grid = getSession(2)?.evaluation_grid as Record<string, number> | null
  const session3Grid = getSession(3)?.evaluation_grid as Record<string, number> | null
  const scored = sessions.filter(s => s.score != null).sort((a, b) => a.session_number - b.session_number)

  const doneCount = sessions.filter(s => s.status === 'done').length

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sessions panel */}
      <div className="flex-1 overflow-y-auto">
        {/* Barre de progression globale */}
        <div className="px-6 h-12 shrink-0 border-b border-gray-100 flex items-center gap-4">
          <div className="flex-1 flex items-center gap-2">
            {([1, 2, 3] as const).map(n => {
              const s = getSession(n)
              const done = s?.status === 'done'
              return (
                <div key={n} className="flex items-center gap-2 flex-1">
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                    done ? 'bg-violet-500 text-white' : openSession === n ? 'bg-violet-100 text-violet-600 border-2 border-violet-300' : 'bg-gray-100 text-gray-400')}>
                    {done ? <CheckCircle className="w-3.5 h-3.5" /> : n}
                  </div>
                  <div className={cn('h-1 flex-1 rounded-full', done ? 'bg-violet-400' : 'bg-gray-100', n === 3 && 'hidden')} />
                </div>
              )
            })}
          </div>
          <span className="text-xs text-gray-400 shrink-0">{doneCount}/3 sessions</span>
          {scored.length >= 2 && (
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',
              (scored[scored.length - 1].score ?? 0) >= (scored[0].score ?? 0)
                ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
              {(scored[scored.length - 1].score ?? 0) >= (scored[0].score ?? 0) ? '+' : ''}
              {(scored[scored.length - 1].score ?? 0) - (scored[0].score ?? 0)} pts
            </span>
          )}
        </div>

        <div className="divide-y divide-gray-100">
          {([1, 2, 3] as const).map(num => {
            const session = getSession(num)
            const config = SESSION_CONFIG[num]
            const isDone = session?.status === 'done'
            const isOpen = openSession === num
            const currentNotes = notes[num] ?? session?.notes ?? ''
            const currentGrid = grids[num] ?? (session?.evaluation_grid as Record<string, number> | null) ?? {}
            const hasGrid = num !== 1

            return (
              <div key={num}>
                {/* Header cliquable */}
                <button onClick={() => openEdit(num)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors text-left">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm',
                    isDone ? 'bg-violet-100 text-violet-600' : isOpen ? 'bg-violet-50 text-violet-400 border border-violet-200' : 'bg-gray-100 text-gray-400')}>
                    {isDone ? <CheckCircle className="w-4 h-4" /> : num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', isDone ? 'text-gray-900' : 'text-gray-700')}>{config.label}</p>
                    <p className="text-xs text-gray-400">{config.sublabel}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {(() => {
                      const displayScore = isOpen && hasGrid && Object.keys(currentGrid).length > 0
                        ? starScore(currentGrid)
                        : session?.score
                      return displayScore != null ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{displayScore}/100
                        </span>
                      ) : null
                    })()}
                    {isDone && !isOpen && session?.notes && (
                      <span className="text-xs text-gray-400 max-w-[180px] truncate hidden sm:block">{session.notes}</span>
                    )}
                    <ChevronDown className={cn('w-4 h-4 text-gray-300 transition-transform', isOpen && 'rotate-180')} />
                  </div>
                </button>

                {/* Contenu déplié */}
                {isOpen && (
                  <div className="px-6 pb-6 space-y-5 bg-gray-50/40">

                        {/* Comparatif S2 → S3 pour session 3 */}
                    {num === 3 && session2Grid && session3Grid && (
                      <div className="pt-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Progression S2 → S3</p>
                        <div className="grid gap-1.5">
                          {INTERVIEW_CRITERIA.map(c => {
                            const s2 = session2Grid[c.key] ?? 0
                            const s3 = currentGrid[c.key] ?? session3Grid[c.key] ?? 0
                            const delta = s3 - s2
                            return (
                              <div key={c.key} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-gray-100 text-xs">
                                <span className="text-gray-600 flex-1 truncate">{c.label}</span>
                                <StarRating value={s2} />
                                <span className="text-gray-300 text-base">→</span>
                                <StarRating value={s3}
                                  onChange={v => setGrids(prev => ({ ...prev, [num]: { ...(prev[num] ?? {}), [c.key]: v } }))} />
                                <span className={cn('flex items-center gap-0.5 font-semibold w-10 justify-end shrink-0',
                                  delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-gray-300')}>
                                  {delta > 0 ? <ArrowUp className="w-3 h-3" /> : delta < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                  {delta > 0 ? `+${delta}` : delta !== 0 ? String(delta) : ''}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Grille d'évaluation (session 2 uniquement) */}
                    {num === 2 && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Grille d'évaluation</p>
                          {Object.keys(currentGrid).length > 0 && (
                            <span className="text-xs font-bold text-violet-600">{starScore(currentGrid)}/100</span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {INTERVIEW_CRITERIA.map(c => (
                            <div key={c.key} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-800">{c.label}</p>
                                <p className="text-[10px] text-gray-400 leading-tight">{c.desc}</p>
                              </div>
                              <StarRating
                                value={currentGrid[c.key] ?? 0}
                                onChange={v => setGrids(prev => ({ ...prev, [num]: { ...(prev[num] ?? {}), [c.key]: v } }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Notes</p>
                      <textarea
                        value={currentNotes}
                        onChange={e => setNotes(prev => ({ ...prev, [num]: e.target.value }))}
                        placeholder="Points abordés, axes d'amélioration, observations..."
                        rows={4}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button onClick={() => handleSave(num)} disabled={saving === num}
                        className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                        {saving === num ? 'Enregistrement...' : isDone ? 'Mettre à jour' : 'Marquer comme complétée'}
                      </button>
                      <button onClick={() => {
                        setGrids(prev => { const n = { ...prev }; delete n[num]; return n })
                        setNotes(prev => { const n = { ...prev }; delete n[num]; return n })
                        setOpenSession(null)
                      }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Panneau CV */}
      <div className="w-72 shrink-0 border-l border-gray-100 bg-white flex flex-col">
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <span className="text-xs font-medium text-gray-500">
            CV {cvVersions.length > 0 ? `· ${cvVersions.length} version${cvVersions.length > 1 ? 's' : ''}` : ''}
          </span>
          <button onClick={() => cvFileRef.current?.click()} disabled={uploadingCv}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors disabled:opacity-40">
            <Upload className="w-3.5 h-3.5" />{uploadingCv ? '...' : 'Importer'}
          </button>
          <input ref={cvFileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCvUpload(f) }} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {cvVersions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-2">
              <FileText className="w-8 h-8 text-gray-200" />
              <p className="text-xs text-gray-400">Aucun CV importé</p>
              <button onClick={() => cvFileRef.current?.click()}
                className="text-xs text-violet-500 hover:text-violet-700 font-medium transition-colors mt-1">
                + Importer le CV initial
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {cvVersions.map(cv => (
                <div key={cv.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-gray-50/60 transition-colors cursor-pointer"
                  onClick={() => setPreviewCv(cv)}>
                  <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center shrink-0 border border-violet-100">
                    <span className="text-[10px] font-bold text-violet-600">v{cv.version_number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900">Version {cv.version_number}</p>
                    {cv.analyzed_at && (
                      <p className="text-[10px] text-gray-400">
                        {new Date(cv.analyzed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                  {cv.score != null && (
                    <span className="text-xs font-semibold text-amber-600 shrink-0">{cv.score}/100</span>
                  )}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={cv.file_url} download={`cv_v${cv.version_number}.pdf`}
                      onClick={e => e.stopPropagation()}
                      className="p-1 text-gray-300 hover:text-gray-600 rounded transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={e => { e.stopPropagation(); setConfirmDeleteCv(cv) }}
                      className="p-1 text-gray-200 hover:text-red-500 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {previewCv && (
        <DocViewer
          doc={{ id: previewCv.id, name: `CV — Version ${previewCv.version_number}`, file_url: previewCv.file_url, mime_type: 'application/pdf', file_size: null }}
          onClose={() => setPreviewCv(null)}
        />
      )}

      {confirmDeleteCv && (
        <ConfirmDialog
          title={`Supprimer la version ${confirmDeleteCv.version_number} ?`}
          description="Ce fichier CV sera définitivement supprimé."
          confirmLabel="Supprimer" icon={Trash2}
          onCancel={() => setConfirmDeleteCv(null)}
          onConfirm={async () => { await removeCvVersion(confirmDeleteCv.id); setConfirmDeleteCv(null) }}
        />
      )}
    </div>
  )
}

