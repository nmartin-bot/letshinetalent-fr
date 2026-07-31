import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Download, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/outils/lettre')({
  component: LettreEditor,
})

type LettreData = {
  senderName: string; senderAddress: string; senderEmail: string; senderPhone: string
  recipientName: string; recipientCompany: string; recipientAddress: string
  city: string; date: string
  subject: string
  intro: string; body: string; conclusion: string
  signature: string
}

const EMPTY: LettreData = {
  senderName: '', senderAddress: '', senderEmail: '', senderPhone: '',
  recipientName: '', recipientCompany: '', recipientAddress: '',
  city: '', date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  subject: '',
  intro: '',
  body: '',
  conclusion: '',
  signature: '',
}

const fieldCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white'
const labelCls = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1'

export function LettreEditor() {
  const [lettre, setLettre] = useState<LettreData>(EMPTY)
  const [docId, setDocId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('cover_letters').select('id, data').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle() as { data: { id: string; data: LettreData } | null }
      if (data) { setDocId(data.id); setLettre({ ...EMPTY, ...data.data }) }
    }
    load()
  }, [])

  const save = useCallback(async (data: LettreData) => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    if (docId) {
      await supabase.from('cover_letters').update({ data, updated_at: new Date().toISOString() } as never).eq('id', docId)
    } else {
      const { data: created } = await supabase.from('cover_letters').insert({ user_id: user.id, data } as never).select('id').single() as { data: { id: string } | null }
      if (created) setDocId(created.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [docId])

  function update(patch: Partial<LettreData>) {
    const next = { ...lettre, ...patch }
    setLettre(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(next), 1500)
  }

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #lettre-print-area { display: block !important; position: fixed; inset: 0; background: white; z-index: 9999; }
        }
        #lettre-print-area { display: none; }
      `}</style>
      <div id="lettre-print-area"><LettrePreview lettre={lettre} /></div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-80 shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Lettre de motivation</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Remplissez les champs et prévisualisez en temps réel</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <p className={cn(labelCls, 'mb-2')}>Vos coordonnées</p>
              <div className="space-y-2">
                <div><label className={labelCls}>Nom complet</label><input className={fieldCls} value={lettre.senderName} onChange={e => update({ senderName: e.target.value })} placeholder="Marie Dupont" /></div>
                <div><label className={labelCls}>Adresse</label><input className={fieldCls} value={lettre.senderAddress} onChange={e => update({ senderAddress: e.target.value })} placeholder="12 rue des Lilas, Paris" /></div>
                <div><label className={labelCls}>Email</label><input className={fieldCls} value={lettre.senderEmail} onChange={e => update({ senderEmail: e.target.value })} placeholder="marie@exemple.fr" /></div>
                <div><label className={labelCls}>Téléphone</label><input className={fieldCls} value={lettre.senderPhone} onChange={e => update({ senderPhone: e.target.value })} placeholder="+33 6 00 00 00 00" /></div>
              </div>
            </div>

            <div>
              <p className={cn(labelCls, 'mb-2')}>Destinataire</p>
              <div className="space-y-2">
                <div><label className={labelCls}>Nom du recruteur</label><input className={fieldCls} value={lettre.recipientName} onChange={e => update({ recipientName: e.target.value })} placeholder="Mme Martin" /></div>
                <div><label className={labelCls}>Entreprise</label><input className={fieldCls} value={lettre.recipientCompany} onChange={e => update({ recipientCompany: e.target.value })} placeholder="Acme Corp" /></div>
                <div><label className={labelCls}>Adresse</label><input className={fieldCls} value={lettre.recipientAddress} onChange={e => update({ recipientAddress: e.target.value })} placeholder="5 avenue Montaigne, Paris" /></div>
              </div>
            </div>

            <div>
              <p className={cn(labelCls, 'mb-2')}>En-tête</p>
              <div className="space-y-2">
                <div><label className={labelCls}>Ville</label><input className={fieldCls} value={lettre.city} onChange={e => update({ city: e.target.value })} placeholder="Paris" /></div>
                <div><label className={labelCls}>Date</label><input className={fieldCls} value={lettre.date} onChange={e => update({ date: e.target.value })} /></div>
                <div><label className={labelCls}>Objet</label><input className={fieldCls} value={lettre.subject} onChange={e => update({ subject: e.target.value })} placeholder="Candidature au poste de..." /></div>
              </div>
            </div>

            <div>
              <p className={cn(labelCls, 'mb-2')}>Corps de la lettre</p>
              <div className="space-y-2">
                <div>
                  <label className={labelCls}>Introduction</label>
                  <textarea className={fieldCls} rows={3} value={lettre.intro} onChange={e => update({ intro: e.target.value })} placeholder="Madame, Monsieur, C'est avec un vif intérêt que je vous adresse ma candidature..." />
                </div>
                <div>
                  <label className={labelCls}>Développement</label>
                  <textarea className={fieldCls} rows={6} value={lettre.body} onChange={e => update({ body: e.target.value })} placeholder="Fort de X années d'expérience dans..." />
                </div>
                <div>
                  <label className={labelCls}>Conclusion</label>
                  <textarea className={fieldCls} rows={3} value={lettre.conclusion} onChange={e => update({ conclusion: e.target.value })} placeholder="Aussi, je me tiens disponible pour un entretien..." />
                </div>
                <div>
                  <label className={labelCls}>Formule de politesse</label>
                  <input className={fieldCls} value={lettre.signature} onChange={e => update({ signature: e.target.value })} placeholder="Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées." />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">
              {saving ? 'Enregistrement...' : saved ? <span className="flex items-center gap-1 text-green-500"><Check className="w-3 h-3" />Sauvegardé</span> : 'Sauvegarde auto'}
            </span>
            <button onClick={async () => {
                const { default: html2canvas } = await import('html2canvas')
                const { default: jsPDF } = await import('jspdf')
                const el = document.getElementById('lettre-print-area')
                if (!el) return
                el.style.display = 'block'
                el.style.position = 'absolute'
                el.style.left = '-9999px'
                el.style.top = '0'
                const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
                el.style.display = ''
                el.style.position = ''
                el.style.left = ''
                el.style.top = ''
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
                const pdfW = pdf.internal.pageSize.getWidth()
                const pdfH = pdf.internal.pageSize.getHeight()
                const imgH = (canvas.height * pdfW) / canvas.width
                let y = 0
                let remaining = imgH
                while (remaining > 0) {
                  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, y, pdfW, imgH)
                  remaining -= pdfH
                  if (remaining > 0) { pdf.addPage(); y -= pdfH }
                }
                pdf.save('ma-lettre.pdf')
              }}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Download className="w-3.5 h-3.5" />PDF
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 bg-gray-100 overflow-auto flex items-start justify-center p-8">
          <div className="shadow-xl rounded-sm overflow-hidden" style={{ width: 794, minHeight: 1123, background: 'white' }}>
            <LettrePreview lettre={lettre} />
          </div>
        </div>
      </div>
    </>
  )
}

function LettrePreview({ lettre }: { lettre: LettreData }) {
  return (
    <div style={{ fontFamily: 'Georgia, serif', padding: '60px 72px', fontSize: 12, lineHeight: 1.8, color: '#111827', minHeight: 1123 }}>
      {/* Sender + Recipient */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
        <div style={{ fontSize: 11, color: '#374151' }}>
          {lettre.senderName && <p style={{ fontWeight: 700, fontSize: 13 }}>{lettre.senderName}</p>}
          {lettre.senderAddress && <p>{lettre.senderAddress}</p>}
          {lettre.senderEmail && <p>{lettre.senderEmail}</p>}
          {lettre.senderPhone && <p>{lettre.senderPhone}</p>}
        </div>
        <div style={{ fontSize: 11, color: '#374151', textAlign: 'right' }}>
          {lettre.recipientName && <p style={{ fontWeight: 700, fontSize: 13 }}>{lettre.recipientName}</p>}
          {lettre.recipientCompany && <p>{lettre.recipientCompany}</p>}
          {lettre.recipientAddress && <p>{lettre.recipientAddress}</p>}
        </div>
      </div>

      {/* City + Date */}
      {(lettre.city || lettre.date) && (
        <p style={{ textAlign: 'right', fontSize: 11, color: '#6b7280', marginBottom: 24 }}>
          {[lettre.city, lettre.date].filter(Boolean).join(', le ')}
        </p>
      )}

      {/* Subject */}
      {lettre.subject && (
        <p style={{ fontWeight: 700, marginBottom: 24, fontSize: 12 }}>Objet : {lettre.subject}</p>
      )}

      {/* Body */}
      <div style={{ fontSize: 12 }}>
        {lettre.intro && <p style={{ marginBottom: 16, textAlign: 'justify' }}>{lettre.intro}</p>}
        {lettre.body && <p style={{ marginBottom: 16, textAlign: 'justify', whiteSpace: 'pre-wrap' }}>{lettre.body}</p>}
        {lettre.conclusion && <p style={{ marginBottom: 32, textAlign: 'justify' }}>{lettre.conclusion}</p>}
      </div>

      {/* Sign off */}
      {lettre.signature && (
        <p style={{ marginBottom: 40, fontSize: 12 }}>{lettre.signature}</p>
      )}
      {lettre.senderName && (
        <p style={{ fontWeight: 700, fontSize: 12 }}>{lettre.senderName}</p>
      )}
    </div>
  )
}
