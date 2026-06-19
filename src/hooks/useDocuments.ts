import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Document = Database['public']['Tables']['documents']['Row']

const BUCKET = 'documents'

export function useDocuments(entityType?: string, entityId?: string) {
  const supabase = createClient()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('documents').select('*').order('uploaded_at', { ascending: false })
    if (entityType) query = query.eq('entity_type', entityType)
    if (entityId) query = query.eq('entity_id', entityId)
    const { data } = await query as { data: Document[] | null }
    setDocuments(data ?? [])
    setLoading(false)
  }, [entityType, entityId])

  useEffect(() => { fetch() }, [fetch])

  async function upload(file: File, meta: { entity_type: string; entity_id: string; category?: string; client_visible?: boolean }) {
    setUploading(true)
    const path = `${meta.entity_type}/${meta.entity_id}/${Date.now()}_${file.name}`

    const { error: storageError } = await supabase.storage.from(BUCKET).upload(path, file)
    if (storageError) { setUploading(false); return { error: storageError } }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

    const { data, error } = await supabase.from('documents').insert({
      entity_type: meta.entity_type,
      entity_id: meta.entity_id,
      name: file.name,
      file_url: urlData.publicUrl,
      mime_type: file.type || null,
      file_size: file.size,
      category: meta.category ?? 'autre',
      client_visible: meta.client_visible ?? false,
    } as never).select().single() as { data: Document | null; error: unknown }

    if (!error && data) setDocuments(prev => [data, ...prev])
    setUploading(false)
    return { data, error }
  }

  async function getSignedUrl(filePath: string) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600)
    return data?.signedUrl ?? null
  }

  async function remove(id: string, fileUrl: string) {
    // Extract storage path from public URL
    const marker = `/storage/v1/object/public/${BUCKET}/`
    const idx = fileUrl.indexOf(marker)
    if (idx !== -1) {
      const storagePath = fileUrl.slice(idx + marker.length)
      await supabase.storage.from(BUCKET).remove([storagePath])
    }
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (!error) setDocuments(prev => prev.filter(d => d.id !== id))
    return { error }
  }

  return { documents, loading, uploading, upload, remove, getSignedUrl, refresh: fetch }
}
