import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Learner = Database['public']['Tables']['learners']['Row']
type LearnerInsert = Database['public']['Tables']['learners']['Insert']
type LearnerUpdate = Database['public']['Tables']['learners']['Update']

export function useLearners() {
  const supabase = createClient()
  const [learners, setLearners] = useState<Learner[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('learners')
      .select('*, companies(name)')
      .order('last_name') as { data: (Learner & { companies: { name: string } | null })[] | null }
    setLearners((data as Learner[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function create(values: LearnerInsert) {
    const { data, error } = await supabase.from('learners').insert(values as never).select('*, companies(name)').single() as { data: Learner | null; error: unknown }
    if (!error && data) setLearners(prev => [...prev, data].sort((a, b) => a.last_name.localeCompare(b.last_name)))
    return { data, error }
  }

  async function update(id: string, values: LearnerUpdate) {
    const { data, error } = await supabase.from('learners').update(values as never).eq('id', id).select('*, companies(name)').single() as { data: Learner | null; error: unknown }
    if (!error && data) setLearners(prev => prev.map(l => l.id === id ? data : l))
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('learners').delete().eq('id', id)
    if (!error) setLearners(prev => prev.filter(l => l.id !== id))
  }

  return { learners, loading, refresh: fetch, create, update, remove }
}

export function useLearner(id: string) {
  const supabase = createClient()
  const [learner, setLearner] = useState<Learner | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('learners').select('*, companies(name)').eq('id', id).single()
      .then(({ data }) => { setLearner(data as Learner | null); setLoading(false) })
  }, [id])

  async function update(values: LearnerUpdate) {
    const { data, error } = await supabase.from('learners').update(values as never).eq('id', id).select('*, companies(name)').single() as { data: Learner | null; error: unknown }
    if (!error && data) setLearner(data)
    return { data, error }
  }

  return { learner, loading, update }
}
