import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { BookOpen, Lock, ArrowRight, ChevronLeft, FileText, File, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DocViewer, DocPreview, formatSize, type PreviewDoc } from '@/components/shared/DocPreview'

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
  component: ApprenantFormations,
})

function fileIcon(mime: string | null) {
  if (!mime) return <File className="w-5 h-5 text-gray-400" />
  if (mime.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-400" />
  if (mime === 'application/pdf') return <FileText className="w-5 h-5 text-red-400" />
  return <FileText className="w-5 h-5 text-violet-400" />
}

function SessionDetail({ session, index, onBack }: { session: Session; index: number; onBack: () => void }) {
  const [docs, setDocs] = useState<PreviewDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [previewing, setPreviewing] = useState<PreviewDoc | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('documents').select('id, name, file_url, mime_type, file_size')
      .eq('entity_type', 'session').eq('entity_id', session.id)
      .then(({ data }) => { setDocs((data ?? []).filter(d => d.file_url) as PreviewDoc[]); setLoading(false) })
  }, [session.id])

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

function ApprenantFormations() {
  const [courseTitle, setCourseTitle] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<{ session: Session; index: number } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase.from('profiles').select('entity_id').eq('id', user.id).single() as { data: { entity_id: string } | null }
      const learnerId = profile?.entity_id ?? ''
      if (!learnerId) { setLoading(false); return }

      const { data: learner } = await supabase.from('learners').select('training_course_id, current_session_id').eq('id', learnerId).single() as { data: { training_course_id: string | null; current_session_id: string | null } | null }
      if (!learner?.training_course_id) { setLoading(false); return }

      const { data: course } = await supabase.from('training_courses').select('title').eq('id', learner.training_course_id).single() as { data: { title: string } | null }
      const { data: allSessions } = await supabase.from('training_sessions')
        .select('id, title, session_date, duration_hours, location, notes')
        .eq('course_id', learner.training_course_id)
        .order('created_at', { ascending: true }) as { data: Omit<Session, 'accessible'>[] | null }

      const list = allSessions ?? []
      const currentIndex = learner.current_session_id ? list.findIndex(s => s.id === learner.current_session_id) : -1

      setCourseTitle(course?.title ?? null)
      setSessions(list.map((s, i) => ({ ...s, accessible: currentIndex >= 0 && i <= currentIndex })))
      setLoading(false)
    })
  }, [])

  if (loading) return null

  if (selected) return <SessionDetail session={selected.session} index={selected.index} onBack={() => setSelected(null)} />

  if (!courseTitle) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Aucune formation assignée</p>
          <p className="text-xs text-gray-400 mt-1">Votre formateur n'a pas encore associé de formation à votre profil.</p>
        </div>
      </div>
    )
  }

  const accessibleSessions = sessions.filter(s => s.accessible)
  const lockedSessions = sessions.filter(s => !s.accessible)

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        {/* Bandeau carte */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-400 rounded-2xl border border-violet-500 px-8 py-8 mb-8">
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
