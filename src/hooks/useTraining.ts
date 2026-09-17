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
      .order('created_at', { ascending: true }) as { data: Session[] | null }

    if (sessions?.length) {
      // created_at/uploaded_at are set explicitly and spaced: a multi-row insert
      // would give every copy the same now(), scrambling the display order.
      const base = Date.now()
      const sessionCopies = sessions.map((s, i) => ({
        id: crypto.randomUUID(),
        course_id: newCourse.id,
        title: s.title,
        session_date: s.session_date,
        duration_hours: s.duration_hours,
        location: s.location,
        notes: s.notes,
        created_at: new Date(base + i).toISOString(),
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
  const [learners, setLearners] = useState<Learner[]>([])
  const [loading, setLoading] = useState(true)

  // silent : rafraîchit sans repasser par l'écran de chargement, qui démonterait
  // les panneaux ouverts (et leur état local) à chaque mise à jour.
  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const [{ data: c }, { data: s }, { data: l }] = await Promise.all([
      supabase.from('training_courses').select('*, companies(name)').eq('id', id).single(),
      supabase.from('training_sessions').select('*').eq('course_id', id).order('created_at', { ascending: true }),
      supabase.from('learners').select('*').eq('training_course_id', id).order('last_name'),
    ])
    setCourse(c as (Course & { companies: { name: string } | null }) | null)
    setSessions((s as Session[] | null) ?? [])
    setLearners((l as Learner[] | null) ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  async function addSession(values: Omit<SessionInsert, 'course_id' | 'session_date'> & { session_date?: string | null }) {
    const { data, error } = await supabase.from('training_sessions').insert({ ...values, course_id: id } as never).select().single() as { data: Session | null; error: unknown }
    if (!error && data) setSessions(prev => [...prev, data])
    return { data, error }
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

  return { course, sessions, learners, loading, addSession, removeSession, updateSession, getAttendance, toggleAttendance, updateCourse, refresh: fetch }
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
