import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Quote = Database['public']['Tables']['quotes']['Row']
type QuoteInsert = Database['public']['Tables']['quotes']['Insert']

type QuoteWithCompany = Quote & { companies: { name: string } | null }

export function useQuotes() {
  const supabase = createClient()
  const [quotes, setQuotes] = useState<QuoteWithCompany[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('quotes')
      .select('*, companies(name)')
      .order('created_at', { ascending: false }) as { data: QuoteWithCompany[] | null }
    setQuotes(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function create(values: QuoteInsert) {
    const { data, error } = await supabase
      .from('quotes')
      .insert(values as never)
      .select('*, companies(name)')
      .single() as { data: QuoteWithCompany | null; error: unknown }
    if (!error && data) setQuotes(prev => [data, ...prev])
    return { data, error }
  }

  async function update(id: string, values: Partial<QuoteInsert>) {
    const { data, error } = await supabase
      .from('quotes')
      .update(values as never)
      .eq('id', id)
      .select('*, companies(name)')
      .single() as { data: QuoteWithCompany | null; error: unknown }
    if (!error && data) setQuotes(prev => prev.map(q => q.id === id ? data : q))
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('quotes').delete().eq('id', id)
    if (!error) setQuotes(prev => prev.filter(q => q.id !== id))
    return { error }
  }

  return { quotes, loading, create, update, remove, refresh: fetch }
}
