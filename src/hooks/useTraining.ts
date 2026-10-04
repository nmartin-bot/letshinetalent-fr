import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Course = Database['public']['Tables']['training_courses']['Row']
type CourseInsert = Database['public']['Tables']['training_courses']['Insert']
type Session = Database['public']['Tables']['training_sessions']['Row']
type SessionInsert = Database['public']['Tables']['training_sessions']['Insert']
type Attendance = Database['public']['Tables']['attendance']['Row']
type Learner = Database['public']['Tables']['learners']['Row']
type LearnerGroup = Database['public']['Tables']['learner_groups']['Row']
type TrainingModule = Database['public']['Tables']['training_modules']['Row']

const byPosition = <T extends { position: number | null }>(a: T, b: T) => (a.position ?? 0) - (b.position ?? 0)

/**
 * Ordre à plat d'une formation : contenus restés à la racine, puis le contenu
 * de chaque module. Le portail déverrouille par rang dans cette liste, donc
 * l'admin et le portail doivent l'un comme l'autre passer par ici.
 */
export function flattenCourse<S extends { id: string; position: number | null; module_id: string | null }>(
  modules: { id: string; position: number }[],
  sessions: S[],
): S[] {
  const loose = sessions.filter(s => !s.module_id).sort(byPosition)
  const grouped = [...modules]
    .sort((a, b) => a.position - b.position)
    .flatMap(m => sessions.filter(s => s.module_id === m.id).sort(byPosition))
  return [...loose, ...grouped]
}
type LearnerGroupInsert = Database['public']['Tables']['learner_groups']['Insert']

export function useTrainingCourses() {
  const supabase = createClient()
  const [courses, setCourses] = useState<(Course & { companies: { name: string } | null })[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('training_courses')
      .select('*, companies(name)')
      .order('created_at', { ascending: false }) as { data: (Course & { companies: { name: string } | null })[] | null }
    setCourses(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function create(values: CourseInsert) {
    const { data, error } = await supabase.from('training_courses').insert(values as never).select('*, companies(name)').single() as { data: (Course & { companies: { name: string } | null }) | null; error: unknown }
    if (!error && data) setCourses(prev => [data, ...prev])
    return { data, error }
  }

  async function update(id: string, values: Partial<CourseInsert>) {
    const { data, error } = await supabase.from('training_courses').update(values as never).eq('id', id).select('*, companies(name)').single() as { data: (Course & { companies: { name: string } | null }) | null; error: unknown }
    if (!error && data) setCourses(prev => prev.map(c => c.id === id ? data : c))
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('training_courses').delete().eq('id', id)
    if (!error) setCourses(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  async function duplicate(id: string) {
    const course = courses.find(c => c.id === id)
    if (!course) return { error: 'not_found' }

    const { data: newCourse, error } = await supabase
      .from('training_courses')
      .insert({ title: `${course.title} (copie)`, description: course.description } as never)
      .select('*, companies(name)')
      .single() as { data: (Course & { companies: { name: string } | null }) | null; error: unknown }

    if (error || !newCourse) return { error }

    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('course_id', id)
      .order('position', { ascending: true }) as { data: Session[] | null }

    if (sessions?.length) {
      const base = Date.now()
      const sessionCopies = sessions.map((s, i) => ({
        id: crypto.randomUUID(),
        course_id: newCourse.id,
        title: s.title,
        session_date: s.session_date,
        duration_hours: s.duration_hours,
        location: s.location,
        notes: s.notes,
        position: i,
      }))

      await supabase.from('training_sessions').insert(sessionCopies as never)

      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('entity_type', 'session')
        .in('entity_id', sessions.map(s => s.id))
        .order('uploaded_at', { ascending: true }) as { data: Database['public']['Tables']['documents']['Row'][] | null }

      if (docs?.length) {
        const newSessionId = new Map(sessions.map((s, i) => [s.id, sessionCopies[i].id]))
        await supabase.from('documents').insert(
          docs.map((doc, i) => ({
            entity_type: 'session',
            entity_id: newSessionId.get(doc.entity_id ?? '') ?? null,
            name: doc.name,
            file_url: doc.file_url,
            mime_type: doc.mime_type,
            file_size: doc.file_size,
            category: doc.category,
            client_visible: doc.client_visible,
            uploaded_at: new Date(base + i).toISOString(),
          })) as never
        )
      }
    }

    setCourses(prev => [newCourse, ...prev])
    return { data: newCourse, error: null }
  }

  return { courses, loading, refresh: fetch, create, update, remove, duplicate }
}

export function useTrainingCourse(id: string) {
  const supabase = createClient()
  const [course, setCourse] = useState<(Course & { companies: { name: string } | null }) | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [modules, setModules] = useState<TrainingModule[]>([])
  const [learners, setLearners] = useState<Learner[]>([])
  const [loading, setLoading] = useState(true)

  // silent : rafraîchit sans repasser par l'écran de chargement, qui démonterait
  // les panneaux ouverts (et leur état local) à chaque mise à jour.
  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const [{ data: c }, { data: s }, { data: m }, { data: l }] = await Promise.all([
      supabase.from('training_courses').select('*, companies(name)').eq('id', id).single(),
      supabase.from('training_sessions').select('*').eq('course_id', id).order('position', { ascending: true }),
      supabase.from('training_modules').select('*').eq('course_id', id).order('position', { ascending: true }),
      supabase.from('learners').select('*').eq('training_course_id', id).order('last_name'),
    ])
    setCourse(c as (Course & { companies: { name: string } | null }) | null)
    setSessions((s as Session[] | null) ?? [])
    setModules((m as TrainingModule[] | null) ?? [])
    setLearners((l as Learner[] | null) ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  async function addSession(values: Omit<SessionInsert, 'course_id' | 'session_date'> & { session_date?: string | null }) {
    const position = sessions.reduce((max, s) => Math.max(max, s.position ?? 0), -1) + 1
    const { data, error } = await supabase.from('training_sessions').insert({ ...values, course_id: id, position } as never).select().single() as { data: Session | null; error: unknown }
    if (!error && data) setSessions(prev => [...prev, data])
    return { data, error }
  }

  // Place un contenu dans un module (ou à la racine si moduleId est null) au rang
  // voulu, et renumérote ce seul conteneur. Le conteneur d'origine garde des trous
  // dans sa numérotation, sans effet sur l'ordre affiché.
  async function moveSession(sessionId: string, moduleId: string | null, toIndex: number) {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return { error: 'not_found' }

    const target = sessions
      .filter(s => s.module_id === moduleId && s.id !== sessionId)
      .sort(byPosition)
    target.splice(toIndex, 0, session)

    const updates = target.map((s, i) => ({ id: s.id, position: i }))
    const unchanged = updates.every(u => {
      const s = sessions.find(x => x.id === u.id)!
      return s.position === u.position && s.module_id === moduleId
    })
    if (unchanged) return { error: null }

    const previous = sessions
    setSessions(prev => prev.map(s => {
      const u = updates.find(u => u.id === s.id)
      return u ? { ...s, position: u.position, module_id: moduleId } : s
    }))

    const results = await Promise.all(updates.map(u =>
      supabase.from('training_sessions').update({ position: u.position, module_id: moduleId } as never).eq('id', u.id)
    ))

    // Sans ça un échec d'écriture laisse le nouvel ordre à l'écran, comme s'il
    // était enregistré, et il disparaît au rechargement suivant.
    const failed = results.find(r => r.error)
    if (failed) {
      setSessions(previous)
      return { error: failed.error }
    }
    return { error: null }
  }

  async function addModule(name: string) {
    const position = modules.reduce((max, m) => Math.max(max, m.position), -1) + 1
    const { data, error } = await supabase.from('training_modules')
      .insert({ course_id: id, name, position } as never).select().single() as { data: TrainingModule | null; error: unknown }
    if (!error && data) setModules(prev => [...prev, data])
    return { data, error }
  }

  async function renameModule(moduleId: string, name: string) {
    const { data, error } = await supabase.from('training_modules')
      .update({ name } as never).eq('id', moduleId).select().single() as { data: TrainingModule | null; error: unknown }
    if (!error && data) setModules(prev => prev.map(m => m.id === moduleId ? data : m))
    return { data, error }
  }

  // Les contenus du module retournent à la racine (ON DELETE SET NULL).
  async function removeModule(moduleId: string) {
    const { error } = await supabase.from('training_modules').delete().eq('id', moduleId)
    if (!error) {
      setModules(prev => prev.filter(m => m.id !== moduleId))
      setSessions(prev => prev.map(s => s.module_id === moduleId ? { ...s, module_id: null } : s))
    }
    return { error }
  }

  async function moveModule(moduleId: string, toIndex: number) {
    const from = modules.findIndex(m => m.id === moduleId)
    if (from === -1 || from === toIndex) return { error: null }

    const reordered = [...modules].sort((a, b) => a.position - b.position)
    const [moved] = reordered.splice(reordered.findIndex(m => m.id === moduleId), 1)
    reordered.splice(toIndex, 0, moved)

    const previous = modules
    setModules(reordered.map((m, i) => ({ ...m, position: i })))

    const results = await Promise.all(
      reordered
        .map((m, i) => ({ id: m.id, position: i }))
        .filter(u => previous.find(m => m.id === u.id)?.position !== u.position)
        .map(u => supabase.from('training_modules').update({ position: u.position } as never).eq('id', u.id))
    )

    const failed = results.find(r => r.error)
    if (failed) {
      setModules(previous)
      return { error: failed.error }
    }
    return { error: null }
  }

  async function removeSession(sessionId: string) {
    const { error } = await supabase.from('training_sessions').delete().eq('id', sessionId)
    if (!error) setSessions(prev => prev.filter(s => s.id !== sessionId))
    return { error }
  }

  async function getAttendance(sessionId: string): Promise<Attendance[]> {
    const { data } = await supabase.from('attendance').select('*').eq('session_id', sessionId) as { data: Attendance[] | null }
    return data ?? []
  }

  async function toggleAttendance(sessionId: string, learnerId: string, present: boolean) {
    await supabase.from('attendance').upsert({ session_id: sessionId, learner_id: learnerId, present } as never, { onConflict: 'session_id,learner_id' })
  }

  async function updateCourse(values: Partial<CourseInsert>) {
    const { data, error } = await supabase.from('training_courses').update(values as never).eq('id', id).select('*, companies(name)').single() as { data: (Course & { companies: { name: string } | null }) | null; error: unknown }
    if (!error && data) setCourse(data)
    return { data, error }
  }

  async function updateSession(sessionId: string, values: Partial<Omit<SessionInsert, 'course_id'>>) {
    const { data, error } = await supabase.from('training_sessions').update(values as never).eq('id', sessionId).select().single() as { data: Session | null; error: unknown }
    if (!error && data) setSessions(prev => prev.map(s => s.id === sessionId ? data : s))
    return { data, error }
  }

  return {
    course, sessions, modules, learners, loading,
    addSession, removeSession, updateSession, moveSession,
    addModule, renameModule, removeModule, moveModule,
    getAttendance, toggleAttendance, updateCourse, refresh: fetch,
  }
}

export function useLearnerGroups(courseId: string) {
  const supabase = createClient()
  const [groups, setGroups] = useState<LearnerGroup[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('learner_groups')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true }) as { data: LearnerGroup[] | null }
    setGroups(data ?? [])
    setLoading(false)
  }, [courseId])

  useEffect(() => { fetch() }, [fetch])

  async function create(values: Omit<LearnerGroupInsert, 'course_id'>) {
    const { data, error } = await supabase
      .from('learner_groups')
      .insert({ ...values, course_id: courseId } as never)
      .select().single() as { data: LearnerGroup | null; error: unknown }
    if (!error && data) setGroups(prev => [...prev, data])
    return { data, error }
  }

  async function update(groupId: string, values: Partial<Omit<LearnerGroupInsert, 'course_id'>>) {
    const { data, error } = await supabase
      .from('learner_groups')
      .update(values as never).eq('id', groupId)
      .select().single() as { data: LearnerGroup | null; error: unknown }
    if (!error && data) setGroups(prev => prev.map(g => g.id === groupId ? data : g))
    return { data, error }
  }

  async function remove(groupId: string) {
    const { error } = await supabase.from('learner_groups').delete().eq('id', groupId)
    if (!error) setGroups(prev => prev.filter(g => g.id !== groupId))
    return { error }
  }

  // Un groupe sans curseur n'écrase pas l'accès déjà accordé à l'apprenant.
  function joinPatch(groupId: string) {
    const session = groups.find(g => g.id === groupId)?.current_session_id
    return session ? { group_id: groupId, current_session_id: session } : { group_id: groupId }
  }

  async function assignLearner(learnerId: string, groupId: string | null) {
    const patch = groupId ? joinPatch(groupId) : { group_id: null }
    const { error } = await supabase.from('learners').update(patch as never).eq('id', learnerId)
    return { error }
  }

  // Membres retirés : on ne touche pas à leur accès, seulement à leur rattachement.
  async function setMembers(groupId: string, learnerIds: string[]) {
    const { data: current } = await supabase
      .from('learners').select('id').eq('group_id', groupId) as { data: { id: string }[] | null }

    const before = new Set((current ?? []).map(l => l.id))
    const after = new Set(learnerIds)
    const added = learnerIds.filter(id => !before.has(id))
    const removed = [...before].filter(id => !after.has(id))

    if (removed.length) {
      await supabase.from('learners').update({ group_id: null } as never).in('id', removed)
    }
    if (added.length) {
      await supabase.from('learners').update(joinPatch(groupId) as never).in('id', added)
    }
  }

  // Le portail apprenant lit learners.current_session_id : on propage à tous les membres.
  async function setGroupSession(groupId: string, sessionId: string | null) {
    const { data, error } = await supabase
      .from('learner_groups').update({ current_session_id: sessionId } as never).eq('id', groupId)
      .select().single() as { data: LearnerGroup | null; error: unknown }
    if (error) return { error }
    await supabase.from('learners').update({ current_session_id: sessionId } as never).eq('group_id', groupId)
    if (data) setGroups(prev => prev.map(g => g.id === groupId ? data : g))
    return { error: null }
  }

  return { groups, loading, create, update, remove, assignLearner, setMembers, setGroupSession, refresh: fetch }
}

export function useAllTrainingCourses() {
  const supabase = createClient()
  const [courses, setCourses] = useState<(Course & { companies: { name: string } | null })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('training_courses').select('*, companies(name)').order('title')
      .then(({ data }) => { setCourses((data as typeof courses | null) ?? []); setLoading(false) })
  }, [])

  return { courses, loading }
}
