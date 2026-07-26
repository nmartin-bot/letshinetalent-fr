import { useState, useEffect } from 'react'
import { File, FileText, X, Download, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PreviewDoc = {
  id: string
  name: string
  file_url: string
  mime_type: string | null
  file_size: number | null
}

export function formatSize(bytes: number | null) {
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

function mimeLabel(mime: string | null) {
  if (!mime) return 'Fichier'
  if (mime === 'application/pdf') return 'PDF'
  if (mime.startsWith('image/')) return mime.split('/')[1]?.toUpperCase() ?? 'Image'
  if (mime.includes('word') || mime.includes('document')) return 'Word'
  if (mime.includes('sheet') || mime.includes('excel')) return 'Excel'
  return 'Fichier'
}

export function DocPreview({ doc }: { doc: PreviewDoc }) {
  const mime = doc.mime_type
  if (mime?.startsWith('image/')) {
    return <img src={doc.file_url} alt={doc.name} className="w-full h-full object-cover" />
  }
  const label = mimeLabel(mime)
  return (
    <span className="text-sm font-semibold text-gray-300 tracking-widest uppercase">{label}</span>
  )
}

export function DocViewer({ doc, onClose }: { doc: PreviewDoc; onClose: () => void }) {
  const isPdf = doc.mime_type === 'application/pdf'
  const isImage = doc.mime_type?.startsWith('image/')
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!isPdf) return
    let url: string
    fetch(doc.file_url)
      .then(r => r.blob())
      .then(b => { url = URL.createObjectURL(b); setBlobUrl(url) })
      .catch(() => setLoadError(true))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [doc.file_url, isPdf])

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="h-14 bg-white/10 backdrop-blur-sm flex items-center justify-between px-6 shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', mimeColor(doc.mime_type))}>
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-white leading-tight">{doc.name}</p>
            <p className="text-[11px] text-white/50">{formatSize(doc.file_size)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={doc.file_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors">
            <Eye className="w-3.5 h-3.5" />Ouvrir
          </a>
          <a href={doc.file_url} download={doc.name}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors">
            <Download className="w-3.5 h-3.5" />Télécharger
          </a>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4" style={{ height: 'calc(100vh - 56px)' }} onClick={e => e.stopPropagation()}>
        {isPdf ? (
          blobUrl ? (
            <iframe src={blobUrl} className="w-full h-full rounded-xl" title={doc.name} />
          ) : loadError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <p className="text-white/60 text-sm">Impossible d'afficher le fichier en prévisualisation.</p>
              <a href={doc.file_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-colors">
                <Eye className="w-4 h-4" />Ouvrir dans un nouvel onglet
              </a>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )
        ) : isImage ? (
          <div className="w-full h-full flex items-center justify-center">
            <img src={doc.file_url} alt={doc.name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="bg-white rounded-2xl p-12 flex flex-col items-center gap-4 shadow-2xl">
              <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center', mimeColor(doc.mime_type))}>
                <File className="w-10 h-10" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">{doc.name}</p>
                <p className="text-sm text-gray-400 mt-1">{formatSize(doc.file_size)} · {mimeLabel(doc.mime_type)}</p>
              </div>
              <a href={doc.file_url} download={doc.name}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors">
                <Download className="w-4 h-4" />Télécharger
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
