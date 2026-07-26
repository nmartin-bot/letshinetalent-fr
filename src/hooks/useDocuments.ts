import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type DocumentRow = Database['public']['Tables']['documents']['Row']
export type Folder = Database['public']['Tables']['document_folders']['Row']
export type Document = DocumentRow

const BUCKET = 'documents'

export function useDocuments(entityType?: string, entityId?: string) {
  const supabase = createClient()
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const [docsResult, foldersResult] = await Promise.all([
      (() => {
        // Contexte individuel : docs perso + docs partagés du même type + docs globaux
        if (entityType && entityId) {
          return supabase.from('documents').select('*')
            .or(`entity_id.eq.${entityId},and(entity_type.eq.${entityType},entity_id.is.null),and(entity_type.eq.global,entity_id.is.null)`)
            .order('uploaded_at', { ascending: false }) as unknown as Promise<{ data: Document[] | null }>
        }
        let q = supabase.from('documents').select('*').order('uploaded_at', { ascending: false })
        if (entityType) q = q.eq('entity_type', entityType)
        if (!entityType && !entityId) q = q.neq('entity_type', 'session')
        return q as unknown as Promise<{ data: Document[] | null }>
      })(),
      (() => {
        let q = supabase.from('document_folders').select('*').order('name')
        if (!entityType && !entityId) {
          // Page globale : affiche uniquement les dossiers globaux (sans entité)
          q = q.is('entity_id', null)
        }
        // Contexte fiche (entityType + entityId) : charge tous les dossiers,
        // DocumentManager.isFolderRelevant() filtre ceux qui contiennent des docs de cette entité
        return q as unknown as Promise<{ data: Folder[] | null }>
      })(),
    ])
    setDocuments(docsResult.data ?? [])
    setFolders(foldersResult.data ?? [])
    setLoading(false)
  }, [entityType, entityId])

  useEffect(() => { fetch() }, [fetch])

  async function upload(file: File, meta: {
    entity_type: string
    entity_id?: string | null
    category?: string
    client_visible?: boolean
    folder_id?: string | null
    name?: string
  }) {
    setUploading(true)
    const safeName = file.name
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
    const pathPrefix = meta.entity_id
      ? `${meta.entity_type}/${meta.entity_id}`
      : `shared/${meta.entity_type}`
    const path = `${pathPrefix}/${Date.now()}_${safeName}`
    const { error: storageError } = await supabase.storage.from(BUCKET).upload(path, file)
    if (storageError) { setUploading(false); return { error: storageError } }
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const { data, error } = await supabase.from('documents').insert({
      entity_type: meta.entity_type,
      entity_id: meta.entity_id ?? null,
      folder_id: meta.folder_id ?? null,
      name: meta.name || file.name,
      file_url: publicUrl,
      mime_type: file.type || null,
      file_size: file.size,
      category: meta.category ?? 'autre',
      client_visible: meta.client_visible ?? false,
    } as never).select().single() as { data: Document | null; error: unknown }
    if (!error && data) setDocuments(prev => [data, ...prev])
    setUploading(false)
    return { data, error }
  }

  async function updateDoc(id: string, fields: { name?: string; folder_id?: string | null; client_visible?: boolean; category?: string; entity_type?: string; entity_id?: string }) {
    const { data, error } = await supabase.from('documents').update(fields as never).eq('id', id).select().single() as { data: Document | null; error: unknown }
    if (!error && data) setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...data } : d))
    return { data, error }
  }

  async function remove(id: string, fileUrl: string) {
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

  async function createFolder(name: string, parentId: string | null = null) {
    const { data, error } = await supabase.from('document_folders').insert({
      name,
      parent_id: parentId,
      entity_type: null,
      entity_id: null,
    } as never).select().single() as { data: Folder | null; error: unknown }
    if (!error && data) setFolders(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error }
  }

  async function renameFolder(id: string, name: string) {
    const { data, error } = await supabase.from('document_folders').update({ name } as never).eq('id', id).select().single() as { data: Folder | null; error: unknown }
    if (!error && data) setFolders(prev => prev.map(f => f.id === id ? data : f))
    return { data, error }
  }

  async function removeFolder(id: string) {
    const { error } = await supabase.from('document_folders').delete().eq('id', id)
    if (!error) setFolders(prev => prev.filter(f => f.id !== id))
    return { error }
  }

  async function moveDocument(id: string, folderId: string | null) {
    const { data, error } = await supabase.from('documents').update({ folder_id: folderId } as never).eq('id', id).select().single() as { data: Document | null; error: unknown }
    if (!error && data) setDocuments(prev => prev.map(d => d.id === id ? data : d))
    return { data, error }
  }

  async function ensureClientFolder(): Promise<string | null> {
    // Le dossier est pré-créé par migration — on cherche uniquement, jamais d'INSERT côté client
    const existing = folders.find(f => f.name === 'Documents du client' && !f.entity_id)
    if (existing) return existing.id
    // Fallback : requête directe si le dossier n'est pas encore chargé dans le state
    const { data } = await supabase.from('document_folders')
      .select('id').eq('name', 'Documents du client').is('entity_id', null).single() as { data: { id: string } | null }
    return data?.id ?? null
  }

  return { documents, folders, loading, uploading, upload, updateDoc, remove, createFolder, renameFolder, removeFolder, moveDocument, ensureClientFolder, refresh: fetch }
}

export type EntityOption = { id: string; label: string; type: string }

export async function loadAllEntities(): Promise<EntityOption[]> {
  const supabase = createClient()
  const [{ data: candidates }, { data: companies }, { data: learners }] = await Promise.all([
    supabase.from('candidates').select('id, first_name, last_name').order('last_name'),
    supabase.from('companies').select('id, name').order('name'),
    supabase.from('learners').select('id, first_name, last_name').order('last_name'),
  ])
  return [
    ...(candidates ?? []).map((c: { id: string; first_name: string; last_name: string }) => ({ id: c.id, label: `${c.first_name} ${c.last_name}`, type: 'candidate' })),
    ...(companies ?? []).map((c: { id: string; name: string }) => ({ id: c.id, label: c.name, type: 'company' })),
    ...(learners ?? []).map((l: { id: string; first_name: string; last_name: string }) => ({ id: l.id, label: `${l.first_name} ${l.last_name}`, type: 'learner' })),
  ]
}
