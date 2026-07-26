import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Pencil, Building2, GraduationCap, ChevronDown, Check, User, BookOpen, FileText, ChevronRight, Mail, Unlock } from 'lucide-react'
import { sendAccessFn } from '@/server/send-access'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/shared/Modal'
import EmptyState from '@/components/shared/EmptyState'
import { useLearner } from '@/hooks/useLearners'
import { useAllTrainingCourses } from '@/hooks/useTraining'
import LearnerForm from '@/components/learners/LearnerForm'
import EntityTimeline from '@/components/shared/EntityTimeline'

import DocumentManager from '@/components/shared/DocumentManager'
import PageHeader from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

export const Route = createFileRoute('/_admin/learners/$id')({
  component: LearnerPage,
})

type Tab = 'profil' | 'formations' | 'docs'

const TABS: { id: Tab; label: string; color: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profil', label: 'Profil', color: 'bg-rose-400', icon: User },
  { id: 'formations', label: 'Formations', color: 'bg-violet-500', icon: BookOpen },
  { id: 'docs', label: 'Documents', color: 'bg-blue-500', icon: FileText },
]

function LearnerPage() {
  const { id } = Route.useParams()
  const { learner, loading, update } = useLearner(id)
  const { courses } = useAllTrainingCourses()
  const [tab, setTab] = useState<Tab>('profil')
  const [showTabMenu, setShowTabMenu] = useState(false)
  const [showCourseMenu, setShowCourseMenu] = useState(false)
  const [showSessionMenu, setShowSessionMenu] = useState(false)
  const [courseSessions, setCourseSessions] = useState<{ id: string; title: string | null; session_date: string | null }[]>([])
  const [editing, setEditing] = useState(false)
  const [sendingAccess, setSendingAccess] = useState(false)
  const [accessSent, setAccessSent] = useState(false)
  const [accessError, setAccessError] = useState(false)


  useEffect(() => {
    if (!learner?.training_course_id) { setCourseSessions([]); return }
    createClient().from('training_sessions')
      .select('id, title, session_date')
      .eq('course_id', learner.training_course_id)
      .order('session_date', { ascending: true })
      .then(({ data }) => setCourseSessions((data ?? []) as { id: string; title: string | null; session_date: string | null }[]))
  }, [learner?.training_course_id])

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>
  if (!learner) return <div className="p-8 text-gray-500">Apprenant introuvable.</div>

  const company = (learner as typeof learner & { companies?: { name: string } | null }).companies

  async function handleUpdate(values: Database['public']['Tables']['learners']['Insert']) {
    await update(values)
    setEditing(false)
  }

  async function handleCourseChange(courseId: string | null) {
    await update({ training_course_id: courseId, current_session_id: null })
    setShowCourseMenu(false)
  }

  async function handleSessionChange(sessionId: string | null) {
    await update({ current_session_id: sessionId })
    setShowSessionMenu(false)
  }

  async function handleSendAccess() {
    if (!learner?.email || sendingAccess) return
    setSendingAccess(true)
    try {
      const result = await sendAccessFn({ data: { email: learner.email, entityType: 'learner', entityId: id } })
      if (!result.ok) throw new Error(result.error ?? 'Erreur')
      setAccessSent(true)
    } catch (e) {
      console.error('sendAccess error:', e)
      setAccessError(true)
    } finally {
      setSendingAccess(false)
    }
  }

  const infoFields = [
    { label: 'Email', value: learner.email },
    { label: 'Téléphone', value: learner.phone },
    { label: 'Fonction', value: learner.function },
    { label: 'Entreprise', value: company?.name },
  ]

  return (
    <>
      <PageHeader
        pathItems={[
          { label: 'Formation', href: '/learners' },
          { label: 'Apprenants', href: '/learners' },
          { label: `${learner.first_name} ${learner.last_name}` },
        ]}
        secondBarRight={
          <>
            {company && (
              <Link to="/companies/$id" params={{ id: learner.company_id! }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
                <Building2 className="w-3.5 h-3.5" />{company.name}
              </Link>
            )}
            <button
              onClick={handleSendAccess}
              disabled={!learner.email || sendingAccess || accessSent}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                accessSent
                  ? 'border-green-200 bg-green-50 text-green-700 cursor-default'
                  : learner.email
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
            <div className="mb-6">
              <h2 className="font-bold text-gray-900 text-lg">{learner.first_name} {learner.last_name}</h2>
              {learner.function && <p className="text-sm text-gray-500 mt-0.5">{learner.function}</p>}
              {company && (
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Building2 className="w-3 h-3" />{company.name}
                </span>
              )}
            </div>

            {/* Info fields */}
            <div className="border-t border-gray-100">
              {infoFields.filter(f => f.value).map(f => (
                <div key={f.label} className="flex justify-between items-center py-2.5 border-b border-gray-50">
                  <span className="text-xs text-gray-400">{f.label}</span>
                  <span className="text-sm text-gray-900 text-right max-w-[160px] truncate">{f.value}</span>
                </div>
              ))}
            </div>

            {/* Formation selector */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Formation</p>
              <div className="relative">
                <button onClick={() => setShowCourseMenu(v => !v)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-gray-200 text-xs hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate text-gray-700">
                      {learner.training_course_id
                        ? (courses.find(c => c.id === learner.training_course_id)?.title ?? 'Formation inconnue')
                        : <span className="text-gray-400">Non assigné</span>}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
                </button>
                {showCourseMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCourseMenu(false)} />
                    <div className="absolute top-full mt-1.5 left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1 max-h-48 overflow-y-auto">
                      <button onClick={() => handleCourseChange(null)}
                        className={cn('flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50 text-left transition-colors',
                          !learner.training_course_id ? 'text-gray-900 font-medium' : 'text-gray-500')}>
                        Non assigné
                        {!learner.training_course_id && <Check className="w-3 h-3" />}
                      </button>
                      {courses.map(c => (
                        <button key={c.id} onClick={() => handleCourseChange(c.id)}
                          className={cn('flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50 text-left transition-colors',
                            learner.training_course_id === c.id ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                          <span className="truncate">{c.title}</span>
                          {learner.training_course_id === c.id && <Check className="w-3 h-3 shrink-0 ml-1" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {learner.training_course_id && (
                <Link to="/training/$id" params={{ id: learner.training_course_id }}
                  className="flex items-center gap-1 mt-1.5 text-[10px] text-blue-500 hover:text-blue-700 transition-colors">
                  Voir la formation <ChevronRight className="w-3 h-3" />
                </Link>
              )}

              {/* Session accessible (portail) */}
              {learner.training_course_id && courseSessions.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Unlock className="w-3 h-3" />Accès portail jusqu'à
                  </p>
                  <div className="relative">
                    <button onClick={() => setShowSessionMenu(v => !v)}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-gray-200 text-xs hover:bg-gray-50 transition-colors">
                      <span className="truncate text-gray-700">
                        {learner.current_session_id
                          ? (() => { const s = courseSessions.find(s => s.id === learner.current_session_id); return s?.title ?? new Date(s?.session_date ?? '').toLocaleDateString('fr-FR') })()
                          : <span className="text-gray-400">Aucun accès</span>}
                      </span>
                      <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
                    </button>
                    {showSessionMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowSessionMenu(false)} />
                        <div className="absolute top-full mt-1.5 left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1 max-h-48 overflow-y-auto">
                          <button onClick={() => handleSessionChange(null)}
                            className={cn('flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50 text-left transition-colors',
                              !learner.current_session_id ? 'text-gray-900 font-medium' : 'text-gray-500')}>
                            Aucun accès
                            {!learner.current_session_id && <Check className="w-3 h-3" />}
                          </button>
                          {courseSessions.map((s, i) => (
                            <button key={s.id} onClick={() => handleSessionChange(s.id)}
                              className={cn('flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50 text-left transition-colors',
                                learner.current_session_id === s.id ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                              <span className="truncate">{s.title ?? `Session ${i + 1}`}{s.session_date ? ` · ${new Date(s.session_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}</span>
                              {learner.current_session_id === s.id && <Check className="w-3 h-3 shrink-0 ml-1" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">L'apprenant verra cette session et toutes les précédentes.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {tab === 'profil' && (
            <div className="overflow-y-auto h-full flex flex-col">
              <div className="p-6"><ProfilTab learner={learner} companyName={company?.name} /></div>
              <div className="flex-1 border-t border-gray-100">
                <EntityTimeline entityType="learner" entityId={id} />
              </div>
            </div>
          )}
          {tab === 'formations' && <div className="p-6 overflow-y-auto h-full"><FormationsTab learnerId={id} /></div>}

          {tab === 'docs' && <DocumentManager entityType="learner" entityId={id} />}
        </div>
      </div>

      {editing && (
        <Modal title={`Modifier ${learner.first_name} ${learner.last_name}`} subtitle="Mettez à jour le profil de l'apprenant." icon={GraduationCap} onClose={() => setEditing(false)}>
          <LearnerForm initial={learner} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </>
  )
}

function ProfilTab({ learner, companyName }: {
  learner: Database['public']['Tables']['learners']['Row']
  companyName?: string
}) {
  const fields = [
    { label: 'Email', value: learner.email },
    { label: 'Téléphone', value: learner.phone },
    { label: 'Fonction', value: learner.function },
    { label: 'Entreprise', value: companyName },
  ].filter(f => f.value)

  if (fields.length === 0) {
    return (
      <EmptyState
        variant="table"
        title="Aucune information"
        description="Complétez le profil de cet apprenant via le bouton Modifier."
        ghostOpacity={0.7}
      />
    )
  }

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {fields.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
          <dd className="text-sm text-gray-900">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function FormationsTab({ learnerId: _learnerId }: { learnerId: string }) {
  return (
    <EmptyState
      variant="table"
      title="Aucune formation"
      description="Assignez une formation à cet apprenant depuis le panneau latéral."
      ghostOpacity={0.7}
    />
  )
}
