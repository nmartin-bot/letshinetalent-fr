import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Quote = Database['public']['Tables']['quotes']['Row']
type QuoteInsert = Database['public']['Tables']['quotes']['Insert']

type QuoteWithRelations = Quote & {
  companies: { name: string } | null
  documents: { id: string; name: string; file_url: string; mime_type: string | null } | null
}

export type { QuoteWithRelations }

const BUCKET = 'documents'

export function useQuotes() {
  const supabase = createClient()
  const [quotes, setQuotes] = useState<QuoteWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('quotes')
      .select('*, companies(name), documents(id, name, file_url, mime_type)')
      .order('created_at', { ascending: false }) as { data: QuoteWithRelations[] | null; error: unknown }
    if (error) {
      const { data: fallback } = await supabase
        .from('quotes')
        .select('*, companies(name)')
        .order('created_at', { ascending: false }) as { data: QuoteWithRelations[] | null }
      setQuotes((fallback ?? []).map(q => ({ ...q, documents: null })))
    } else {
      setQuotes(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function create(values: QuoteInsert) {
    const { data, error } = await supabase
      .from('quotes')
      .insert(values as never)
      .select('*, companies(name)')
      .single() as { data: QuoteWithRelations | null; error: unknown }
    if (!error && data) setQuotes(prev => [{ ...data, documents: null }, ...prev])
    return { data, error }
  }

  async function update(id: string, values: Partial<QuoteInsert>) {
    const { data, error } = await supabase
      .from('quotes')
      .update(values as never)
      .eq('id', id)
      .select('*, companies(name)')
      .single() as { data: QuoteWithRelations | null; error: unknown }
    if (!error && data) {
      setQuotes(prev => prev.map(q => q.id === id ? { ...data, documents: q.documents } : q))
      fetch()
    }
    return { data, error }
  }

  async function remove(id: string) {
    // Find associated document before deleting
    const quote = quotes.find(q => q.id === id)
    const docId = (quote as Quote & { document_id?: string | null })?.document_id ?? null
    const docUrl = quote?.documents?.file_url ?? null

    // Delete quote first (FK sets document_id to null via on delete set null)
    const { error } = await supabase.from('quotes').delete().eq('id', id)
    if (error) return { error }

    // Then delete associated document from storage + table
    if (docId) {
      if (docUrl) {
        const marker = `/storage/v1/object/public/${BUCKET}/`
        const idx = docUrl.indexOf(marker)
        if (idx !== -1) {
          const storagePath = docUrl.slice(idx + marker.length)
          await supabase.storage.from(BUCKET).remove([storagePath])
        }
      }
      await supabase.from('documents').delete().eq('id', docId)
    }

    setQuotes(prev => prev.filter(q => q.id !== id))
    return { error: null }
  }

  return { quotes, loading, create, update, remove, refresh: fetch }
}
