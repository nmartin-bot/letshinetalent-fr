import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Company = Database['public']['Tables']['companies']['Row']
type CompanyInsert = Database['public']['Tables']['companies']['Insert']
type CompanyUpdate = Database['public']['Tables']['companies']['Update']

export function useCompanies() {
  const supabase = createClient()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('companies').select('*').order('name') as { data: Company[] | null }
    setCompanies(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function create(values: CompanyInsert) {
    const { data, error } = await supabase.from('companies').insert(values as never).select().single() as { data: Company | null; error: unknown }
    if (!error && data) setCompanies(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error }
  }

  async function update(id: string, values: CompanyUpdate) {
    const { data, error } = await supabase.from('companies').update(values as never).eq('id', id).select().single() as { data: Company | null; error: unknown }
    if (!error && data) setCompanies(prev => prev.map(c => c.id === id ? data : c))
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (!error) setCompanies(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  return { companies, loading, refresh: fetch, create, update, remove }
}

export function useCompany(id: string) {
  const supabase = createClient()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('companies').select('*').eq('id', id).single()
      .then(({ data }) => { setCompany(data as Company | null); setLoading(false) })
  }, [id])

  async function update(values: CompanyUpdate) {
    const { data, error } = await supabase.from('companies').update(values as never).eq('id', id).select().single() as { data: Company | null; error: unknown }
    if (!error && data) setCompany(data)
    return { data, error }
  }

  return { company, loading, update, setCompany }
}
