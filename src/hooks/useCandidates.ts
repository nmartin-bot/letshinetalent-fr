import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Candidate = Database['public']['Tables']['candidates']['Row']
type CandidateInsert = Database['public']['Tables']['candidates']['Insert']
type CandidateUpdate = Database['public']['Tables']['candidates']['Update']
type CoachingSession = Database['public']['Tables']['coaching_sessions']['Row']
type CvVersion = Database['public']['Tables']['cv_versions']['Row']

export function useCandidates() {
  const supabase = createClient()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('candidates').select('*').order('created_at', { ascending: false }) as { data: Candidate[] | null }
    setCandidates(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function create(values: CandidateInsert) {
    const { data, error } = await supabase.from('candidates').insert(values as never).select().single() as { data: Candidate | null; error: unknown }
    if (!error && data) setCandidates(prev => [data, ...prev])
    return { data, error }
  }

  async function update(id: string, values: CandidateUpdate) {
    const { data, error } = await supabase.from('candidates').update(values as never).eq('id', id).select().single() as { data: Candidate | null; error: unknown }
    if (!error && data) setCandidates(prev => prev.map(c => c.id === id ? data : c))
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.rpc('delete_entity_full', { p_entity_type: 'candidate', p_entity_id: id } as never)
    if (error) {
      console.error('delete_entity_full error:', error)
      await supabase.from('documents').delete().eq('entity_type', 'candidate').eq('entity_id', id)
      await supabase.from('candidates').delete().eq('id', id)
    }
    setCandidates(prev => prev.filter(c => c.id !== id))
  }

  return { candidates, loading, refresh: fetch, create, update, remove }
}

export function useCandidate(id: string) {
  const supabase = createClient()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [sessions, setSessions] = useState<CoachingSession[]>([])
  const [cvVersions, setCvVersions] = useState<CvVersion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('candidates').select('*').eq('id', id).single(),
      supabase.from('coaching_sessions').select('*').eq('candidate_id', id).order('session_number'),
      supabase.from('cv_versions').select('*').eq('candidate_id', id).order('version_number', { ascending: false }),
    ]).then(([{ data: c }, { data: s }, { data: cv }]) => {
      setCandidate(c as Candidate | null)
      setSessions((s as CoachingSession[] | null) ?? [])
      setCvVersions((cv as CvVersion[] | null) ?? [])
      setLoading(false)
    })
  }, [id])

  async function update(values: CandidateUpdate) {
    const { data, error } = await supabase.from('candidates').update(values as never).eq('id', id).select().single() as { data: Candidate | null; error: unknown }
    if (!error && data) setCandidate(data)
    return { data, error }
  }

  async function upsertSession(session: Database['public']['Tables']['coaching_sessions']['Insert']) {
    const { data, error } = await supabase.from('coaching_sessions').upsert(session as never).select().single() as { data: CoachingSession | null; error: unknown }
    if (!error && data) setSessions(prev => {
      const exists = prev.find(s => s.session_number === data.session_number)
      return exists ? prev.map(s => s.session_number === data.session_number ? data : s) : [...prev, data].sort((a, b) => a.session_number - b.session_number)
    })
    return { data, error }
  }

  async function uploadCvVersion(file: File, score?: number | null, analysisResult?: Record<string, unknown> | null) {
    const versionNumber = cvVersions.length + 1
    const path = `cv/${id}/${Date.now()}_v${versionNumber}_${file.name}`
    const { error: storageError } = await supabase.storage.from('documents').upload(path, file)
    if (storageError) return { data: null, error: storageError }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
    const stage = versionNumber === 1 ? 'initial' : 'revised'
    const { data, error } = await supabase.from('cv_versions').insert({
      candidate_id: id,
      version_number: versionNumber,
      file_url: urlData.publicUrl,
      score: score ?? null,
      analysis_result: analysisResult ?? null,
      stage,
      analyzed_at: score != null ? new Date().toISOString() : null,
    } as never).select().single() as { data: CvVersion | null; error: unknown }
    if (!error && data) setCvVersions(prev => [data, ...prev])
    return { data, error }
  }

  async function removeCvVersion(cvId: string) {
    const { error } = await supabase.from('cv_versions').delete().eq('id', cvId)
    if (!error) setCvVersions(prev => prev.filter(c => c.id !== cvId))
  }

  return { candidate, sessions, cvVersions, loading, update, upsertSession, uploadCvVersion, removeCvVersion }
}
