import { useRef, useState, useEffect } from 'react'
import { Upload, FileText, Trash2, Download, Eye, File, Image, Grid3X3, List, Pencil, X, MoreHorizontal, Filter, Check } from 'lucide-react'
import { useDocuments } from '@/hooks/useDocuments'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EmptyState from '@/components/shared/EmptyState'
import Modal, { fieldLabel, fieldInput, FormFooter } from '@/components/shared/Modal'
import { cn } from '@/lib/utils'

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

type Doc = { file_url: string; name: string; mime_type: string | null; file_size?: number | null }

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
        if (isCsv) setCsvRows(text.split('\n').map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, ''))).filter(r => r.some(c => c)))
        else setTextContent(text)
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
      <div className="flex-1 overflow-auto flex items-center justify-center p-6" onClick={e => e.stopPropagation()}>
        {isImage ? (
          <img src={doc.file_url} alt={doc.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        ) : isPdf ? (
          <iframe src={`${doc.file_url}#toolbar=1&navpanes=0`} className="w-full h-full rounded-lg" style={{ border: 'none', minHeight: '80vh' }} title={doc.name} />
        ) : isCsv && csvRows.length > 0 ? (
          <div className="w-full max-w-5xl bg-white rounded-xl overflow-auto shadow-2xl max-h-full">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0">
                <tr className="bg-emerald-50 border-b border-emerald-100">
                  {csvRows[0].map((h, i) => <th key={i} className="text-left px-3 py-2 font-semibold text-emerald-700 whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {csvRows.slice(1).map((row, ri) => (
                  <tr key={ri} className={cn('border-b border-gray-50', ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                    {row.map((cell, ci) => <td key={ci} className="px-3 py-2 text-gray-600 whitespace-nowrap">{cell}</td>)}
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

const ghostBtn = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors'

export default function DocumentManager({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { documents, loading, uploading, upload, rename, remove } = useDocuments(entityType, entityId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [viewingDoc, setViewingDoc] = useState<typeof documents[0] | null>(null)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<typeof documents[0] | null>(null)
  const [renamingDoc, setRenamingDoc] = useState<typeof documents[0] | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [menuDoc, setMenuDoc] = useState<string | null>(null)

  const visible = filterCategory ? documents.filter(d => d.category === filterCategory) : documents

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      await upload(file, { entity_type: entityType, entity_id: entityId, category: filterCategory ?? 'autre' })
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowFilter(v => !v)} className={cn(ghostBtn, filterCategory ? 'border-gray-900 text-gray-900 bg-gray-50' : '')}>
              <Filter className="w-3.5 h-3.5" />
              {filterCategory ? CATEGORY_LABELS[filterCategory] ?? filterCategory : 'Filtrer'}
              {filterCategory && <X className="w-3 h-3 ml-0.5" onClick={e => { e.stopPropagation(); setFilterCategory(null) }} />}
            </button>
            {showFilter && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)} />
                <div className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 min-w-[180px]">
                  <p className="text-xs text-gray-400 uppercase tracking-wide px-2 py-1.5 font-medium">Catégorie</p>
                  {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                    <button key={id} onClick={() => { setFilterCategory(filterCategory === id ? null : id); setShowFilter(false) }}
                      className={cn('flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs hover:bg-gray-50 text-left transition-colors',
                        filterCategory === id ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                      {label}
                      {filterCategory === id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            <Upload className="w-3.5 h-3.5" />{uploading ? 'Envoi...' : 'Importer'}
          </button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          {selected.size > 0 && (
            <>
              <div className="w-px h-4 bg-gray-200" />
              <button onClick={() => setConfirmBulkDelete(true)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors">
                <Trash2 className="w-3.5 h-3.5" />Supprimer ({selected.size})
              </button>
            </>
          )}
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setView('grid')} className={cn('p-1.5 rounded-md transition-colors', view === 'grid' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setView('list')} className={cn('p-1.5 rounded-md transition-colors', view === 'list' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4 px-6">Chargement...</p>
      ) : documents.length === 0 ? (
        <EmptyState
          variant="table"
          title="Aucun document"
          description="Importez un fichier pour le lier à cette fiche."
          action={{ label: 'Importer un fichier', onClick: () => fileRef.current?.click() }}
          ghostOpacity={0.7}
        />
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4 px-6">Aucun document dans cette catégorie</p>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-6 pt-4">
          {visible.map(doc => {
            const isImage = doc.mime_type?.startsWith('image/')
            return (
              <div key={doc.id} onClick={() => setViewingDoc(doc)}
                className="group relative bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                <div className="h-28 flex items-center justify-center relative overflow-hidden bg-gray-50 rounded-t-xl">
                  {isImage ? (
                    <img src={doc.file_url} alt={doc.name} className="w-full h-full object-cover" />
                  ) : (
                    <DocPreview doc={doc} />
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setMenuDoc(menuDoc === doc.id ? null : doc.id) }}
                  className="absolute top-2 right-2 p-1 rounded-lg bg-white/80 backdrop-blur-sm text-gray-500 hover:text-gray-700 hover:bg-white opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                {menuDoc === doc.id && (
                  <GridDocMenu doc={doc}
                    onClose={() => setMenuDoc(null)}
                    onRename={() => { setRenamingDoc(doc); setRenameValue(doc.name); setMenuDoc(null) }}
                    onDelete={() => { setConfirmDeleteDoc(doc); setMenuDoc(null) }}
                  />
                )}
                <div className="border-t border-gray-100 px-3 py-2.5">
                  <p className="text-xs font-medium text-gray-900 truncate leading-tight mb-0.5">{doc.name}</p>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] text-gray-400">{formatSize(doc.file_size)}</p>
                    {doc.category && (
                      <span className="text-[9px] text-gray-400">{CATEGORY_LABELS[doc.category] ?? doc.category}</span>
                    )}
                  </div>
                </div>
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
                  checked={selected.size === visible.length && visible.length > 0}
                  onChange={e => setSelected(e.target.checked ? new Set(visible.map(d => d.id)) : new Set())}
                  className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900 cursor-pointer" />
              </th>
              <th className="text-left pr-4 py-2.5 text-xs font-medium text-gray-400">Nom</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Catégorie</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Taille</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Date</th>
              <th className="pr-6 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visible.map(doc => {
              const Icon = fileIcon(doc.mime_type)
              const isSelected = selected.has(doc.id)
              return (
                <tr key={doc.id} onClick={() => setViewingDoc(doc)}
                  className={cn('border-b border-gray-50 transition-colors group cursor-pointer', isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/60')}>
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
                      <span className="text-xs font-medium text-gray-900 truncate max-w-[180px]">{doc.name}</span>
                    </div>
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

      {/* Viewer */}
      {viewingDoc && <DocViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />}

      {/* Rename */}
      {renamingDoc && (
        <Modal title="Renommer le document" onClose={() => setRenamingDoc(null)}>
          <form onSubmit={async e => { e.preventDefault(); await rename(renamingDoc.id, renameValue); setRenamingDoc(null) }} className="space-y-4">
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
          description="Ces fichiers seront définitivement supprimés du stockage et de la base de données."
          confirmLabel="Supprimer"
          icon={Trash2}
          onConfirm={async () => {
            const toDelete = documents.filter(d => selected.has(d.id))
            await Promise.all(toDelete.map(d => remove(d.id, d.file_url)))
            setSelected(new Set())
            setConfirmBulkDelete(false)
          }}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}
    </div>
  )
}

function GridDocMenu({ doc, onClose, onRename, onDelete }: {
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
    <div ref={ref} className="absolute top-8 right-2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1 min-w-[140px]" onClick={e => e.stopPropagation()}>
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
