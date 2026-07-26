import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useEffect, useRef, useId } from 'react'
import {
  FileText, Eye, Download, Trash2, File, Image, Search,
  Upload, Grid3X3, List, X, ChevronRight, MoreHorizontal,
  Pencil, FolderPlus, Check, Filter,
} from 'lucide-react'
import { useDocuments, loadAllEntities, type Folder as FolderType, type Document as DocumentType, type EntityOption } from '@/hooks/useDocuments'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Modal, { fieldLabel, fieldInput, fieldSelect, FormFooter } from '@/components/shared/Modal'
import HelpTooltip from '@/components/shared/HelpTooltip'
import { DocPreview, DocViewer, formatSize } from '@/components/shared/DocPreview'

export const Route = createFileRoute('/_admin/documents/')({
  component: DocumentsPage,
})

const CATEGORY_LABELS: Record<string, string> = {
  cv: 'CV',
  lettre_motivation: 'Lettre de motivation',
  synthese: 'Synthèse',
  rapport: 'Rapport',
  contrat: 'Contrat',
  autre: 'Autre',
}

const CATEGORY_PILLS: Record<string, string> = {
  cv: 'bg-blue-50 text-blue-700 border-blue-100',
  lettre_motivation: 'bg-violet-50 text-violet-700 border-violet-100',
  synthese: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  rapport: 'bg-orange-50 text-orange-700 border-orange-100',
  contrat: 'bg-rose-50 text-rose-700 border-rose-100',
  autre: 'bg-gray-50 text-gray-600 border-gray-200',
}

const ENTITY_CONFIG: Record<string, { label: string; pill: string }> = {
  candidate: { label: 'Candidat',   pill: 'bg-blue-50 text-blue-700 border-blue-100' },
  company:   { label: 'Entreprise', pill: 'bg-orange-50 text-orange-700 border-orange-100' },
  learner:   { label: 'Apprenant',  pill: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  global:    { label: 'Tout le monde', pill: 'bg-violet-50 text-violet-700 border-violet-100' },
}

const SHARED_SCOPE_CONFIG: Record<string, { label: string; pill: string }> = {
  candidate: { label: 'Tous les candidats', pill: 'bg-blue-50 text-blue-700 border-blue-100' },
  learner:   { label: 'Tous les apprenants', pill: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  global:    { label: 'Tout le monde', pill: 'bg-violet-50 text-violet-700 border-violet-100' },
}

function sharedBadge(doc: DocumentType) {
  if (doc.entity_id !== null) return null
  const cfg = SHARED_SCOPE_CONFIG[doc.entity_type] ?? SHARED_SCOPE_CONFIG.global
  return <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border', cfg.pill)}>⊕ {cfg.label}</span>
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

const NATIVE_ROOT_FOLDERS = ['Documents du client', 'CV', 'Lettre de motivation']
const NATIVE_SUB_FOLDERS = ['Candidats', 'Apprenants']

function isNativeFolder(folder: FolderType, allFolders: FolderType[]): boolean {
  if (NATIVE_ROOT_FOLDERS.includes(folder.name)) return true
  if (NATIVE_SUB_FOLDERS.includes(folder.name)) {
    const parent = allFolders.find(f => f.id === folder.parent_id)
    if (parent && NATIVE_ROOT_FOLDERS.includes(parent.name)) return true
  }
  return false
}

function DocumentsPage() {
  const { documents, folders, loading, uploading, upload, updateDoc, remove, createFolder, renameFolder, removeFolder } = useDocuments()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<DocumentType | null>(null)
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<FolderType | null>(null)
  const [editingDoc, setEditingDoc] = useState<DocumentType | null>(null)
  const [renamingFolder, setRenamingFolder] = useState<FolderType | null>(null)
  const [renameFolderValue, setRenameFolderValue] = useState('')
  const [menuDoc, setMenuDoc] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<DocumentType | null>(null)
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [folderError, setFolderError] = useState<string | null>(null)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())

  useEffect(() => { loadAllEntities().then(setEntities) }, [])

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

  function flattenFolders(parentId: string | null = null, depth = 0): { folder: FolderType; depth: number }[] {
    return folders
      .filter(f => f.parent_id === parentId)
      .flatMap(f => [{ folder: f, depth }, ...flattenFolders(f.id, depth + 1)])
  }

  const breadcrumb = buildBreadcrumb(currentFolderId)
  const currentFolders = folders.filter(f => f.parent_id === currentFolderId)
  const currentDocs = documents.filter(d => {
    if (search) {
      const entity = entities.find(e => e.id === d.entity_id)
      return d.name.toLowerCase().includes(search.toLowerCase()) ||
        (entity?.label ?? '').toLowerCase().includes(search.toLowerCase())
    }
    if (d.folder_id !== currentFolderId) return false
    if (filterCategory && d.category !== filterCategory) return false
    return true
  })

  function toggleFolderCollapse(id: string) {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function renderFolderTree(parentId: string | null = null, depth = 0): React.ReactNode {
    const children = folders.filter(f => f.parent_id === parentId)
    if (!children.length) return null
    return children.map(folder => {
      const hasChildren = folders.some(f => f.parent_id === folder.id)
      const isCollapsed = collapsedFolders.has(folder.id)
      const docCount = documents.filter(d => d.folder_id === folder.id).length
      return (
        <div key={folder.id}>
          <div
            style={{ paddingLeft: `${16 + depth * 12}px`, paddingRight: '8px' }}
            className={cn('flex items-center gap-1 py-1.5 transition-colors group',
              currentFolderId === folder.id ? 'bg-gray-50' : 'hover:bg-gray-50')}>
            {hasChildren ? (
              <button
                onClick={() => toggleFolderCollapse(folder.id)}
                className="shrink-0 p-0.5 text-gray-300 hover:text-gray-500 transition-colors rounded">
                <ChevronRight className={cn('w-3 h-3 transition-transform duration-150', !isCollapsed && 'rotate-90')} />
              </button>
            ) : (
              <div className="w-4 shrink-0" />
            )}
            <button
              onClick={() => setCurrentFolderId(folder.id)}
              className={cn('flex items-center gap-1.5 flex-1 min-w-0 text-xs text-left',
                currentFolderId === folder.id ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-700')}>
              <MacFolder size={14} />
              <span className="flex-1 truncate">{folder.name}</span>
              <span className="text-[10px] text-gray-300 shrink-0">{docCount || ''}</span>
            </button>
            {!isNativeFolder(folder, folders) && (
              <button
                onClick={e => { e.stopPropagation(); setConfirmDeleteFolder(folder) }}
                className="shrink-0 p-0.5 text-gray-200 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
          {!isCollapsed && renderFolderTree(folder.id, depth + 1)}
        </div>
      )
    })
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    setFolderError(null)
    const { error } = await createFolder(newFolderName.trim(), currentFolderId)
    setCreatingFolder(false)
    if (error) {
      setFolderError((error as { message?: string })?.message ?? 'Erreur lors de la création')
    } else {
      setNewFolderName('')
      setShowNewFolder(false)
    }
  }

  return (
    <>
      <PageHeader
        pathItems={[{ label: 'Documents' }]}
        secondBarLeft={
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 w-52 placeholder:text-gray-300" />
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
            <div className="relative">
              <button onClick={() => setShowFilter(v => !v)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                  filterCategory ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                <Filter className="w-3.5 h-3.5" />
                {filterCategory ? CATEGORY_LABELS[filterCategory] : 'Filtrer'}
              </button>
              {showFilter && (
                <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1 min-w-[160px]">
                  <button onClick={() => { setFilterCategory(null); setShowFilter(false) }}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg w-full">
                    Toutes les catégories {!filterCategory && <Check className="w-3 h-3" />}
                  </button>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                    <button key={v} onClick={() => { setFilterCategory(v); setShowFilter(false) }}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg w-full">
                      {l} {filterCategory === v && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-400">{currentDocs.length} document{currentDocs.length !== 1 ? 's' : ''}</span>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setView('grid')} className={cn('p-1.5 rounded-md transition-colors', view === 'grid' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setView('list')} className={cn('p-1.5 rounded-md transition-colors', view === 'list' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <HelpTooltip
              id="documents-page"
              title="Gestionnaire de documents"
              description="Créez des dossiers et sous-dossiers pour organiser vos fichiers. Naviguez via le fil d'Ariane ou la barre latérale."
              visual={
                <div className="space-y-1.5">
                  <div className="flex gap-1 items-center">
                    <MacFolder size={16} />
                    <div className="flex-1 h-1.5 rounded bg-gray-200" />
                  </div>
                  <div className="grid grid-cols-3 gap-1 ml-4">
                    {['red', 'blue', null].map((color, i) => (
                      <div key={i} className={cn('rounded h-6 flex items-center justify-center', color ? `bg-${color}-50` : 'bg-gray-100')}>
                        <div className={cn('w-2.5 h-3 rounded-sm', color ? `bg-${color}-200` : 'bg-gray-200')} />
                      </div>
                    ))}
                  </div>
                </div>
              }
            />
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
            onClick={() => setCurrentFolderId(null)}
            className={cn('flex items-center gap-2 w-full px-4 py-1.5 text-xs transition-colors',
              currentFolderId === null ? 'text-gray-900 font-semibold bg-gray-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
            <MacFolder size={16} />
            Tous les documents
          </button>

          {folders.filter(f => f.parent_id === null).length > 0 && (
            <div className="mt-2">
              {renderFolderTree(null)}
            </div>
          )}

          <div className="mt-3 px-4">
            <button onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <FolderPlus className="w-3 h-3" />Nouveau dossier
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Toolbar / breadcrumb */}
          <div className="flex items-center gap-2 px-6 h-12 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-1 flex-1">
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
          </div>

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
          ) : currentFolders.length === 0 && currentDocs.length === 0 && !search ? (
            <EmptyState
              variant="table"
              title="Dossier vide"
              description="Importez un fichier ou créez un sous-dossier."
              action={{ label: 'Importer un fichier', onClick: () => setShowUpload(true) }}
              ghostOpacity={0.7}
            />
          ) : view === 'grid' ? (
            <div className="flex flex-wrap gap-6 px-6 pt-8 pb-4 content-start items-start">
              {!search && currentFolders.map(folder => (
                <div key={folder.id} className="relative group flex flex-col items-center gap-1.5" style={{ width: 80 }}>
                  <button onClick={() => setCurrentFolderId(folder.id)} className="hover:opacity-80 transition-opacity relative">
                    <MacFolder size={72} />
                    {!isNativeFolder(folder, folders) && (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteFolder(folder) }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:border-red-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </button>
                  {renamingFolder?.id === folder.id ? (
                    <input autoFocus value={renameFolderValue}
                      onChange={e => setRenameFolderValue(e.target.value)}
                      onBlur={async () => { await renameFolder(folder.id, renameFolderValue); setRenamingFolder(null) }}
                      onKeyDown={async e => {
                        if (e.key === 'Enter') { await renameFolder(folder.id, renameFolderValue); setRenamingFolder(null) }
                        if (e.key === 'Escape') setRenamingFolder(null)
                      }}
                      className="text-xs font-medium text-gray-800 text-center bg-transparent border border-blue-400 rounded px-1 py-0.5 outline-none min-w-0"
                      style={{ width: `${Math.max(renameFolderValue.length, 4)}ch` }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      onClick={e => { e.stopPropagation(); setRenamingFolder(folder); setRenameFolderValue(folder.name) }}
                      className="text-xs font-medium text-gray-800 truncate w-full text-center leading-tight cursor-text hover:text-blue-600 transition-colors"
                    >
                      {folder.name}
                    </span>
                  )}
                </div>
              ))}
              {currentDocs.map(doc => {
                const isImage = doc.mime_type?.startsWith('image/')
                const entity = entities.find(e => e.id === doc.entity_id)
                return (
                  <div key={doc.id} onClick={() => setViewingDoc(doc)}
                    className="group relative bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                    style={{ width: 220 }}>
                    <div className="h-28 flex items-center justify-center relative overflow-hidden bg-gray-50 rounded-t-xl">
                      {isImage ? <img src={doc.file_url} alt={doc.name} className="w-full h-full object-cover" /> : <DocPreview doc={doc} />}
                    </div>
                    <button onClick={e => { e.stopPropagation(); setMenuDoc(menuDoc === doc.id ? null : doc.id) }}
                      className="absolute top-2 right-2 p-1 rounded-lg bg-white/80 backdrop-blur-sm text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    {menuDoc === doc.id && (
                      <GridDocMenu doc={doc} onClose={() => setMenuDoc(null)}
                        onRename={() => { setEditingDoc(doc); setMenuDoc(null) }}
                        onDelete={() => { setConfirmDeleteDoc(doc); setMenuDoc(null) }} />
                    )}
                    <div className="border-t border-gray-100 px-3 py-2.5">
                      <p className="text-xs font-medium text-gray-900 truncate leading-tight mb-0.5">{doc.name}</p>
                      <div className="flex items-center justify-between gap-1">
                        {doc.entity_id === null
                          ? sharedBadge(doc)
                          : entity && (
                            <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border truncate max-w-[100px]', ENTITY_CONFIG[entity.type]?.pill ?? 'bg-gray-50 text-gray-600 border-gray-200')}>
                              {entity.label}
                            </span>
                          )}
                        <p className="text-[10px] text-gray-400 ml-auto">{formatSize(doc.file_size)}</p>
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
                      checked={selected.size === currentDocs.length && currentDocs.length > 0}
                      onChange={e => setSelected(e.target.checked ? new Set(currentDocs.map(d => d.id)) : new Set())}
                      className="w-3.5 h-3.5 rounded border-gray-200 accent-gray-900 cursor-pointer" />
                  </th>
                  <th className="text-left pr-4 py-2.5 text-xs font-medium text-gray-400">Nom</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Catégorie</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Entité</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Taille</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Visible</th>
                  <th className="pr-6 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {!search && currentFolders.map(folder => {
                  const count = documents.filter(d => d.folder_id === folder.id).length
                  return (
                    <tr key={folder.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group cursor-pointer"
                      onClick={() => setCurrentFolderId(folder.id)}>
                      <td className="pl-6 pr-3 py-2 w-10" onClick={e => e.stopPropagation()}>
                        <MacFolder size={20} />
                      </td>
                      <td className="pr-4 py-2"><span className="text-xs font-medium text-gray-900">{folder.name}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-400">Dossier</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{count} élément{count !== 1 ? 's' : ''}</td>
                      <td className="px-4 py-3" /><td className="px-4 py-3" /><td className="px-4 py-3" />
                      <td className="pr-6 py-3" onClick={e => e.stopPropagation()}>
                        {!isNativeFolder(folder, folders) && (
                          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setConfirmDeleteFolder(folder)}
                              className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {currentDocs.map(doc => {
                  const Icon = fileIcon(doc.mime_type)
                  const isSelected = selected.has(doc.id)
                  const entity = entities.find(e => e.id === doc.entity_id)
                  return (
                    <tr key={doc.id} onClick={() => setViewingDoc(doc)}
                      className={cn('border-b border-gray-50 transition-colors group cursor-pointer', isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/60')}>
                      <td className="pl-6 pr-3 py-3 w-10" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected}
                          onChange={e => { const n = new Set(selected); e.target.checked ? n.add(doc.id) : n.delete(doc.id); setSelected(n) }}
                          className="w-3.5 h-3.5 rounded border-gray-200 accent-gray-900 cursor-pointer" />
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
                        {doc.category && CATEGORY_PILLS[doc.category] && (
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', CATEGORY_PILLS[doc.category])}>
                            {CATEGORY_LABELS[doc.category]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {doc.entity_id === null
                          ? sharedBadge(doc)
                          : entity && (
                            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', ENTITY_CONFIG[entity.type]?.pill ?? 'bg-gray-50 text-gray-600 border-gray-200')}>
                              {entity.label}
                            </span>
                          )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatSize(doc.file_size)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        {doc.client_visible && <span className="text-[10px] font-semibold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Oui</span>}
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
                          <button onClick={() => setEditingDoc(doc)}
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

      {viewingDoc && <DocViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />}

      {showNewFolder && (
        <Modal title="Nouveau dossier" onClose={() => { setShowNewFolder(false); setFolderError(null) }} size="sm">
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div>
              <label className={fieldLabel}>Nom du dossier</label>
              <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                className={fieldInput} autoFocus placeholder="ex : Contrats" />
            </div>
            {folderError && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">{folderError}</div>
            )}
            <FormFooter onCancel={() => { setShowNewFolder(false); setFolderError(null) }} saving={creatingFolder} label="Créer" />
          </form>
        </Modal>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={upload}
          uploading={uploading}
          defaultFolderId={currentFolderId}
          folders={flattenFolders()}
          entities={entities}
        />
      )}

      {editingDoc && (
        <EditDocModal
          doc={editingDoc}
          folders={flattenFolders()}
          entities={entities}
          onClose={() => setEditingDoc(null)}
          onSave={async fields => { await updateDoc(editingDoc.id, fields); setEditingDoc(null) }}
        />
      )}

      {confirmDeleteDoc && (
        <ConfirmDialog
          title={`Supprimer "${confirmDeleteDoc.name}" ?`}
          description="Ce fichier sera supprimé du stockage et de la base de données."
          confirmLabel="Supprimer" icon={Trash2}
          onConfirm={async () => { await remove(confirmDeleteDoc.id, confirmDeleteDoc.file_url); setConfirmDeleteDoc(null) }}
          onCancel={() => setConfirmDeleteDoc(null)}
        />
      )}

      {confirmDeleteFolder && (
        <ConfirmDialog
          title={`Supprimer le dossier "${confirmDeleteFolder.name}" ?`}
          description="Le dossier et ses sous-dossiers seront supprimés. Les fichiers seront déplacés à la racine."
          confirmLabel="Supprimer" icon={Trash2}
          onConfirm={async () => { await removeFolder(confirmDeleteFolder.id); setConfirmDeleteFolder(null) }}
          onCancel={() => setConfirmDeleteFolder(null)}
        />
      )}

      {confirmBulkDelete && (
        <ConfirmDialog
          title={`Supprimer ${selected.size} document${selected.size > 1 ? 's' : ''} ?`}
          description={`${selected.size} fichier${selected.size > 1 ? 's' : ''} seront définitivement supprimés.`}
          confirmLabel="Supprimer" icon={Trash2}
          onConfirm={async () => {
            const toDelete = documents.filter(d => selected.has(d.id))
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
        <Pencil className="w-3.5 h-3.5" />Modifier
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button onClick={onDelete} className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg w-full">
        <Trash2 className="w-3.5 h-3.5" />Supprimer
      </button>
    </div>
  )
}

type Scope = 'individual' | 'all_candidates' | 'all_learners' | 'global'

const SCOPE_OPTIONS: { value: Scope; label: string; description: string }[] = [
  { value: 'individual',     label: 'Personne spécifique',    description: 'Lié à un candidat, apprenant ou entreprise' },
  { value: 'all_candidates', label: 'Tous les candidats',     description: 'Visible par tous les candidats' },
  { value: 'all_learners',   label: 'Tous les apprenants',    description: 'Visible par tous les apprenants' },
  { value: 'global',         label: 'Tout le monde',          description: 'Visible par tous les utilisateurs' },
]

function UploadModal({ onClose, onUpload, uploading, defaultFolderId, folders, entities }: {
  onClose: () => void
  onUpload: (file: File, meta: { entity_type: string; entity_id?: string | null; category?: string; client_visible?: boolean; folder_id?: string | null; name?: string }) => Promise<{ error: unknown }>
  uploading: boolean
  defaultFolderId: string | null
  folders: { folder: FolderType; depth: number }[]
  entities: EntityOption[]
}) {
  const [scope, setScope] = useState<Scope>('individual')
  const [entityId, setEntityId] = useState('')
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
    setFile(f); setDocName(f.name); setErrorMsg(null)
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
    setPreviewObjectUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    if (scope === 'individual' && !entityId) return
    setErrorMsg(null)
    let entityType: string
    let entityIdValue: string | null
    if (scope === 'individual') {
      const entity = entities.find(e => e.id === entityId)
      if (!entity) return
      entityType = entity.type
      entityIdValue = entityId
    } else {
      entityType = scope === 'all_candidates' ? 'candidate' : scope === 'all_learners' ? 'learner' : 'global'
      entityIdValue = null
    }
    const result = await onUpload(file, {
      entity_type: entityType,
      entity_id: entityIdValue,
      category,
      client_visible: clientVisible,
      folder_id: folderId || null,
      name: docName || file.name,
    })
    if (result.error) {
      setErrorMsg((result.error as { message?: string })?.message ?? JSON.stringify(result.error))
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
            <button onClick={() => { setDone(false); setFile(null); setEntityId(''); setScope('individual') }}
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
    <Modal title="Importer un document" subtitle="Ajoutez un fichier et définissez son audience." onClose={onClose}>
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
                  className="absolute top-2 right-2 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center text-gray-600"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <div className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-gray-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{(file.size / 1024).toFixed(0)} Ko</p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} className="text-gray-300 hover:text-gray-500"><X className="w-3.5 h-3.5" /></button>
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

        <div>
          <label className={fieldLabel}>Audience</label>
          <div className="grid grid-cols-2 gap-1.5">
            {SCOPE_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setScope(opt.value)}
                className={cn('text-left px-3 py-2 rounded-lg border text-xs transition-colors',
                  scope === opt.value
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50')}>
                <p className="font-medium">{opt.label}</p>
                <p className={cn('text-[10px] mt-0.5 leading-tight', scope === opt.value ? 'text-gray-300' : 'text-gray-400')}>{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {scope === 'individual' && (
          <div>
            <label className={fieldLabel}>Entité liée *</label>
            <select required value={entityId} onChange={e => setEntityId(e.target.value)} className={fieldSelect}>
              <option value="">— Choisir —</option>
              {(['candidate', 'company', 'learner'] as const).map(type => {
                const group = entities.filter(e => e.type === type)
                if (!group.length) return null
                return (
                  <optgroup key={type} label={ENTITY_CONFIG[type]?.label ?? type}>
                    {group.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </optgroup>
                )
              })}
            </select>
          </div>
        )}

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
            className="w-3.5 h-3.5 rounded border-gray-200 accent-gray-900" />
          <span className="text-xs text-gray-600">Visible par le client</span>
        </label>

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

function EditDocModal({ doc, folders, entities, onClose, onSave }: {
  doc: DocumentType
  folders: { folder: FolderType; depth: number }[]
  entities: EntityOption[]
  onClose: () => void
  onSave: (fields: { name?: string; entity_type?: string; entity_id?: string; folder_id?: string | null; client_visible?: boolean; category?: string }) => Promise<void>
}) {
  const [name, setName] = useState(doc.name)
  const [entityId, setEntityId] = useState(doc.entity_id ?? '')
  const [folderId, setFolderId] = useState(doc.folder_id ?? '')
  const [clientVisible, setClientVisible] = useState(doc.client_visible ?? false)
  const [category, setCategory] = useState(doc.category ?? 'autre')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const entity = entities.find(e => e.id === entityId)
    await onSave({ name, entity_type: entity?.type, entity_id: entityId || undefined, folder_id: folderId || null, client_visible: clientVisible, category })
    setSaving(false)
  }

  return (
    <Modal title="Modifier le document" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={fieldLabel}>Nom du document</label>
          <input value={name} onChange={e => setName(e.target.value)} className={fieldInput} autoFocus />
        </div>
        <div>
          <label className={fieldLabel}>Entité liée</label>
          <select value={entityId} onChange={e => setEntityId(e.target.value)} className={fieldSelect}>
            <option value="">— Choisir —</option>
            {(['candidate', 'company', 'learner'] as const).map(type => {
              const group = entities.filter(e => e.type === type)
              if (!group.length) return null
              return (
                <optgroup key={type} label={ENTITY_CONFIG[type]?.label ?? type}>
                  {group.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </optgroup>
              )
            })}
          </select>
        </div>
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
            className="w-3.5 h-3.5 rounded border-gray-200 accent-gray-900" />
          <span className="text-xs text-gray-600">Visible par le client</span>
        </label>
        <FormFooter onCancel={onClose} saving={saving} label="Enregistrer" />
      </form>
    </Modal>
  )
}
