import { useRef, useState, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import {
  Upload, FileText, Trash2, Download, Eye, File, Image,
  Grid3X3, List, Pencil, X, MoreHorizontal, ChevronRight, Home,
} from 'lucide-react'
import { useDocuments, type Folder as FolderType, type Document as DocumentType } from '@/hooks/useDocuments'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EmptyState from '@/components/shared/EmptyState'
import Modal, { fieldLabel, fieldInput, fieldSelect, FormFooter } from '@/components/shared/Modal'
import { DocPreview, DocViewer, formatSize } from '@/components/shared/DocPreview'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS: Record<string, string> = {
  cv: 'CV',
  lettre_motivation: 'Lettre de motivation',
  synthese: 'Synthèse',
  rapport: 'Rapport',
  contrat: 'Contrat',
  autre: 'Autre',
}

function fileIcon(mime: string | null) {
  if (!mime) return File
  if (mime.startsWith('image/')) return Image
  return FileText
}

function mimeColor(mime: string | null) {
  if (!mime) return 'bg-gray-100 text-gray-400'
  if (mime === 'application/pdf') return 'bg-red-50 text-red-400'
  if (mime.startsWith('image/')) return 'bg-violet-50 text-violet-400'
  if (mime.includes('word') || mime.includes('document')) return 'bg-blue-50 text-blue-400'
  if (mime.includes('sheet') || mime.includes('excel')) return 'bg-emerald-50 text-emerald-400'
  return 'bg-gray-100 text-gray-400'
}

function MacFolder({ size = 72 }: { size?: number }) {
  const uid = useId().replace(/:/g, '')
  const w = size
  const h = Math.round(size * 300 / 371)
  return (
    <svg width={w} height={h} viewBox="0 0 371 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter={`url(#f0${uid})`}>
        <path d="M361 209C361 220.046 352.046 229 341 229H30C18.9543 229 10 220.046 10 209V20C10 8.9543 18.9543 0 30 0H109.425C115.192 0 120.678 2.4896 124.476 6.8299L137.024 21.1701C140.822 25.5104 146.308 28 152.075 28H341C352.046 28 361 36.9543 361 48V209Z" fill={`url(#g0${uid})`}/>
      </g>
      <rect x="28.8906" y="44" width="314.214" height="205" rx="17.9039" fill="white"/>
      <g filter={`url(#f1${uid})`}>
        <rect x="10" y="55" width="351" height="229" rx="20" fill={`url(#g1${uid})`}/>
      </g>
      <defs>
        <filter id={`f0${uid}`} x="6" y="-4" width="359" height="237" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dx="4" dy="4"/><feGaussianBlur stdDeviation="2"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3 0"/>
          <feBlend mode="normal" in2="shape" result="e1"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dx="-4" dy="-4"/><feGaussianBlur stdDeviation="2"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.4 0"/>
          <feBlend mode="normal" in2="e1" result="e2"/>
        </filter>
        <filter id={`f1${uid}`} x="0" y="51" width="371" height="249" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="6"/><feGaussianBlur stdDeviation="5"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="shadow"/>
          <feBlend mode="normal" in="SourceGraphic" in2="shadow" result="shape"/>
          <feMorphology radius="3" operator="erode" in="SourceAlpha" result="hardAlpha"/>
          <feOffset dx="4" dy="4"/><feGaussianBlur stdDeviation="2"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3 0"/>
          <feBlend mode="normal" in2="shape" result="e2"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dx="-4" dy="-4"/><feGaussianBlur stdDeviation="2"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.4 0"/>
          <feBlend mode="normal" in2="e2" result="e3"/>
        </filter>
        <linearGradient id={`g0${uid}`} x1="185.5" y1="0" x2="185.5" y2="229" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5EBFEC"/>
          <stop offset="0.250437" stopColor="#30A2DA"/>
        </linearGradient>
        <linearGradient id={`g1${uid}`} x1="185.5" y1="55" x2="185.5" y2="284" gradientUnits="userSpaceOnUse">
          <stop stopColor="#71CFF7"/>
          <stop offset="1" stopColor="#47B1E3"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function DocumentManager({ entityType, entityId, clientMode }: { entityType: string; entityId: string; clientMode?: boolean }) {
  const { documents, folders, loading, uploading, upload, updateDoc, remove, ensureClientFolder } = useDocuments(entityType, entityId)

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [viewingDoc, setViewingDoc] = useState<DocumentType | null>(null)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<DocumentType | null>(null)
  const [editingDoc, setEditingDoc] = useState<DocumentType | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [menuDoc, setMenuDoc] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const relevantFolderIds = new Set(documents.map(d => d.folder_id).filter(Boolean))
  function isFolderRelevant(folderId: string): boolean {
    if (relevantFolderIds.has(folderId)) return true
    return folders.filter(f => f.parent_id === folderId).some(f => isFolderRelevant(f.id))
  }

  function buildBreadcrumb(folderId: string | null): FolderType[] {
    if (!folderId) return []
    const result: FolderType[] = []
    let current = folders.find(f => f.id === folderId)
    while (current) {
      result.unshift(current)
      current = current.parent_id ? folders.find(f => f.id === current!.parent_id) : undefined
    }
    return result
  }

  const breadcrumb = buildBreadcrumb(currentFolderId)
  const currentFolders = folders.filter(f => f.parent_id === currentFolderId && isFolderRelevant(f.id))
  const currentDocs = documents.filter(d => d.folder_id === currentFolderId)

  function flattenFolders(parentId: string | null = null, depth = 0): { folder: FolderType; depth: number }[] {
    return folders
      .filter(f => f.parent_id === parentId)
      .flatMap(f => [{ folder: f, depth }, ...flattenFolders(f.id, depth + 1)])
  }

  const headerSlot = clientMode ? (typeof document !== 'undefined' ? document.getElementById('client-header-slot') : null) : null

  const viewToggle = (
    <div className="flex bg-gray-100 rounded-lg p-0.5">
      <button onClick={() => setView('grid')} className={cn('p-1.5 rounded-md transition-colors', view === 'grid' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
        <Grid3X3 className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => setView('list')} className={cn('p-1.5 rounded-md transition-colors', view === 'list' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
        <List className="w-3.5 h-3.5" />
      </button>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Portal: breadcrumb + view toggle + upload button when clientMode */}
      {clientMode && headerSlot && createPortal(
        <div className="flex items-center gap-3 flex-1">
          {breadcrumb.length > 0 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentFolderId(null)} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
                <Home className="w-3 h-3" />
              </button>
              {breadcrumb.map(f => (
                <div key={f.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                  <button onClick={() => setCurrentFolderId(f.id)} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">{f.name}</button>
                </div>
              ))}
            </div>
          )}
          {viewToggle}
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ml-auto">
            <Upload className="w-3.5 h-3.5" />Ajouter un document
          </button>
        </div>,
        headerSlot
      )}

      {/* Admin header */}
      {!clientMode && (
        <div className="flex items-center justify-between px-6 h-12 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-2">
              <button onClick={() => setCurrentFolderId(null)}
                className={cn('text-xs px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors', !currentFolderId ? 'text-gray-900 font-medium' : 'text-gray-400 hover:text-gray-600')}>
                Accueil
              </button>
              {breadcrumb.map(f => (
                <div key={f.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                  <button onClick={() => setCurrentFolderId(f.id)}
                    className={cn('text-xs px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors',
                      currentFolderId === f.id ? 'text-gray-900 font-medium' : 'text-gray-400 hover:text-gray-600')}>
                    {f.name}
                  </button>
                </div>
              ))}
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Upload className="w-3.5 h-3.5" />Importer
            </button>
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
          {viewToggle}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
      ) : currentFolders.length === 0 && currentDocs.length === 0 ? (
        <EmptyState
          variant="table"
          title="Dossier vide"
          description="Créez un sous-dossier ou importez un fichier."
          action={{ label: 'Importer un fichier', onClick: () => setShowUpload(true) }}
          ghostOpacity={0.7}
        />
      ) : view === 'grid' ? (
        <div className="flex flex-wrap gap-6 px-6 pt-8 pb-4 overflow-y-auto items-start content-start">
          {currentFolders.map(folder => (
            <div key={folder.id} className="flex flex-col items-center gap-1.5" style={{ width: 80 }}>
              <button onClick={() => setCurrentFolderId(folder.id)} className="hover:opacity-80 transition-opacity">
                <MacFolder size={72} />
              </button>
              <span className="text-xs font-medium text-gray-800 truncate w-full text-center leading-tight">
                {folder.name}
              </span>
            </div>
          ))}
          {currentDocs.map(doc => {
            const isImage = doc.mime_type?.startsWith('image/')
            return (
              <div key={doc.id} onClick={() => setViewingDoc(doc)}
                className="group relative bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                style={{ width: 220 }}>
                <div className="h-28 flex items-center justify-center relative overflow-hidden bg-gray-50 rounded-t-xl">
                  {isImage ? <img src={doc.file_url} alt={doc.name} className="w-full h-full object-cover" /> : <DocPreview doc={doc} />}
                </div>
                {!clientMode && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); setMenuDoc(menuDoc === doc.id ? null : doc.id) }}
                      className="absolute top-2 right-2 p-1 rounded-lg bg-white/80 backdrop-blur-sm text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    {menuDoc === doc.id && (
                      <GridDocMenu doc={doc}
                        onClose={() => setMenuDoc(null)}
                        onEdit={() => { setEditingDoc(doc); setMenuDoc(null) }}
                        onDelete={() => { setConfirmDeleteDoc(doc); setMenuDoc(null) }}
                      />
                    )}
                  </>
                )}
                <div className="border-t border-gray-100 px-3 py-2.5">
                  <p className="text-xs font-medium text-gray-900 truncate leading-tight mb-0.5">{doc.name}</p>
                  <p className="text-[10px] text-gray-400">{formatSize(doc.file_size)}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                {!clientMode && (
                  <th className="pl-6 pr-3 py-2.5 w-10">
                    <input type="checkbox"
                      checked={selected.size === currentDocs.length && currentDocs.length > 0}
                      onChange={e => setSelected(e.target.checked ? new Set(currentDocs.map(d => d.id)) : new Set())}
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                  </th>
                )}
                <th className={cn('text-left py-2.5 text-xs font-medium text-gray-400', clientMode ? 'pl-6 pr-4' : 'pr-4')}>Nom</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Catégorie</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Taille</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Date</th>
                <th className="pr-6 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {currentFolders.map(folder => {
                const count = documents.filter(d => d.folder_id === folder.id).length
                return (
                  <tr key={folder.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group cursor-pointer"
                    onClick={() => setCurrentFolderId(folder.id)}>
                    {!clientMode && (
                      <td className="pl-6 pr-3 py-2 w-10" onClick={e => e.stopPropagation()}>
                        <MacFolder size={20} />
                      </td>
                    )}
                    <td className={cn('py-3', clientMode ? 'pl-6 pr-4' : 'pr-4')}>
                      <div className="flex items-center gap-2">
                        {clientMode && <MacFolder size={20} />}
                        <span className="text-xs font-medium text-gray-900">{folder.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">Dossier</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{count} élément{count !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(folder.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="pr-6 py-3" />
                  </tr>
                )
              })}
              {currentDocs.map(doc => {
                const Icon = fileIcon(doc.mime_type)
                const isSelected = selected.has(doc.id)
                return (
                  <tr key={doc.id} onClick={() => setViewingDoc(doc)}
                    className={cn('border-b border-gray-50 transition-colors group cursor-pointer', isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/60')}>
                    {!clientMode && (
                      <td className="pl-6 pr-3 py-3 w-10" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected}
                          onChange={e => { const n = new Set(selected); e.target.checked ? n.add(doc.id) : n.delete(doc.id); setSelected(n) }}
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                      </td>
                    )}
                    <td className={cn('py-3', clientMode ? 'pl-6 pr-4' : 'pr-4')}>
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', mimeColor(doc.mime_type))}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-gray-900 truncate max-w-[180px]">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{doc.category ? (CATEGORY_LABELS[doc.category] ?? doc.category) : <span className="text-gray-300">—</span>}</td>
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
                        {!clientMode && (
                          <>
                            <button onClick={() => setEditingDoc(doc)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setConfirmDeleteDoc(doc)}
                              className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewingDoc && <DocViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={upload}
          uploading={uploading}
          defaultFolderId={currentFolderId}
          entityType={entityType}
          entityId={entityId}
          folders={flattenFolders()}
          clientMode={clientMode}
          ensureClientFolder={ensureClientFolder}
        />
      )}

      {editingDoc && (
        <EditDocModal
          doc={editingDoc}
          entityType={entityType}
          folders={flattenFolders()}
          onClose={() => setEditingDoc(null)}
          onSave={async fields => { await updateDoc(editingDoc.id, fields); setEditingDoc(null) }}
        />
      )}

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

      {confirmBulkDelete && (
        <ConfirmDialog
          title={`Supprimer ${selected.size} document${selected.size > 1 ? 's' : ''} ?`}
          description="Ces fichiers seront définitivement supprimés."
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

function UploadModal({ onClose, onUpload, uploading, defaultFolderId, entityType, entityId, folders, clientMode, ensureClientFolder }: {
  onClose: () => void
  onUpload: (file: File, meta: { entity_type: string; entity_id: string; category?: string; client_visible?: boolean; folder_id?: string | null; name?: string }) => Promise<{ error: unknown }>
  uploading: boolean
  defaultFolderId: string | null
  entityType: string
  entityId: string
  folders: { folder: FolderType; depth: number }[]
  clientMode?: boolean
  ensureClientFolder?: () => Promise<string | null>
}) {
  const [folderId, setFolderId] = useState<string>(defaultFolderId ?? '')
  const [clientVisible, setClientVisible] = useState(false)
  const [category, setCategory] = useState('autre')
  const [file, setFile] = useState<File | null>(null)
  const [docName, setDocName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => { if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl) }
  }, [previewObjectUrl])

  function handleFile(f: File) {
    setFile(f)
    setDocName(f.name)
    setErrorMsg(null)
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
    setPreviewObjectUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setErrorMsg(null)
    let resolvedFolderId: string | null = folderId || null
    if (clientMode && ensureClientFolder) {
      resolvedFolderId = await ensureClientFolder()
    }
    const result = await onUpload(file, {
      entity_type: entityType,
      entity_id: entityId,
      category: clientMode ? 'autre' : (entityType === 'session' ? 'autre' : category),
      client_visible: clientMode ? true : (entityType === 'session' ? false : clientVisible),
      folder_id: clientMode ? resolvedFolderId : (entityType === 'session' ? null : resolvedFolderId),
      name: docName || file.name,
    })
    if (result.error) {
      const err = result.error as { message?: string }
      setErrorMsg(err?.message ?? JSON.stringify(result.error))
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <Modal title="Document importé" subtitle="Votre fichier a été ajouté avec succès." onClose={onClose}>
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5 flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white fill-none stroke-current stroke-2"><polyline points="2,6 5,9 10,3" /></svg>
            </div>
            <p className="text-xs text-emerald-700 font-medium">"{file?.name}" importé avec succès</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setDone(false); setFile(null); setPreviewObjectUrl(null) }}
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
    <Modal title="Importer un document" subtitle="Ajoutez un fichier à cette fiche." onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => inputRef.current?.click()}
          className={cn('border-2 border-dashed rounded-xl cursor-pointer transition-colors overflow-hidden',
            dragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50')}>
          <input ref={inputRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
          {file ? (
            previewObjectUrl ? (
              <div className="relative">
                <img src={previewObjectUrl} alt={file.name} className="w-full max-h-40 object-cover" />
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null); setPreviewObjectUrl(null) }}
                  className="absolute top-2 right-2 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{(file.size / 1024).toFixed(0)} Ko</p>
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

        {file && (
          <div>
            <label className={fieldLabel}>Nom du document</label>
            <input value={docName} onChange={e => setDocName(e.target.value)} className={fieldInput} placeholder={file.name} />
          </div>
        )}

        {!clientMode && entityType !== 'session' && (
          <>
            <div>
              <label className={fieldLabel}>Catégorie</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={fieldSelect}>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className={fieldLabel}>Dossier</label>
              <select value={folderId} onChange={e => setFolderId(e.target.value)} className={fieldSelect}>
                <option value="">— Racine —</option>
                {folders.map(({ folder, depth }) => (
                  <option key={folder.id} value={folder.id}>{'　'.repeat(depth)}{folder.name}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={clientVisible} onChange={e => setClientVisible(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900" />
              <span className="text-xs text-gray-600">Visible par le client</span>
            </label>
          </>
        )}
        {clientMode && (
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Le document sera ajouté dans le dossier <span className="font-medium text-gray-600">Documents du client</span> et visible par votre conseiller.
          </p>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
            <p className="text-xs text-red-600 font-medium">Erreur : {errorMsg}</p>
          </div>
        )}

        <FormFooter onCancel={onClose} saving={uploading} label="Importer" />
      </form>
    </Modal>
  )
}

function GridDocMenu({ doc, onClose, onEdit, onDelete }: {
  doc: { file_url: string; name: string }
  onClose: () => void
  onEdit: () => void
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
      <button onClick={onEdit} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg w-full">
        <Pencil className="w-3.5 h-3.5" />Modifier
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button onClick={onDelete} className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg w-full">
        <Trash2 className="w-3.5 h-3.5" />Supprimer
      </button>
    </div>
  )
}

function EditDocModal({ doc, entityType, folders, onClose, onSave }: {
  doc: DocumentType
  entityType: string
  folders: { folder: FolderType; depth: number }[]
  onClose: () => void
  onSave: (fields: { name?: string; folder_id?: string | null; client_visible?: boolean; category?: string }) => Promise<void>
}) {
  const [name, setName] = useState(doc.name)
  const [folderId, setFolderId] = useState(doc.folder_id ?? '')
  const [clientVisible, setClientVisible] = useState(doc.client_visible ?? false)
  const [category, setCategory] = useState(doc.category ?? 'autre')
  const [saving, setSaving] = useState(false)
  const isSession = entityType === 'session'

  return (
    <Modal title="Modifier le document" onClose={onClose}>
      <form onSubmit={async e => {
        e.preventDefault()
        setSaving(true)
        await onSave({ name, folder_id: isSession ? null : (folderId || null), client_visible: isSession ? false : clientVisible, category: isSession ? 'autre' : category })
        setSaving(false)
      }} className="space-y-4">
        <div>
          <label className={fieldLabel}>Nom du document</label>
          <input value={name} onChange={e => setName(e.target.value)} className={fieldInput} autoFocus required />
        </div>
        {!isSession && (
          <>
            <div>
              <label className={fieldLabel}>Catégorie</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={fieldSelect}>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>Dossier</label>
              <select value={folderId} onChange={e => setFolderId(e.target.value)} className={fieldSelect}>
                <option value="">Racine</option>
                {folders.map(({ folder, depth }) => (
                  <option key={folder.id} value={folder.id}>{'　'.repeat(depth)}{folder.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={clientVisible} onChange={e => setClientVisible(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-gray-900" />
              <span className="text-sm text-gray-700">Visible par le client</span>
            </label>
          </>
        )}
        <FormFooter onCancel={onClose} saving={saving} label="Enregistrer" />
      </form>
    </Modal>
  )
}
