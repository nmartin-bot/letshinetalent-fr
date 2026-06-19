import { useRef, useState } from 'react'
import { Upload, FileText, Trash2, Download, Eye, File, Image } from 'lucide-react'
import { useDocuments } from '@/hooks/useDocuments'
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

export default function DocumentManager({
  entityType,
  entityId,
}: {
  entityType: string
  entityId: string
}) {
  const { documents, loading, uploading, upload, remove } = useDocuments(entityType, entityId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState('autre')
  const [clientVisible, setClientVisible] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      await upload(file, { entity_type: entityType, entity_id: entityId, category, client_visible: clientVisible })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Documents</h3>
        <div className="flex items-center gap-2">
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="text-xs border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={clientVisible} onChange={e => setClientVisible(e.target.checked)} className="rounded" />
            Visible client
          </label>
        </div>
      </div>

      {/* Zone drop */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        )}
      >
        <Upload className={cn('w-8 h-8 mx-auto mb-2', dragOver ? 'text-blue-500' : 'text-gray-300')} />
        <p className="text-sm text-gray-500">{uploading ? 'Envoi en cours...' : 'Cliquer ou glisser-déposer un fichier'}</p>
        <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, images...</p>
        <input ref={fileRef} type="file" multiple className="hidden"
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Liste */}
      {loading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Aucun document</p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => {
            const Icon = fileIcon(doc.mime_type)
            return (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 group">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.category && <span className="text-xs text-gray-400">{CATEGORY_LABELS[doc.category] ?? doc.category}</span>}
                    {doc.file_size && <span className="text-xs text-gray-400">{formatSize(doc.file_size)}</span>}
                    {doc.client_visible && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">Visible client</span>}
                    <span className="text-xs text-gray-300">
                      {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={doc.file_url} target="_blank" rel="noreferrer"
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                    <Eye className="w-4 h-4" />
                  </a>
                  <a href={doc.file_url} download={doc.name}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <Download className="w-4 h-4" />
                  </a>
                  <button onClick={() => remove(doc.id, doc.file_url)}
                    className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
