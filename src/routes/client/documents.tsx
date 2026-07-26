import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { FileText, Download, Eye, File, Image, Grid3X3, List, Search, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { DocPreview, DocViewer, formatSize } from '@/components/shared/DocPreview'
import type { PreviewDoc } from '@/components/shared/DocPreview'

export const Route = createFileRoute('/client/documents')({
  component: ClientDocuments,
})

type Doc = PreviewDoc & {
  id: string
  category: string | null
  uploaded_at: string
  client_visible?: boolean
  entity_id: string
  entity_type: string
}

const CATEGORY_LABELS: Record<string, string> = {
  cv: 'CV', lettre_motivation: 'Lettre de motivation',
  synthese: 'Synthèse', rapport: 'Rapport', contrat: 'Contrat', autre: 'Autre',
}

function mimeColor(mime: string | null) {
  if (!mime) return 'bg-gray-100 text-gray-400'
  if (mime === 'application/pdf') return 'bg-red-50 text-red-400'
  if (mime.startsWith('image/')) return 'bg-violet-50 text-violet-400'
  if (mime.includes('word') || mime.includes('document')) return 'bg-blue-50 text-blue-400'
  if (mime.includes('sheet') || mime.includes('excel')) return 'bg-emerald-50 text-emerald-400'
  return 'bg-gray-100 text-gray-400'
}

function fileIcon(mime: string | null) {
  if (!mime) return File
  if (mime.startsWith('image/')) return Image
  return FileText
}

function ClientDocuments() {
  const [documents, setDocuments] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [viewingDoc, setViewingDoc] = useState<Doc | null>(null)
  const [menuDoc, setMenuDoc] = useState<string | null>(null)
  const [_entityId, setEntityId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: profile } = await createClient()
        .from('profiles')
        .select('linked_entity_id')
        .eq('id', data.user.id)
        .single() as { data: { linked_entity_id?: string } | null }
      const linkedId = profile?.linked_entity_id
      setEntityId(linkedId ?? null)
      let q = createClient().from('documents').select('*').eq('client_visible', true).order('uploaded_at', { ascending: false })
      if (linkedId) q = q.eq('entity_id', linkedId)
      const { data: docs } = await q
      setDocuments((docs ?? []) as Doc[])
      setLoading(false)
    })
  }, [])

  const filtered = documents.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 h-14 border-b border-gray-100 bg-white px-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Mes documents</p>
          <p className="text-[11px] text-gray-400">Documents partagés par votre conseiller</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
              className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 w-44 placeholder:text-gray-300 bg-gray-50" />
          </div>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView('grid')} className={cn('p-1.5 rounded-md transition-colors', view === 'grid' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600')}>
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setView('list')} className={cn('p-1.5 rounded-md transition-colors', view === 'list' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600')}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <FileText className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-400">
              {documents.length === 0 ? 'Aucun document partagé pour l\'instant.' : 'Aucun résultat pour cette recherche.'}
            </p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-6">
            {filtered.map(doc => {
              const isImage = doc.mime_type?.startsWith('image/')
              return (
                <div key={doc.id} onClick={() => setViewingDoc(doc)}
                  className="group relative bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="h-28 flex items-center justify-center relative overflow-hidden bg-gray-50 rounded-t-xl">
                    {isImage ? <img src={doc.file_url} alt={doc.name} className="w-full h-full object-cover" /> : <DocPreview doc={doc} />}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuDoc(menuDoc === doc.id ? null : doc.id) }}
                    className="absolute top-2 right-2 p-1 rounded-lg bg-white/80 backdrop-blur-sm text-gray-500 hover:text-gray-700 hover:bg-white opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                  {menuDoc === doc.id && (
                    <GridMenu doc={doc} onClose={() => setMenuDoc(null)} />
                  )}
                  <div className="border-t border-gray-100 px-3 py-2.5">
                    <p className="text-xs font-medium text-gray-900 truncate leading-tight mb-0.5">{doc.name}</p>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] text-gray-400">{formatSize(doc.file_size ?? null)}</p>
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
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Catégorie</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Taille</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Date</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => {
                const Icon = fileIcon(doc.mime_type)
                return (
                  <tr key={doc.id} onClick={() => setViewingDoc(doc)}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group cursor-pointer">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', mimeColor(doc.mime_type))}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-gray-900 truncate max-w-[240px]">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {doc.category ? (CATEGORY_LABELS[doc.category] ?? doc.category) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{formatSize(doc.file_size ?? null)}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewingDoc(doc)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a href={doc.file_url} download={doc.name}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {viewingDoc && <DocViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
    </div>
  )
}

function GridMenu({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); onClose() }} />
      <div className="absolute top-8 right-2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1 min-w-[140px]" onClick={e => e.stopPropagation()}>
        <a href={doc.file_url} target="_blank" rel="noreferrer" onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg">
          <Eye className="w-3.5 h-3.5" />Ouvrir
        </a>
        <a href={doc.file_url} download={doc.name} onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg">
          <Download className="w-3.5 h-3.5" />Télécharger
        </a>
      </div>
    </>
  )
}
