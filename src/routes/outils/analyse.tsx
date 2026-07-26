import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { ScanSearch, Upload, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/outils/analyse')({
  component: AnalyseATS,
})

type ScoreSection = {
  label: string
  score: number
  max: number
  status: 'good' | 'warn' | 'bad'
  feedback: string
  tips: string[]
}

type AnalysisResult = {
  globalScore: number
  sections: ScoreSection[]
  keywords: { found: string[]; missing: string[] }
  summary: string
}

async function extractPdfText(file: File): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
  const buffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: buffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item: { str?: string }) => item.str ?? '').join(' ') + '\n'
  }
  return text.trim()
}

export function AnalyseATS() {
  const [cvText, setCvText] = useState('')
  const [cvFileName, setCvFileName] = useState<string | null>(null)
  const [jobText, setJobText] = useState('')
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setExtracting(true)
    setError(null)
    try {
      let text = ''
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        text = await extractPdfText(file)
      } else {
        text = await file.text()
      }
      setCvText(text)
      setCvFileName(file.name)
    } catch {
      setError('Impossible de lire le fichier. Essayez un PDF ou un fichier texte.')
    }
    setExtracting(false)
  }

  async function handleAnalyse() {
    if (!cvText.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/analyse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv: cvText, job: jobText }),
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json() as AnalysisResult
      setResult(data)
    } catch {
      setError('L\'analyse a échoué. Vérifiez votre connexion ou réessayez.')
    }
    setLoading(false)
  }

  const scoreColor = (s: number) => s >= 70 ? 'text-green-600' : s >= 45 ? 'text-amber-500' : 'text-red-500'
  const statusIcon = (s: 'good' | 'warn' | 'bad') => s === 'good'
    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
    : s === 'warn'
      ? <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
      : <XCircle className="w-4 h-4 text-red-400 shrink-0" />

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analyse ATS</h1>
          <p className="text-sm text-gray-500 mt-1">Importez votre CV pour obtenir un score et des recommandations concrètes.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Votre CV <span className="text-red-400">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {!cvFileName ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                className="w-full rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 transition-colors px-4 py-10 flex flex-col items-center gap-3 text-gray-400 hover:text-gray-600 cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                {extracting
                  ? <><span className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /><span className="text-sm">Lecture du fichier...</span></>
                  : <><Upload className="w-6 h-6" /><span className="text-sm font-medium">Importer votre CV</span><span className="text-xs">PDF, TXT — glissez ou cliquez</span></>
                }
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 bg-gray-50">
                <FileText className="w-5 h-5 text-gray-500 shrink-0" />
                <span className="flex-1 text-sm text-gray-700 truncate">{cvFileName}</span>
                <button onClick={() => { setCvFileName(null); setCvText(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Offre d'emploi ciblée <span className="text-gray-400 font-normal">(optionnel — améliore la précision)</span>
            </label>
            <textarea
              value={jobText}
              onChange={e => setJobText(e.target.value)}
              rows={5}
              placeholder="Collez ici le texte de l'offre d'emploi visée..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            <XCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        <button
          onClick={handleAnalyse}
          disabled={loading || extracting || !cvText.trim()}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
          {loading
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyse en cours...</>
            : <><ScanSearch className="w-4 h-4" />Analyser mon CV</>}
        </button>

        {result && (
          <div className="space-y-5 pt-2">
            {/* Global score */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke={result.globalScore >= 70 ? '#22c55e' : result.globalScore >= 45 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3"
                    strokeDasharray={`${result.globalScore} ${100 - result.globalScore}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn('text-2xl font-bold', scoreColor(result.globalScore))}>{result.globalScore}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Score ATS global</p>
                <p className="text-gray-700 text-sm leading-relaxed">{result.summary}</p>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-2">
              {result.sections.map(section => (
                <div key={section.label} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.label ? null : section.label)}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                    {statusIcon(section.status)}
                    <span className="flex-1 text-sm font-medium text-gray-900">{section.label}</span>
                    <span className={cn('text-sm font-bold', scoreColor(Math.round(section.score / section.max * 100)))}>
                      {section.score}/{section.max}
                    </span>
                    {expandedSection === section.label ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {expandedSection === section.label && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-600">{section.feedback}</p>
                      {section.tips.length > 0 && (
                        <ul className="space-y-1">
                          {section.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                              <span className="text-gray-300 mt-0.5">→</span>{tip}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Keywords */}
            {(result.keywords.found.length > 0 || result.keywords.missing.length > 0) && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mots-clés</p>
                {result.keywords.found.length > 0 && (
                  <div>
                    <p className="text-xs text-green-600 font-medium mb-2">Présents ✓</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords.found.map(k => (
                        <span key={k} className="text-[11px] px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.keywords.missing.length > 0 && (
                  <div>
                    <p className="text-xs text-red-500 font-medium mb-2">À ajouter</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords.missing.map(k => (
                        <span key={k} className="text-[11px] px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
