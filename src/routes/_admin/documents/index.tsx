import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { FileText, Eye, Download, Trash2, File, Image, Search, ArrowUpDown, Filter, Check, X } from 'lucide-react'
import { useDocuments } from '@/hooks/useDocuments'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'

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

const ENTITY_LABELS: Record<string, string> = {
  company: 'Entreprise',
  candidate: 'Candidat',
  learner: 'Apprenant',
  course: 'Formation',
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

const ghostBtn = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors'

function DocumentsPage() {
  const { documents, loading, remove } = useDocuments()
  const [search, setSearch] = useState('')
  const [filterEntity, setFilterEntity] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'>('date_desc')

  const filtered = [...documents]
    .filter(d => {
      const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase())
      const matchEntity = filterEntity === 'all' || d.entity_type === filterEntity
      const matchCategory = filterCategory === 'all' || d.category === filterCategory
      return matchSearch && matchEntity && matchCategory
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') return b.uploaded_at.localeCompare(a.uploaded_at)
      if (sortBy === 'date_asc') return a.uploaded_at.localeCompare(b.uploaded_at)
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
      return b.name.localeCompare(a.name)
    })

  return (
    <>
      <PageHeader
        pathItems={[{ label: 'Documents' }]}
        secondBarLeft={
          <>
            <div className="relative">
              <button onClick={() => { setShowFilter(v => !v); setShowSort(false) }} className={ghostBtn}>
                <Filter className="w-3.5 h-3.5" />Filtrer
              </button>
              {showFilter && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)} />
                  <div className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 min-w-[200px]">
                    <p className="text-xs text-gray-400 uppercase tracking-wide px-2 py-1.5 font-medium">Type d'entité</p>
                    {([['all', 'Tous'], ...Object.entries(ENTITY_LABELS)] as [string, string][]).map(([v, l]) => (
                      <button key={v} onClick={() => setFilterEntity(v)}
                        className={cn('flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-left transition-colors',
                          filterEntity === v ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                        {l}
                        {filterEntity === v && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 my-1" />
                    <p className="text-xs text-gray-400 uppercase tracking-wide px-2 py-1.5 font-medium">Catégorie</p>
                    {([['all', 'Toutes'], ...Object.entries(CATEGORY_LABELS)] as [string, string][]).map(([v, l]) => (
                      <button key={v} onClick={() => setFilterCategory(v)}
                        className={cn('flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-left transition-colors',
                          filterCategory === v ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                        {l}
                        {filterCategory === v && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button onClick={() => { setShowSort(v => !v); setShowFilter(false) }} className={ghostBtn}>
                <ArrowUpDown className="w-3.5 h-3.5" />Trier
              </button>
              {showSort && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                  <div className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 min-w-[180px]">
                    <p className="text-xs text-gray-400 uppercase tracking-wide px-2 py-1.5 font-medium">Trier par</p>
                    {([['date_desc', 'Plus récent'], ['date_asc', 'Plus ancien'], ['name_asc', 'Nom A → Z'], ['name_desc', 'Nom Z → A']] as const).map(([id, label]) => (
                      <button key={id} onClick={() => { setSortBy(id); setShowSort(false) }}
                        className={cn('flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-left transition-colors',
                          sortBy === id ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                        {label}
                        {sortBy === id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 w-40 placeholder:text-gray-300" />
            </div>
            {filterEntity !== 'all' && (
              <button onClick={() => setFilterEntity('all')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-900 text-white text-xs font-medium hover:bg-gray-700">
                {ENTITY_LABELS[filterEntity]}<X className="w-3 h-3" />
              </button>
            )}
            {filterCategory !== 'all' && (
              <button onClick={() => setFilterCategory('all')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-900 text-white text-xs font-medium hover:bg-gray-700">
                {CATEGORY_LABELS[filterCategory]}<X className="w-3 h-3" />
              </button>
            )}
          </>
        }
        secondBarRight={
          <span className="text-xs text-gray-400">{filtered.length} document{filtered.length > 1 ? 's' : ''}</span>
        }
      />

      {/* Table */}
      <div className="h-full overflow-y-auto px-8 pb-6">
        {loading ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border p-16 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun document trouvé</p>
            <p className="text-sm text-gray-400 mt-1">Les documents sont ajoutés depuis les fiches entreprises, candidats et apprenants.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Nom</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Catégorie</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Entité</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Taille</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(doc => {
                  const Icon = fileIcon(doc.mime_type)
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="font-medium text-gray-900 truncate max-w-xs">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {doc.category ? CATEGORY_LABELS[doc.category] ?? doc.category : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                          doc.entity_type === 'candidate' ? 'bg-blue-100 text-blue-700' :
                          doc.entity_type === 'company' ? 'bg-orange-100 text-orange-700' :
                          doc.entity_type === 'learner' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700')}>
                          {ENTITY_LABELS[doc.entity_type] ?? doc.entity_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{formatSize(doc.file_size)}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        {doc.client_visible && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">Oui</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <a href={doc.file_url} target="_blank" rel="noreferrer"
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50">
                            <Eye className="w-4 h-4" />
                          </a>
                          <a href={doc.file_url} download={doc.name}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
                            <Download className="w-4 h-4" />
                          </a>
                          <button onClick={() => remove(doc.id, doc.file_url)}
                            className="p-1.5 text-gray-300 hover:text-red-500 rounded hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
