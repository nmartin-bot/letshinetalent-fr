import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import {
  FileText, Eye, Download, Trash2, File, Image, Search,
  Upload, FolderOpen, Folder, Grid3X3, List, X,
  ChevronRight, MoreHorizontal, Pencil,
} from 'lucide-react'
import { useDocuments, loadAllEntities, type EntityOption } from '@/hooks/useDocuments'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import HelpTooltip from '@/components/shared/HelpTooltip'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Modal, { fieldLabel, fieldInput, fieldSelect, FormFooter } from '@/components/shared/Modal'

export const Route = createFileRoute('/_admin/documents/')({
  component: DocumentsPage,
})

const CATEGORY_LABELS: Record<string, string> = {
  cv: 'CV',
  lettre: 'Lettre de motivation',
  contrat: 'Contrat',
  convention: 'Convention',
  cr: 'Compte-rendu',
  support: 'Support de formation',
  attestation: 'Attestation',
  autre: 'Autre',
}

const ENTITY_CONFIG: Record<string, { label: string; color: string; pill: string }> = {
  candidate: { label: 'Candidats',   color: 'text-blue-600',   pill: 'bg-blue-50 text-blue-700 border-blue-100' },
  company:   { label: 'Entreprises', color: 'text-orange-600', pill: 'bg-orange-50 text-orange-700 border-orange-100' },
  learner:   { label: 'Apprenants',  color: 'text-emerald-600',pill: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  course:    { label: 'Formations',  color: 'text-violet-600', pill: 'bg-violet-50 text-violet-700 border-violet-100' },
}

function fileIcon(mime: string | null) {
  if (!mime) return File
  if (mime.startsWith('image/')) return Image
  return FileText
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function mimeColor(mime: string | null) {
  if (!mime) return 'bg-gray-100 text-gray-400'
  if (mime === 'application/pdf') return 'bg-red-50 text-red-400'
  if (mime.startsWith('image/')) return 'bg-violet-50 text-violet-400'
  if (mime.includes('word') || mime.includes('document')) return 'bg-blue-50 text-blue-400'
  if (mime.includes('sheet') || mime.includes('excel')) return 'bg-emerald-50 text-emerald-400'
  return 'bg-gray-100 text-gray-400'
}

type FolderPath = { type: 'root' } | { type: 'entity'; entityType: string } | { type: 'category'; entityType: string; category: string }

function DocumentsPage() {
  const { documents, loading, uploading, upload, rename, remove } = useDocuments()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [folder, setFolder] = useState<FolderPath>({ type: 'root' })
  const [showUpload, setShowUpload] = useState(false)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<typeof documents[0] | null>(null)
  const [renamingDoc, setRenamingDoc] = useState<typeof documents[0] | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [menuDoc, setMenuDoc] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<typeof documents[0] | null>(null)

  const visibleDocs = documents.filter(d => {
    if (search) return d.name.toLowerCase().includes(search.toLowerCase())
    if (folder.type === 'root') return true
    if (folder.type === 'entity') return d.entity_type === folder.entityType
    return d.entity_type === folder.entityType && d.category === folder.category
  })

  const entityCounts = Object.keys(ENTITY_CONFIG).reduce((acc, t) => {
    acc[t] = documents.filter(d => d.entity_type === t).length
    return acc
  }, {} as Record<string, number>)

  function categoriesFor(entityType: string) {
    const cats = new Set(documents.filter(d => d.entity_type === entityType && d.category).map(d => d.category!))
    return [...cats]
  }

  function breadcrumb() {
    if (folder.type === 'root') return [{ label: 'Tous les documents', action: () => setFolder({ type: 'root' }) }]
    if (folder.type === 'entity') return [
      { label: 'Tous les documents', action: () => setFolder({ type: 'root' }) },
      { label: ENTITY_CONFIG[folder.entityType]?.label ?? folder.entityType, action: () => {} },
    ]
    return [
      { label: 'Tous les documents', action: () => setFolder({ type: 'root' }) },
      { label: ENTITY_CONFIG[folder.entityType]?.label ?? folder.entityType, action: () => setFolder({ type: 'entity', entityType: folder.entityType }) },
      { label: CATEGORY_LABELS[folder.category] ?? folder.category, action: () => {} },
    ]
  }

  return (
    <>
      <PageHeader
        pathItems={[{ label: 'Documents' }]}
        secondBarLeft={
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un document..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 w-56 placeholder:text-gray-300" />
            </div>
            {selected.size > 0 && (
              <>
                <div className="w-px h-4 bg-gray-200" />
                <button onClick={() => setConfirmBulkDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />Supprimer ({selected.size})
                </button>
              </>
            )}
          </>
        }
        secondBarRight={
          <>
            <HelpTooltip
              id="documents-drive"
              title="Drive de documents"
              description="Naviguez dans les dossiers par type d'entité. Uploadez directement un fichier depuis cette page en le liant à un candidat, une entreprise ou un apprenant."
              visual={
                <div className="flex gap-2">
                  <div className="w-16 border-r border-gray-100 space-y-1 pr-2">
                    {['Candidats', 'Entreprises'].map(l => (
                      <div key={l} className="text-[8px] font-medium text-gray-400 flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-sm bg-gray-200" />{l}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-1">
                    {[0,1,2,3].map(i => <div key={i} className="h-6 rounded bg-gray-100 border border-gray-200" />)}
                  </div>
                </div>
              }
            />
            <span className="text-xs text-gray-400">{visibleDocs.length} document{visibleDocs.length > 1 ? 's' : ''}</span>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setView('grid')} className={cn('p-1.5 rounded-md transition-colors', view === 'grid' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setView('list')} className={cn('p-1.5 rounded-md transition-colors', view === 'list' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Upload className="w-3.5 h-3.5" />Importer
            </button>
          </>
        }
      />

      <div className="flex h-full overflow-hidden">
        {/* Sidebar */}
        <div className="w-52 shrink-0 border-r border-gray-100 bg-white overflow-y-auto py-3">
          <button
            onClick={() => setFolder({ type: 'root' })}
            className={cn('flex items-center gap-2 w-full px-4 py-1.5 text-xs transition-colors',
              folder.type === 'root' ? 'text-gray-900 font-semibold bg-gray-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />Tous les documents
          </button>

          <div className="mt-3 px-4 mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Par type</p>
          </div>

          {Object.entries(ENTITY_CONFIG).map(([type, cfg]) => {
            const isActive = folder.type !== 'root' && (folder as { entityType: string }).entityType === type
            const cats = categoriesFor(type)
            return (
              <div key={type}>
                <button
                  onClick={() => setFolder({ type: 'entity', entityType: type })}
                  className={cn('flex items-center gap-2 w-full px-4 py-1.5 text-xs transition-colors',
                    isActive ? 'text-gray-900 font-semibold bg-gray-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
                  {isActive ? <FolderOpen className="w-3.5 h-3.5 shrink-0" /> : <Folder className="w-3.5 h-3.5 shrink-0" />}
                  <span className="flex-1 text-left">{cfg.label}</span>
                  {entityCounts[type] > 0 && <span className="text-[10px] text-gray-400">{entityCounts[type]}</span>}
                </button>
                {isActive && cats.map(cat => (
                  <button key={cat}
                    onClick={() => setFolder({ type: 'category', entityType: type, category: cat })}
                    className={cn('flex items-center gap-2 w-full pl-8 pr-4 py-1 text-xs transition-colors',
                      folder.type === 'category' && (folder as { category: string }).category === cat
                        ? 'text-gray-900 font-medium' : 'text-gray-400 hover:text-gray-600')}>
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    {CATEGORY_LABELS[cat] ?? cat}
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        {/* Main */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Breadcrumb */}
          {!search && (
            <div className="flex items-center gap-1 px-6 pt-6 mb-4">
              {breadcrumb().map((crumb, i, arr) => (
                <div key={i} className="flex items-center gap-1">
                  <button onClick={crumb.action}
                    className={cn('text-xs transition-colors', i < arr.length - 1 ? 'text-gray-400 hover:text-gray-700' : 'text-gray-900 font-medium')}>
                    {crumb.label}
                  </button>
                  {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-400 px-6">Chargement...</p>
          ) : visibleDocs.length === 0 ? (
            <div className="px-6">
              <EmptyState
                variant="table"
                title="Aucun document"
                description="Importez un fichier ou déposez-le directement dans ce dossier."
                action={{ label: 'Importer un fichier', onClick: () => setShowUpload(true) }}
                ghostOpacity={0.7}
              />
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-6 pb-6">
              {visibleDocs.map(doc => {
                const cfg = ENTITY_CONFIG[doc.entity_type]
                const isImage = doc.mime_type?.startsWith('image/')
                return (
                  <div key={doc.id} onClick={() => setViewingDoc(doc)} className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                    {/* Preview area */}
                    <div className="h-32 flex items-center justify-center relative overflow-hidden bg-gray-50">
                      {isImage ? (
                        <img src={doc.file_url} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        <DocPreview doc={doc} />
                      )}
                      {/* Menu button */}
                      <button
                        onClick={e => { e.stopPropagation(); setMenuDoc(menuDoc === doc.id ? null : doc.id) }}
                        className="absolute top-2 right-2 p-1 rounded-lg bg-white/80 backdrop-blur-sm text-gray-500 hover:text-gray-700 hover:bg-white opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Info footer */}
                    <div className="border-t border-gray-100 px-3 py-2.5">
                      <p className="text-xs font-medium text-gray-900 truncate leading-tight mb-0.5">{doc.name}</p>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[10px] text-gray-400">{formatSize(doc.file_size)}</p>
                        {cfg && (
                          <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border', cfg.pill)}>
                            {cfg.label.slice(0, -1)}
                          </span>
                        )}
                      </div>
                    </div>
                    {menuDoc === doc.id && (
                      <DocMenu doc={doc}
                        onClose={() => setMenuDoc(null)}
                        onRename={() => { setRenamingDoc(doc); setRenameValue(doc.name); setMenuDoc(null) }}
                        onDelete={() => { setConfirmDeleteDoc(doc); setMenuDoc(null) }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pl-6 pr-3 py-2.5 w-10">
                    <input type="checkbox"
                      checked={selected.size === visibleDocs.length && visibleDocs.length > 0}
                      onChange={e => setSelected(e.target.checked ? new Set(visibleDocs.map(d => d.id)) : new Set())}
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                  </th>
                  <th className="text-left pr-4 py-2.5 text-xs font-medium text-gray-400">Nom</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Catégorie</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Taille</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Date</th>
                  <th className="pr-6 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {visibleDocs.map(doc => {
                  const Icon = fileIcon(doc.mime_type)
                  const cfg = ENTITY_CONFIG[doc.entity_type]
                  const isSelected = selected.has(doc.id)
                  return (
                    <tr key={doc.id} onClick={() => setViewingDoc(doc)} className={cn('border-b border-gray-50 transition-colors group cursor-pointer', isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/60')}>
                      <td className="pl-6 pr-3 py-3 w-10" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected}
                          onChange={e => {
                            const next = new Set(selected)
                            e.target.checked ? next.add(doc.id) : next.delete(doc.id)
                            setSelected(next)
                          }}
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                      </td>
                      <td className="pr-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', mimeColor(doc.mime_type))}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-medium text-gray-900 truncate max-w-[200px]">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {cfg && <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', cfg.pill)}>{cfg.label.slice(0,-1)}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{doc.category ? CATEGORY_LABELS[doc.category] ?? doc.category : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatSize(doc.file_size)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="pr-6 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={doc.file_url} target="_blank" rel="noreferrer"
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                          <a href={doc.file_url} download={doc.name}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button onClick={() => { setRenamingDoc(doc); setRenameValue(doc.name) }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirmDeleteDoc(doc)}
                            className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
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
      </div>

      {/* Upload modal */}
      {/* Doc viewer */}
      {viewingDoc && (
        <DocViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={upload}
          uploading={uploading}
          defaultEntityType={folder.type !== 'root' ? (folder as { entityType: string }).entityType : undefined}
        />
      )}

      {/* Rename modal */}
      {renamingDoc && (
        <Modal title="Renommer le document" onClose={() => setRenamingDoc(null)}>
          <form onSubmit={async e => {
            e.preventDefault()
            await rename(renamingDoc.id, renameValue)
            setRenamingDoc(null)
          }} className="space-y-4">
            <div>
              <label className={fieldLabel}>Nouveau nom</label>
              <input value={renameValue} onChange={e => setRenameValue(e.target.value)} className={fieldInput} autoFocus />
            </div>
            <FormFooter onCancel={() => setRenamingDoc(null)} saving={false} label="Renommer" />
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmDeleteDoc && (
        <ConfirmDialog
          title={`Supprimer "${confirmDeleteDoc.name}" ?`}
          description="Ce fichier sera supprimé du stockage et de la base de données."
          confirmLabel="Supprimer"
          icon={Trash2}
          onConfirm={async () => { await remove(confirmDeleteDoc.id, confirmDeleteDoc.file_url); setConfirmDeleteDoc(null) }}
          onCancel={() => setConfirmDeleteDoc(null)}
        />
      )}

      {/* Bulk delete confirm */}
      {confirmBulkDelete && (
        <ConfirmDialog
          title={`Supprimer ${selected.size} document${selected.size > 1 ? 's' : ''} ?`}
          description={`${selected.size} fichier${selected.size > 1 ? 's' : ''} seront définitivement supprimés.`}
          confirmLabel="Supprimer"
          icon={Trash2}
          onConfirm={async () => {
            const toDelete = visibleDocs.filter(d => selected.has(d.id))
            await Promise.all(toDelete.map(d => remove(d.id, d.file_url)))
            setSelected(new Set())
            setConfirmBulkDelete(false)
          }}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}
    </>
  )
}

type Doc = { file_url: string; name: string; mime_type: string | null; file_size?: number | null }

function DocViewer({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const isImage = doc.mime_type?.startsWith('image/')
  const isPdf = doc.mime_type === 'application/pdf'
  const isCsv = doc.mime_type === 'text/csv' || doc.name.endsWith('.csv')
  const isText = doc.mime_type?.startsWith('text/') || doc.name.endsWith('.txt')
  const [textContent, setTextContent] = useState<string | null>(null)
  const [csvRows, setCsvRows] = useState<string[][]>([])

  useEffect(() => {
    if (!isCsv && !isText) return
    fetch(doc.file_url)
      .then(r => r.text())
      .then(text => {
        if (isCsv) {
          setCsvRows(text.split('\n').map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, ''))).filter(r => r.some(c => c)))
        } else {
          setTextContent(text)
        }
      })
      .catch(() => {})
  }, [doc.file_url, isCsv, isText])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-900 shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-sm font-medium text-white truncate">{doc.name}</p>
          {doc.file_size && <span className="text-xs text-gray-400 shrink-0">{formatSize(doc.file_size)}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <a href={doc.file_url} download={doc.name}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" />Télécharger
          </a>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6" onClick={e => e.stopPropagation()}>
        {isImage ? (
          <img src={doc.file_url} alt={doc.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        ) : isPdf ? (
          <iframe
            src={`${doc.file_url}#toolbar=1&navpanes=0`}
            className="w-full h-full rounded-lg"
            style={{ border: 'none', minHeight: '80vh' }}
            title={doc.name}
          />
        ) : isCsv && csvRows.length > 0 ? (
          <div className="w-full max-w-5xl bg-white rounded-xl overflow-auto shadow-2xl max-h-full">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0">
                <tr className="bg-emerald-50 border-b border-emerald-100">
                  {csvRows[0].map((h, i) => (
                    <th key={i} className="text-left px-3 py-2 font-semibold text-emerald-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvRows.slice(1).map((row, ri) => (
                  <tr key={ri} className={cn('border-b border-gray-50', ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-gray-600 whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isText && textContent ? (
          <div className="w-full max-w-3xl bg-white rounded-xl p-6 shadow-2xl max-h-full overflow-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{textContent}</pre>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-white/60 text-sm">Aperçu non disponible pour ce format</p>
            <a href={doc.file_url} download={doc.name}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
              <Download className="w-4 h-4" />Télécharger le fichier
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function DocPreview({ doc }: { doc: Doc }) {
  const isCsv = doc.mime_type === 'text/csv' || doc.name.endsWith('.csv')
  const isText = doc.mime_type?.startsWith('text/') || doc.name.endsWith('.txt')
  const [rows, setRows] = useState<string[][]>([])
  const [lines, setLines] = useState<string[]>([])

  useEffect(() => {
    if (!isCsv && !isText) return
    fetch(doc.file_url)
      .then(r => r.text())
      .then(text => {
        if (isCsv) {
          const parsed = text.split('\n').slice(0, 5).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')))
          setRows(parsed.filter(r => r.some(c => c)))
        } else {
          setLines(text.split('\n').slice(0, 8).filter(Boolean))
        }
      })
      .catch(() => {})
  }, [doc.file_url, isCsv, isText])

  if (isCsv && rows.length > 0) {
    const [header, ...body] = rows
    return (
      <div className="w-full h-full overflow-hidden p-2">
        <table className="w-full text-[8px] border-collapse">
          <thead>
            <tr className="bg-emerald-50">
              {header.map((h, i) => (
                <th key={i} className="text-left px-1 py-0.5 font-semibold text-emerald-700 truncate max-w-[60px] border border-emerald-100">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-1 py-0.5 text-gray-500 truncate max-w-[60px] border border-gray-100">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (isText && lines.length > 0) {
    return (
      <div className="w-full h-full overflow-hidden p-3">
        {lines.map((line, i) => (
          <p key={i} className="text-[8px] text-gray-500 truncate leading-relaxed">{line}</p>
        ))}
      </div>
    )
  }

  const ext = doc.name.split('.').pop()?.toUpperCase() ?? '—'

  return (
    <div className="w-full h-full flex items-center justify-center">
      <span className="text-sm font-semibold text-gray-300 tracking-widest">{ext}</span>
    </div>
  )
}

function DocMenu({ doc, onClose, onRename, onDelete }: {
  doc: { file_url: string; name: string }
  onClose: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return (
    <div ref={ref} className="absolute top-8 right-2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1 min-w-[140px]">
      <a href={doc.file_url} target="_blank" rel="noreferrer" onClick={onClose}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg">
        <Eye className="w-3.5 h-3.5" />Ouvrir
      </a>
      <a href={doc.file_url} download={doc.name} onClick={onClose}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg">
        <Download className="w-3.5 h-3.5" />Télécharger
      </a>
      <button onClick={onRename} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg w-full">
        <Pencil className="w-3.5 h-3.5" />Renommer
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button onClick={onDelete} className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg w-full">
        <Trash2 className="w-3.5 h-3.5" />Supprimer
      </button>
    </div>
  )
}

function UploadModal({ onClose, onUpload, uploading, defaultEntityType }: {
  onClose: () => void
  onUpload: (file: File, meta: { entity_type: string; entity_id: string; category?: string }) => Promise<{ error: unknown; data?: unknown }>
  uploading: boolean
  defaultEntityType?: string
}) {
  const [entityType, setEntityType] = useState(defaultEntityType ?? 'candidate')
  const [entityId, setEntityId] = useState('')
  const [category, setCategory] = useState('autre')
  const [file, setFile] = useState<File | null>(null)
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [loadingEntities, setLoadingEntities] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string } | null>(null)
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoadingEntities(true)
    loadAllEntities()
      .then(all => setEntities(all))
      .finally(() => setLoadingEntities(false))
  }, [])

  useEffect(() => {
    return () => { if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl) }
  }, [previewObjectUrl])

  const filteredEntities = entities.filter(e => e.type === entityType)

  function handleFile(f: File) {
    setFile(f)
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      setPreviewObjectUrl(url)
    } else {
      setPreviewObjectUrl(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !entityId) return
    const result = await onUpload(file, { entity_type: entityType, entity_id: entityId, category })
    if (!result.error) {
      setPreview({ url: previewObjectUrl ?? '', name: file.name, mime: file.type })
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  if (preview) {
    return (
      <Modal title="Document importé" subtitle="Votre fichier a été ajouté avec succès." onClose={onClose}>
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white fill-none stroke-current stroke-2">
                <polyline points="2,6 5,9 10,3" />
              </svg>
            </div>
            <p className="text-xs text-emerald-700 font-medium">"{preview.name}" importé et lié avec succès</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setPreview(null); setFile(null); setEntityId('') }}
              className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              Importer un autre
            </button>
            <button onClick={onClose}
              className="flex-1 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors">
              Fermer
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Importer un document" subtitle="Ajoutez un fichier et liez-le à une entité." onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl cursor-pointer transition-colors overflow-hidden',
            dragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
            file ? 'border-gray-300' : ''
          )}>
          <input ref={inputRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
          {file ? (
            previewObjectUrl ? (
              <div className="relative">
                <img src={previewObjectUrl} alt={file.name} className="w-full max-h-40 object-cover" />
                <div className="absolute inset-0 bg-black/20 flex items-end p-2">
                  <span className="text-[10px] text-white font-medium bg-black/40 rounded px-1.5 py-0.5 truncate max-w-full">{file.name}</span>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null); setPreviewObjectUrl(null) }}
                  className="absolute top-2 right-2 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="p-4 flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', mimeColor(file.type))}>
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatSize(file.size)}</p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} className="text-gray-300 hover:text-gray-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          ) : (
            <div className="p-6 text-center">
              <Upload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Glissez un fichier ici ou <span className="text-gray-700 font-medium">parcourir</span></p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>Type d'entité</label>
            <select value={entityType} onChange={e => { setEntityType(e.target.value); setEntityId('') }} className={fieldSelect}>
              {Object.entries(ENTITY_CONFIG).map(([v, cfg]) => <option key={v} value={v}>{cfg.label}</option>)}
            </select>
          </div>
          <div>
            <label className={fieldLabel}>Lier à *</label>
            <select required value={entityId} onChange={e => setEntityId(e.target.value)} className={fieldSelect}
              disabled={loadingEntities}>
              <option value="">{loadingEntities ? 'Chargement...' : '— Choisir —'}</option>
              {filteredEntities.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={fieldLabel}>Catégorie</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={fieldSelect}>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <FormFooter onCancel={onClose} saving={uploading} label="Importer" />
      </form>
    </Modal>
  )
}
