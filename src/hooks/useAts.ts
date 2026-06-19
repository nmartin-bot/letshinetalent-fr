import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Application = Database['public']['Tables']['ats_applications']['Row']
type ApplicationInsert = Database['public']['Tables']['ats_applications']['Insert']

export function useAts() {
  const supabase = createClient()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ats_applications')
      .select('*')
      .order('applied_at', { ascending: false }) as { data: Application[] | null }
    setApplications(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function create(values: ApplicationInsert) {
    const { data, error } = await supabase.from('ats_applications').insert(values as never).select().single() as { data: Application | null; error: unknown }
    if (!error && data) setApplications(prev => [data, ...prev])
    return { data, error }
  }

  async function updateStatus(id: string, status: Application['status']) {
    const { data, error } = await supabase.from('ats_applications').update({ status } as never).eq('id', id).select().single() as { data: Application | null; error: unknown }
    if (!error && data) setApplications(prev => prev.map(a => a.id === id ? data : a))
    return { data, error }
  }

  async function convertToCandidate(application: Application) {
    const supabase = createClient()
    const { data: candidate, error } = await supabase
      .from('candidates')
      .insert({
        first_name: application.first_name,
        last_name: application.last_name,
        email: application.email,
        phone: application.phone,
        status: 'active',
      } as never)
      .select()
      .single() as { data: { id: string } | null; error: unknown }

    if (error || !candidate) return { error }

    await supabase.from('ats_applications').update({ candidate_id: candidate.id } as never).eq('id', application.id)
    setApplications(prev => prev.map(a => a.id === application.id ? { ...a, candidate_id: candidate.id } : a))
    return { data: candidate, error: null }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('ats_applications').delete().eq('id', id)
    if (!error) setApplications(prev => prev.filter(a => a.id !== id))
    return { error }
  }

  return { applications, loading, refresh: fetch, create, updateStatus, convertToCandidate, remove }
}
