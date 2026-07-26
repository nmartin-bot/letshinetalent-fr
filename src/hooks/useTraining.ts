import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Course = Database['public']['Tables']['training_courses']['Row']
type CourseInsert = Database['public']['Tables']['training_courses']['Insert']
type Session = Database['public']['Tables']['training_sessions']['Row']
type SessionInsert = Database['public']['Tables']['training_sessions']['Insert']
type Attendance = Database['public']['Tables']['attendance']['Row']
type Learner = Database['public']['Tables']['learners']['Row']

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

  return { courses, loading, refresh: fetch, create, update, remove }
}

export function useTrainingCourse(id: string) {
  const supabase = createClient()
  const [course, setCourse] = useState<(Course & { companies: { name: string } | null }) | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [learners, setLearners] = useState<Learner[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
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
