import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Interaction = Database['public']['Tables']['interactions']['Row']

export function useInteractions(entityType: string, entityId: string) {
  const supabase = createClient()
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('interactions')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('occurred_at', { ascending: false }) as { data: Interaction[] | null }
    setInteractions(data ?? [])
    setLoading(false)
  }, [entityType, entityId])

  useEffect(() => { fetch() }, [fetch])

  async function create(values: { type: string; summary: string; channel?: string }) {
    const payload = { ...values, entity_type: entityType, entity_id: entityId }
    const { data, error } = await supabase
      .from('interactions')
      .insert(payload as never)
      .select()
      .single() as { data: Interaction | null; error: unknown }
    if (!error && data) setInteractions(prev => [data, ...prev])
    return { data, error }
  }

  return { interactions, loading, create, refresh: fetch }
}
