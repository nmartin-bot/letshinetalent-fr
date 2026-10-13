import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { BookOpen, Lock, ArrowRight, ChevronLeft, FileText, File, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DocViewer, DocPreview, formatSize, type PreviewDoc } from '@/components/shared/DocPreview'
import { flattenCourse, resolveAccess } from '@/hooks/useTraining'

type Session = {
  id: string
  title: string | null
  session_date: string | null
  duration_hours: number | null
  location: string | null
  notes: string | null
  accessible: boolean
}

function mimeColor(mime: string | null) {
  if (!mime) return 'bg-gray-100 text-gray-400'
  if (mime === 'application/pdf') return 'bg-red-50 text-red-400'
  if (mime.startsWith('image/')) return 'bg-violet-50 text-violet-400'
  if (mime.includes('word') || mime.includes('document')) return 'bg-blue-50 text-blue-400'
  if (mime.includes('sheet') || mime.includes('excel')) return 'bg-emerald-50 text-emerald-400'
  return 'bg-gray-100 text-gray-400'
}

function FileIcon({ mime }: { mime: string | null }) {
  if (!mime) return <File className="w-5 h-5" />
  if (mime.startsWith('image/')) return <Image className="w-5 h-5" />
  return <FileText className="w-5 h-5" />
}

export const Route = createFileRoute('/client/apprenant/formations')({
  component: () => <ClientFormations subjectType="learner" />,
})

function fileIcon(mime: string | null) {
  if (!mime) return <File className="w-5 h-5 text-gray-400" />
  if (mime.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-400" />
  if (mime === 'application/pdf') return <FileText className="w-5 h-5 text-red-400" />
  return <FileText className="w-5 h-5 text-violet-400" />
}

function SessionDetail({ session, index, groupId, onBack }: { session: Session; index: number; groupId: string | null; onBack: () => void }) {
  const [docs, setDocs] = useState<PreviewDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [previewing, setPreviewing] = useState<PreviewDoc | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      // Les documents masqués pour cette promo sont écartés de la requête, et
      // non filtrés après coup : leur URL ne doit pas atteindre le navigateur.
      let hidden: string[] = []
      if (groupId) {
        const { data } = await supabase.from('document_hidden_groups')
          .select('document_id').eq('group_id', groupId) as { data: { document_id: string }[] | null }
        hidden = (data ?? []).map(r => r.document_id)
      }

      let q = supabase.from('documents').select('id, name, file_url, mime_type, file_size')
        .eq('entity_type', 'session').eq('entity_id', session.id)
      if (hidden.length) q = q.not('id', 'in', `(${hidden.join(',')})`)

      const { data } = await q
      setDocs((data ?? []).filter(d => d.file_url) as PreviewDoc[])
      setLoading(false)
    }
    load()
  }, [session.id, groupId])

  return (
    <div className="flex-1 overflow-auto">
      {previewing && <DocViewer doc={previewing} onClose={() => setPreviewing(null)} />}

      <div className="p-8">
        {/* Bandeau carte */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-400 rounded-2xl border border-violet-500 px-8 py-6 mb-8">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" />Retour aux modules
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg">{index + 1}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{session.title ?? `Module ${index + 1}`}</h1>
              {session.session_date && (
                <p className="text-white/70 text-sm mt-0.5">
                  {new Date(session.session_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {session.duration_hours ? ` · ${session.duration_hours}h` : ''}
                </p>
              )}
              {session.location && <p className="text-white/70 text-sm">{session.location}</p>}
            </div>
          </div>
        </div>

        {session.notes && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Notes du formateur</p>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{session.notes}</p>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Documents du module</p>
          {loading ? (
            <div className="text-sm text-gray-400 py-4">Chargement…</div>
          ) : docs.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucun document pour ce module</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {docs.map(doc => (
                <button key={doc.id} onClick={() => setPreviewing(doc)}
                  className="group flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-violet-300 hover:shadow-md transition-all text-left">
                  {/* Thumbnail */}
                  <div className={cn('h-28 w-full flex items-center justify-center', mimeColor(doc.mime_type))}>
                    <DocPreview doc={doc} />
                  </div>
                  {/* Footer */}
                  <div className="px-3 py-2.5 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-900 truncate">{doc.name}</p>
                    {doc.file_size && <p className="text-[10px] text-gray-400 mt-0.5">{formatSize(doc.file_size)}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type CourseEntry = { id: string; title: string; currentSessionId: string | null }

export function ClientFormations({ subjectType }: { subjectType: 'learner' | 'candidate' }) {
  const [courses, setCourses] = useState<CourseEntry[]>([])
  const [courseId, setCourseId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<{ session: Session; index: number } | null>(null)
  const [groupId, setGroupId] = useState<string | null>(null)

  // 1. Quelles formations cette personne a-t-elle le droit de voir ?
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase.from('profiles').select('entity_id').eq('id', user.id).single() as { data: { entity_id: string } | null }
      const subjectId = profile?.entity_id ?? ''
      if (!subjectId) { setLoading(false); return }

      let group: string | null = null
      if (subjectType === 'learner') {
        const { data } = await supabase.from('learners').select('group_id').eq('id', subjectId).single() as { data: { group_id: string | null } | null }
        group = data?.group_id ?? null
        setGroupId(group)
      }

      const { data: access } = await supabase.from('course_access')
        .select('course_id, subject_type, subject_id, current_session_id') as {
          data: { course_id: string; subject_type: 'candidate' | 'learner' | 'group' | 'all_candidates' | 'all_learners'; subject_id: string | null; current_session_id: string | null }[] | null
        }

      const granted = resolveAccess(access ?? [], { type: subjectType, id: subjectId, groupId: group })
      if (granted.length === 0) { setCourses([]); setLoading(false); return }

      const { data: titles } = await supabase.from('training_courses')
        .select('id, title').in('id', granted.map(g => g.courseId)).order('title') as { data: { id: string; title: string }[] | null }

      const list = (titles ?? []).map(t => ({
        id: t.id,
        title: t.title,
        currentSessionId: granted.find(g => g.courseId === t.id)?.currentSessionId ?? null,
      }))
      setCourses(list)
      // Une seule formation : on entre directement, comme avant.
      if (list.length === 1) setCourseId(list[0].id)
      setLoading(false)
    })
  }, [subjectType])

  // 2. Contenu de la formation ouverte
  useEffect(() => {
    if (!courseId) { setSessions([]); return }
    const course = courses.find(c => c.id === courseId)
    if (!course) return
    const supabase = createClient()
    Promise.all([
      supabase.from('training_sessions')
        .select('id, title, session_date, duration_hours, location, notes, position, module_id')
        .eq('course_id', courseId) as unknown as Promise<{ data: (Omit<Session, 'accessible'> & { position: number | null; module_id: string | null })[] | null }>,
      supabase.from('training_modules')
        .select('id, position')
        .eq('course_id', courseId) as unknown as Promise<{ data: { id: string; position: number }[] | null }>,
    ]).then(([{ data: allSessions }, { data: allModules }]) => {
      // Même ordre que l'admin : c'est le rang qui détermine l'accès.
      const list = flattenCourse(allModules ?? [], allSessions ?? [])
      const currentIndex = course.currentSessionId ? list.findIndex(s => s.id === course.currentSessionId) : -1
      setSessions(list.map((s, i) => ({ ...s, accessible: currentIndex >= 0 && i <= currentIndex })))
    })
  }, [courseId, courses])

  if (loading) return null

  if (selected) return <SessionDetail session={selected.session} index={selected.index} groupId={groupId} onBack={() => setSelected(null)} />

  if (courses.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Aucune formation</p>
          <p className="text-xs text-gray-400 mt-1">Aucune formation ne vous a encore été attribuée.</p>
        </div>
      </div>
    )
  }

  // Plusieurs formations et aucune ouverte : on laisse choisir.
  if (!courseId) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Mes formations</h1>
          <p className="text-sm text-gray-500 mb-6">{courses.length} formations vous sont attribuées.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map(c => (
              <button key={c.id} onClick={() => setCourseId(c.id)}
                className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-5 hover:border-violet-300 hover:shadow-md transition-all group text-left">
                <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-violet-600" />
                </div>
                <span className="flex-1 min-w-0 font-semibold text-gray-900 text-sm leading-tight">{c.title}</span>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const courseTitle = courses.find(c => c.id === courseId)?.title ?? ''
  const accessibleSessions = sessions.filter(s => s.accessible)
  const lockedSessions = sessions.filter(s => !s.accessible)

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        {/* Bandeau carte */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-400 rounded-2xl border border-violet-500 px-8 py-8 mb-8">
          {courses.length > 1 && (
            <button onClick={() => setCourseId(null)} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-3 transition-colors">
              <ChevronLeft className="w-4 h-4" />Toutes mes formations
            </button>
          )}
          <h1 className="text-2xl font-bold text-white mb-1">{courseTitle}</h1>
          <p className="text-white/70 text-sm">
            {accessibleSessions.length} module{accessibleSessions.length !== 1 ? 's' : ''} débloqué{accessibleSessions.length !== 1 ? 's' : ''} · {sessions.length} au total
          </p>
        </div>
        {/* Modules débloqués */}
        {accessibleSessions.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Modules débloqués</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {accessibleSessions.map((session) => {
                const index = sessions.indexOf(session)
                return (
                  <button key={session.id} onClick={() => setSelected({ session, index })}
                    className="flex flex-col gap-3 bg-white border border-gray-200 rounded-2xl p-5 hover:border-violet-300 hover:shadow-md transition-all group text-left">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center font-bold text-violet-600 text-base shrink-0">
                        {index + 1}
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{session.title ?? `Module ${index + 1}`}</p>
                      {session.session_date && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(session.session_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {session.duration_hours ? ` · ${session.duration_hours}h` : ''}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Modules verrouillés */}
        {lockedSessions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Modules à venir</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {lockedSessions.map((session) => {
                const index = sessions.indexOf(session)
                return (
                  <div key={session.id}
                    className={cn('flex flex-col gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-5 opacity-50')}>
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-400 text-sm leading-tight">{session.title ?? `Module ${index + 1}`}</p>
                      <p className="text-xs text-gray-400 mt-1">À venir</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
