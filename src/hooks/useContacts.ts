import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Contact = Database['public']['Tables']['contacts']['Row']
type ContactInsert = Database['public']['Tables']['contacts']['Insert']

export function useContacts(companyId: string) {
  const supabase = createClient()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('company_id', companyId)
      .order('is_main_contact', { ascending: false }) as { data: Contact[] | null }
    setContacts(data ?? [])
    setLoading(false)
  }, [companyId])

  useEffect(() => { fetch() }, [fetch])

  async function create(values: ContactInsert) {
    const { data, error } = await supabase.from('contacts').insert(values as never).select().single() as { data: Contact | null; error: unknown }
    if (!error && data) setContacts(prev => [...prev, data])
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (!error) setContacts(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  return { contacts, loading, refresh: fetch, create, remove }
}
