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

  async function importApplicationDocs(application: Application, entityType: string, entityId: string) {
    const subFolderName = entityType === 'learner' ? 'Apprenants' : 'Candidats'

    // Chercher les sous-dossiers CV/[type] et Lettre de motivation/[type]
    const { data: cvParent } = await (supabase.from('document_folders').select('id').eq('name', 'CV').is('entity_id', null).limit(1).maybeSingle() as unknown as Promise<{ data: { id: string } | null }>)
    const { data: lettreParent } = await (supabase.from('document_folders').select('id').eq('name', 'Lettre de motivation').is('entity_id', null).limit(1).maybeSingle() as unknown as Promise<{ data: { id: string } | null }>)

    const [{ data: cvFolder }, { data: lettreFolder }] = await Promise.all([
      cvParent
        ? (supabase.from('document_folders').select('id').eq('name', subFolderName).eq('parent_id', cvParent.id).maybeSingle() as unknown as Promise<{ data: { id: string } | null }>)
        : Promise.resolve({ data: null }),
      lettreParent
        ? (supabase.from('document_folders').select('id').eq('name', subFolderName).eq('parent_id', lettreParent.id).maybeSingle() as unknown as Promise<{ data: { id: string } | null }>)
        : Promise.resolve({ data: null }),
    ])

    const docs = []
    if (application.cv_url) docs.push({
      entity_type: entityType, entity_id: entityId,
      name: `CV - ${application.first_name} ${application.last_name}`,
      file_url: application.cv_url, category: 'cv', client_visible: true,
      folder_id: cvFolder?.id ?? cvParent?.id ?? null, mime_type: 'application/pdf', file_size: null,
    })
    if (application.cover_letter_url) docs.push({
      entity_type: entityType, entity_id: entityId,
      name: `Lettre de motivation - ${application.first_name} ${application.last_name}`,
      file_url: application.cover_letter_url, category: 'lettre_motivation', client_visible: true,
      folder_id: lettreFolder?.id ?? lettreParent?.id ?? null, mime_type: 'application/pdf', file_size: null,
    })
    if (docs.length > 0) await supabase.from('documents').insert(docs as never)
  }

  async function convertToCandidate(application: Application) {
    const { data: candidate, error } = await supabase
      .from('candidates')
      .insert({ first_name: application.first_name, last_name: application.last_name, email: application.email, phone: application.phone, status: 'active' } as never)
      .select().single() as { data: { id: string } | null; error: unknown }
    if (error || !candidate) return { error }
    await supabase.from('ats_applications').update({ candidate_id: candidate.id, status: 'accepted' } as never).eq('id', application.id)
    setApplications(prev => prev.map(a => a.id === application.id ? { ...a, candidate_id: candidate.id, status: 'accepted' as Application['status'] } : a))
    await importApplicationDocs(application, 'candidate', candidate.id)
    return { data: candidate, error: null }
  }

  async function convertToLearner(application: Application, courseId: string, companyId: string | null = null) {
    const { data: learner, error } = await supabase
      .from('learners')
      .insert({ first_name: application.first_name, last_name: application.last_name, email: application.email, phone: application.phone, training_course_id: courseId, company_id: companyId } as never)
      .select().single() as { data: { id: string } | null; error: unknown }
    if (error || !learner) return { error }
    await supabase.from('ats_applications').update({ learner_id: learner.id, status: 'accepted' } as never).eq('id', application.id)
    setApplications(prev => prev.map(a => a.id === application.id ? { ...a, learner_id: learner.id, status: 'accepted' as Application['status'] } : a))
    await importApplicationDocs(application, 'learner', learner.id)
    return { data: learner, error: null }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('ats_applications').delete().eq('id', id)
    if (!error) setApplications(prev => prev.filter(a => a.id !== id))
    return { error }
  }

  return { applications, loading, refresh: fetch, create, updateStatus, convertToCandidate, convertToLearner, remove }
}
