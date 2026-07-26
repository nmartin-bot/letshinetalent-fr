import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, FileText, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/candidature')({
  component: CandidaturePage,
})

const BUCKET = 'documents'

async function uploadFile(file: File, prefix: string): Promise<string | null> {
  const supabase = createClient()
  const safeName = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `applications/${prefix}_${Date.now()}_${safeName}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) return null
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
}

function FileDropzone({
  label,
  file,
  onFile,
  onClear,
}: {
  label: string
  file: File | null
  onFile: (f: File) => void
  onClear: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {file ? (
        <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} Ko</p>
          </div>
          <button type="button" onClick={onClear} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
          onClick={() => ref.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-colors',
            dragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          )}
        >
          <input ref={ref} type="file" className="hidden" accept=".pdf,.doc,.docx,image/*"
            onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }} />
          <Upload className="w-5 h-5 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            Glissez un fichier ou <span className="text-gray-700 font-medium">parcourir</span>
          </p>
          <p className="text-xs text-gray-300 mt-1">PDF, Word ou image · 10 Mo max.</p>
        </div>
      )}
    </div>
  )
}

function CandidaturePage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [cv, setCv] = useState<File | null>(null)
  const [coverLetter, setCoverLetter] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cv) { setError('Veuillez joindre votre CV.'); return }
    setError(null)
    setLoading(true)

    const prefix = `${lastName.toLowerCase()}_${firstName.toLowerCase()}`.replace(/[^a-z]/g, '')

    const [cvUrl, coverLetterUrl] = await Promise.all([
      uploadFile(cv, `cv_${prefix}`),
      coverLetter ? uploadFile(coverLetter, `lettre_${prefix}`) : Promise.resolve(null),
    ])

    if (!cvUrl) {
      setError('Erreur lors de l\'upload du CV. Veuillez réessayer.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: insertError } = await supabase.from('ats_applications').insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      position: position.trim() || null,
      cv_url: cvUrl,
      cover_letter_url: coverLetterUrl,
      source: 'website',
      status: 'new',
    } as never)

    if (insertError) {
      setError('Une erreur est survenue. Veuillez réessayer.')
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Candidature envoyée !</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Votre candidature a bien été reçue. Nous reviendrons vers vous dans les meilleurs délais.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
            <span>Recrutement</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-600 font-medium">Formulaire de candidature</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Déposez votre candidature</h1>
          <p className="text-gray-500 text-sm">Remplissez le formulaire ci-dessous et nous vous recontacterons rapidement.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Identité */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Vos coordonnées</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom <span className="text-red-400">*</span></label>
                <input required value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="Marie"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom <span className="text-red-400">*</span></label>
                <input required value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="Dupont"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse e-mail <span className="text-red-400">*</span></label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="marie.dupont@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro de téléphone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="06 00 00 00 00"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
          </div>

          {/* Poste */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Votre candidature</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Quels sont les postes qui vous intéressent ? <span className="text-red-400">*</span>
              </label>
              <input required value={position} onChange={e => setPosition(e.target.value)}
                placeholder="Ex : Chargé de recrutement, Assistant RH…"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
          </div>

          {/* Fichiers */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Vos documents</h2>
            <FileDropzone label="CV *" file={cv} onFile={setCv} onClear={() => setCv(null)} />
            <FileDropzone label="Lettre de motivation" file={coverLetter} onFile={setCoverLetter} onClear={() => setCoverLetter(null)} />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl text-sm transition-colors">
            {loading ? 'Envoi en cours…' : 'Envoyer ma candidature'}
          </button>

          <p className="text-center text-xs text-gray-400">
            Vos données sont traitées de manière confidentielle et ne seront jamais transmises à des tiers.
          </p>
        </form>
      </div>
    </div>
  )
}
