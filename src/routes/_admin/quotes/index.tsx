import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { Plus, FileText, Building2, User, GraduationCap, Pencil, Trash2, Paperclip, X } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Modal, { fieldLabel, fieldInput, fieldSelect, fieldTextarea, FormFooter } from '@/components/shared/Modal'
import { DocViewer } from '@/components/shared/DocPreview'
import { useQuotes } from '@/hooks/useQuotes'
import { loadAllEntities, type EntityOption } from '@/hooks/useDocuments'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_admin/quotes/')({
  component: QuotesPage,
})

const ENTITY_TYPE_CONFIG = {
  company:   { label: 'Entreprise',  icon: Building2,     pill: 'bg-violet-50 text-violet-700 border-violet-100' },
  candidate: { label: 'Candidat',    icon: User,          pill: 'bg-blue-50 text-blue-700 border-blue-100' },
  learner:   { label: 'Apprenant',   icon: GraduationCap, pill: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
} as const

type EntityType = keyof typeof ENTITY_TYPE_CONFIG

const EMPTY_FORM = {
  entity_type: 'company' as EntityType,
  entity_id: '',
  reference: '',
  description: '',
  amount_ht: '',
  amount_ttc: '',
  valid_until: '',
}

const BUCKET = 'documents'

function EntityBadge({ entityType, entityName }: { entityType: string | null; entityName?: string }) {
  if (!entityType || !ENTITY_TYPE_CONFIG[entityType as EntityType]) return <span className="text-gray-300">—</span>
  const cfg = ENTITY_TYPE_CONFIG[entityType as EntityType]
  const Icon = cfg.icon
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border', cfg.pill)}>
        <Icon className="w-2.5 h-2.5" />{cfg.label}
      </span>
      {entityName && <span className="text-xs text-gray-600">{entityName}</span>}
    </span>
  )
}

async function getOrCreateDevisFolder(): Promise<string | null> {
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('document_folders').select('id').eq('name', 'Devis').is('entity_id', null).maybeSingle() as { data: { id: string } | null }
  if (existing) return existing.id
  const { data: created } = await supabase
    .from('document_folders')
    .insert({ name: 'Devis', parent_id: null, entity_type: null, entity_id: null } as never)
    .select('id').single() as { data: { id: string } | null }
  return created?.id ?? null
}

async function uploadAndLinkDoc(file: File, entityType: string, entityId: string, reference: string): Promise<{ docId: string | null; error?: unknown }> {
  const supabase = createClient()
  const folderId = await getOrCreateDevisFolder()
  const safeName = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${entityType}/${entityId}/${Date.now()}_${safeName}`
  const { error: storageError } = await supabase.storage.from(BUCKET).upload(path, file)
  if (storageError) return { docId: null, error: storageError.message }
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const { data, error: dbError } = await supabase.from('documents').insert({
    entity_type: entityType,
    entity_id: entityId,
    folder_id: folderId,
    name: reference ? `Devis ${reference} — ${file.name}` : file.name,
    file_url: publicUrl,
    mime_type: file.type || null,
    file_size: file.size,
    category: 'autre',
    client_visible: false,
  } as never).select('id').single() as { data: { id: string } | null; error: unknown }
  if (dbError) return { docId: null, error: dbError }
  return { docId: data?.id ?? null }
}

function QuotesPage() {
  const { quotes, loading, create, update, remove } = useQuotes()
  const [allEntities, setAllEntities] = useState<EntityOption[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<{ id: string; name: string; file_url: string; mime_type: string | null } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadAllEntities().then(setAllEntities) }, [])

  const entitiesForType = allEntities.filter(e => e.type === form.entity_type)

  function entityName(entityType: string | null, entityId: string | null) {
    if (!entityId) return undefined
    return allEntities.find(e => e.id === entityId)?.label
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setAttachedFile(null)
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(q: ReturnType<typeof useQuotes>['quotes'][0]) {
    setForm({
      entity_type: (q.entity_type as EntityType) ?? 'company',
      entity_id: q.entity_id ?? q.company_id ?? '',
      reference: q.reference ?? '',
      description: q.description ?? '',
      amount_ht: q.amount_ht?.toString() ?? '',
      amount_ttc: q.amount_ttc?.toString() ?? '',
      valid_until: q.valid_until ?? '',
    })
    setAttachedFile(null)
    setEditing(q.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setUploadError(null)

    const values = {
      entity_type: form.entity_type,
      entity_id: form.entity_id || null,
      company_id: form.entity_type === 'company' ? (form.entity_id || null) : null,
      reference: form.reference || null,
      description: form.description || null,
      amount_ht: form.amount_ht ? parseFloat(form.amount_ht) : null,
      amount_ttc: form.amount_ttc ? parseFloat(form.amount_ttc) : null,
      valid_until: form.valid_until || null,
      status: 'draft' as const,
    }

    let quoteId = editing
    if (editing) {
      await update(editing, values as never)
    } else {
      const { data: newQuote, error: createError } = await create(values as never)
      if (createError || !newQuote) {
        setUploadError('Erreur lors de la création du devis.')
        setSaving(false)
        return
      }
      quoteId = newQuote.id
    }

    if (attachedFile && form.entity_id && quoteId) {
      const { docId, error: uploadErr } = await uploadAndLinkDoc(attachedFile, form.entity_type, form.entity_id, form.reference)
      if (uploadErr) {
        setUploadError(`Devis enregistré, mais l'upload a échoué : ${String(uploadErr)}`)
        setSaving(false)
        return
      }
      if (docId) await update(quoteId, { document_id: docId } as never)
    }

    setShowForm(false)
    setSaving(false)
  }

  return (
    <>
      <PageHeader
        pathItems={[{ label: 'Commerce' }, { label: 'Devis' }]}
        secondBarRight={
          <>
            <span className="text-xs text-gray-400">{quotes.length} devis</span>
            <div className="w-px h-4 bg-gray-200" />
            <button onClick={openCreate}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" />Nouveau devis
            </button>
          </>
        }
      />

      <div className="h-full overflow-auto bg-white">
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Chargement...</div>
        ) : quotes.length === 0 ? (
          <EmptyState
            variant="table"
            title="Aucun devis"
            description="Créez vos devis et importez les documents associés."
            action={{ label: 'Nouveau devis', onClick: openCreate }}
            ghostOpacity={0.7}
          />
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pl-6 pr-4 py-2.5 text-xs font-medium text-gray-400">Référence</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Destinataire</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Description</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Montant HT</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Valable jusqu'au</th>
                <th className="pr-6 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {quotes.map(quote => {
                const resolvedEntityType = quote.entity_type ?? (quote.company_id ? 'company' : null)
                const resolvedEntityId = quote.entity_id ?? quote.company_id
                const doc = quote.documents
                return (
                  <tr
                    key={quote.id}
                    onClick={() => doc && setPreviewDoc(doc)}
                    className={cn(
                      'border-b border-gray-50 transition-colors group',
                      doc ? 'cursor-pointer hover:bg-blue-50/30' : 'hover:bg-gray-50/60'
                    )}
                  >
                    <td className="pl-6 pr-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', doc ? 'bg-blue-50' : 'bg-gray-100')}>
                          <FileText className={cn('w-3.5 h-3.5', doc ? 'text-blue-500' : 'text-gray-400')} />
                        </div>
                        <span className="font-medium text-gray-900">
                          {quote.reference ? `#${quote.reference}` : <span className="text-gray-400">—</span>}
                        </span>
                        {doc && <Paperclip className="w-3 h-3 text-gray-300" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <EntityBadge entityType={resolvedEntityType} entityName={entityName(resolvedEntityType, resolvedEntityId)} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">
                      <span className="truncate block">{quote.description ?? <span className="text-gray-300">—</span>}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-900">
                      {quote.amount_ht != null ? (
                        <span>
                          {quote.amount_ht.toLocaleString('fr-FR')} €
                          {quote.amount_ttc != null && <span className="text-gray-400 font-normal ml-1">({quote.amount_ttc.toLocaleString('fr-FR')} TTC)</span>}
                        </span>
                      ) : <span className="text-gray-300 font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {quote.valid_until
                        ? new Date(quote.valid_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="pr-6 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(quote)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(quote.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {previewDoc && (
        <DocViewer
          doc={{ id: previewDoc.id, name: previewDoc.name, file_url: previewDoc.file_url, mime_type: previewDoc.mime_type, file_size: null }}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Supprimer ce devis ?"
          description="Le devis sera définitivement supprimé."
          confirmLabel="Supprimer"
          icon={Trash2}
          onConfirm={async () => { await remove(confirmDeleteId); setConfirmDeleteId(null) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {showForm && (
        <Modal
          title={editing ? 'Modifier le devis' : 'Nouveau devis'}
          subtitle="Rattachez ce devis à une entreprise, un candidat ou un apprenant."
          onClose={() => setShowForm(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={fieldLabel}>Type de destinataire</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(Object.entries(ENTITY_TYPE_CONFIG) as [EntityType, typeof ENTITY_TYPE_CONFIG[EntityType]][]).map(([type, cfg]) => {
                  const Icon = cfg.icon
                  const active = form.entity_type === type
                  return (
                    <button key={type} type="button"
                      onClick={() => setForm(p => ({ ...p, entity_type: type, entity_id: '' }))}
                      className={cn(
                        'flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all',
                        active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      )}>
                      <Icon className="w-4 h-4" />{cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className={fieldLabel}>{ENTITY_TYPE_CONFIG[form.entity_type].label}</label>
              <select value={form.entity_id} onChange={e => setForm(p => ({ ...p, entity_id: e.target.value }))} className={fieldSelect}>
                <option value="">— Sélectionner —</option>
                {entitiesForType.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel}>Référence</label>
                <input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                  placeholder="DEV-2024-001" className={fieldInput} />
              </div>
              <div>
                <label className={fieldLabel}>Valable jusqu'au</label>
                <input type="date" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} className={fieldInput} />
              </div>
            </div>

            <div>
              <label className={fieldLabel}>Description / Objet</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3} placeholder="Formation CPF, coaching bilan de compétences..." className={fieldTextarea} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel}>Montant HT (€)</label>
                <input type="number" step="0.01" value={form.amount_ht} onChange={e => setForm(p => ({ ...p, amount_ht: e.target.value }))}
                  placeholder="0.00" className={fieldInput} />
              </div>
              <div>
                <label className={fieldLabel}>Montant TTC (€)</label>
                <input type="number" step="0.01" value={form.amount_ttc} onChange={e => setForm(p => ({ ...p, amount_ttc: e.target.value }))}
                  placeholder="0.00" className={fieldInput} />
              </div>
            </div>

            {/* Document upload */}
            <div>
              <label className={fieldLabel}>Document devis</label>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg"
                onChange={e => setAttachedFile(e.target.files?.[0] ?? null)} />
              {attachedFile ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50">
                  <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="text-xs text-blue-700 flex-1 truncate">{attachedFile.name}</span>
                  <button type="button" onClick={() => { setAttachedFile(null); if (fileRef.current) fileRef.current.value = '' }}
                    className="text-blue-400 hover:text-blue-600 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors">
                  <Paperclip className="w-3.5 h-3.5" />
                  Joindre un fichier PDF, Word ou image...
                </button>
              )}
            </div>

            {uploadError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{uploadError}</p>
            )}
            <FormFooter onCancel={() => setShowForm(false)} saving={saving} label={editing ? 'Enregistrer' : 'Créer le devis'} />
          </form>
        </Modal>
      )}
    </>
  )
}
