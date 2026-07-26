import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, ChevronDown, ChevronUp, Check, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/outils/cv')({
  component: CVEditor,
})

type Experience = { id: string; title: string; company: string; period: string; bullets: string[] }
type Education = { id: string; degree: string; school: string; period: string; details: string }

type CVData = {
  firstName: string; lastName: string; jobTitle: string
  photo: string
  email: string; phone: string; address: string; linkedin: string; license: string
  summary: string
  experiences: Experience[]
  educations: Education[]
  softSkills: string[]
  skills: string[]
  tools: string[]
  languages: string[]
  interests: string[]
  layout: 'left' | 'right'
  pages: 1 | 2
  // style
  sidebarBg: string
  sidebarAccent: string
  mainAccent: string
  fontFamily: string
}

type Theme = { id: string; label: string; sidebarBg: string; sidebarAccent: string; mainAccent: string; fontFamily: string }

const THEMES: Theme[] = [
  { id: 'ocean',    label: 'Océan',    sidebarBg: '#1e3a8a', sidebarAccent: '#60a5fa', mainAccent: '#1a56e8', fontFamily: 'Arial, sans-serif' },
  { id: 'ardoise',  label: 'Ardoise',  sidebarBg: '#1f2937', sidebarAccent: '#9ca3af', mainAccent: '#374151', fontFamily: 'Arial, sans-serif' },
  { id: 'foret',    label: 'Forêt',    sidebarBg: '#14532d', sidebarAccent: '#86efac', mainAccent: '#16a34a', fontFamily: 'Georgia, serif' },
  { id: 'bordeaux', label: 'Bordeaux', sidebarBg: '#7f1d1d', sidebarAccent: '#fca5a5', mainAccent: '#dc2626', fontFamily: 'Arial, sans-serif' },
  { id: 'lilas',    label: 'Lilas',    sidebarBg: '#4c1d95', sidebarAccent: '#c4b5fd', mainAccent: '#7c3aed', fontFamily: 'Georgia, serif' },
  { id: 'sable',    label: 'Sable',    sidebarBg: '#57534e', sidebarAccent: '#d4c5a9', mainAccent: '#a16207', fontFamily: 'Georgia, serif' },
]

const FONTS = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: "'Times New Roman', serif", label: 'Times New Roman' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: "'Trebuchet MS', sans-serif", label: 'Trebuchet' },
]

const EMPTY: CVData = {
  firstName: '', lastName: '', jobTitle: '',
  photo: '',
  email: '', phone: '', address: '', linkedin: '', license: '',
  summary: '',
  experiences: [{ id: crypto.randomUUID(), title: '', company: '', period: '', bullets: [''] }],
  educations: [{ id: crypto.randomUUID(), degree: '', school: '', period: '', details: '' }],
  softSkills: [''],
  skills: [''],
  tools: [''],
  languages: [''],
  interests: [''],
  layout: 'right',
  pages: 1,
  sidebarBg: '#1e3a8a',
  sidebarAccent: '#60a5fa',
  mainAccent: '#1a56e8',
  fontFamily: 'Arial, sans-serif',
}

type Tab = 'infos' | 'parcours' | 'style' | 'mise_en_page'

const fieldCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white'
const labelCls = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1'

function uid() { return crypto.randomUUID() }


export function CVEditor() {
  const [cv, setCv] = useState<CVData>(EMPTY)
  const [tab, setTab] = useState<Tab>('infos')
  const [docId, setDocId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [mounted, setMounted] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Load existing CV
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('cv_documents').select('id, data').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle() as { data: { id: string; data: CVData } | null }
      if (data) { setDocId(data.id); setCv({ ...EMPTY, ...data.data }) }
    }
    load()
  }, [])

  const save = useCallback(async (data: CVData) => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    if (docId) {
      await supabase.from('cv_documents').update({ data, updated_at: new Date().toISOString() } as never).eq('id', docId)
    } else {
      const { data: created } = await supabase.from('cv_documents').insert({ user_id: user.id, data } as never).select('id').single() as { data: { id: string } | null }
      if (created) setDocId(created.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [docId])

  function update(patch: Partial<CVData>) {
    const next = { ...cv, ...patch }
    setCv(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(next), 1500)
  }


  const TABS: { id: Tab; label: string }[] = [
    { id: 'infos', label: 'Infos' },
    { id: 'parcours', label: 'Parcours' },
    { id: 'style', label: 'Style' },
    { id: 'mise_en_page', label: 'Mise en page' },
  ]

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #cv-print-area { display: block !important; position: fixed; inset: 0; background: white; z-index: 9999; }
        }
        #cv-print-area { display: none; }
      `}</style>

      {/* Hidden print area */}
      <div id="cv-print-area">
        <CVPreview cv={cv} />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-80 shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-2 pt-2 gap-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn('px-3 py-2 text-xs font-medium rounded-t-lg transition-colors',
                  tab === t.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800')}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {tab === 'infos' && <InfosTab cv={cv} update={update} />}
            {tab === 'parcours' && <ParcoursTab cv={cv} update={update} />}
            {tab === 'style' && <StyleTab cv={cv} update={update} />}
            {tab === 'mise_en_page' && <MiseEnPageTab cv={cv} update={update} />}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-end">
            <span className="text-[10px] text-gray-400">
              {saving ? 'Enregistrement...' : saved ? <span className="flex items-center gap-1 text-green-500"><Check className="w-3 h-3" />Sauvegardé</span> : 'Sauvegarde auto'}
            </span>
          </div>
        </div>

        {/* Right panel — preview */}
        <div className="flex-1 bg-gray-100 overflow-auto flex items-start justify-center p-8">
          <div className="cv-preview-shell shadow-xl rounded-sm overflow-hidden" style={{ width: 794, minHeight: 1123, background: 'white' }}>
            <CVPreview cv={cv} />
          </div>
        </div>
      </div>
    </>
  )
}

/* ──────────────────── TABS ──────────────────── */

function InfosTab({ cv, update }: { cv: CVData; update: (p: Partial<CVData>) => void }) {
  return (
    <div className="space-y-5">
      <Section title="En-tête">
        <div className="flex gap-3 items-start mb-3">
          <div className="shrink-0">
            <label className={labelCls}>Photo</label>
            <label className="cursor-pointer block">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-200 hover:border-gray-400 flex items-center justify-center overflow-hidden transition-colors bg-gray-50">
                {cv.photo
                  ? <img src={cv.photo} alt="photo" className="w-full h-full object-cover" />
                  : <span className="text-[10px] text-gray-400 text-center leading-tight px-1">Ajouter</span>}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = ev => update({ photo: ev.target?.result as string })
                reader.readAsDataURL(file)
              }} />
            </label>
            {cv.photo && <button onClick={() => update({ photo: '' })} className="text-[10px] text-red-400 hover:text-red-600 mt-1 block text-center w-full">Supprimer</button>}
          </div>
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>Prénom</label><input className={fieldCls} value={cv.firstName} onChange={e => update({ firstName: e.target.value })} placeholder="Marie" /></div>
              <div><label className={labelCls}>Nom</label><input className={fieldCls} value={cv.lastName} onChange={e => update({ lastName: e.target.value })} placeholder="Dupont" /></div>
            </div>
            <div><label className={labelCls}>Poste recherché</label><input className={fieldCls} value={cv.jobTitle} onChange={e => update({ jobTitle: e.target.value })} placeholder="Chargé de projet" /></div>
          </div>
        </div>
      </Section>
      <Section title="Coordonnées">
        <div className="space-y-2">
          {([['email', 'Email', 'marie@exemple.fr'], ['phone', 'Téléphone', '+33 6 00 00 00 00'], ['address', 'Ville', 'Paris, 75001'], ['linkedin', 'LinkedIn', 'linkedin.com/in/...'], ['license', 'Permis', 'Permis B']] as [keyof CVData, string, string][]).map(([key, label, placeholder]) => (
            <div key={key}><label className={labelCls}>{label}</label><input className={fieldCls} value={cv[key] as string} onChange={e => update({ [key]: e.target.value })} placeholder={placeholder} /></div>
          ))}
        </div>
      </Section>
      <Section title="Accroche / Profil">
        <textarea className={fieldCls} rows={4} value={cv.summary} onChange={e => update({ summary: e.target.value })} placeholder="Étudiant dynamique et motivé..." />
      </Section>
      <Section title="Atouts personnalité">
        <TagList items={cv.softSkills} onChange={v => update({ softSkills: v })} placeholder="Ex : Rigueur" />
      </Section>
      <Section title="Compétences">
        <TagList items={cv.skills} onChange={v => update({ skills: v })} placeholder="Ex : Gestion de projet" />
      </Section>
      <Section title="Logiciels">
        <TagList items={cv.tools} onChange={v => update({ tools: v })} placeholder="Ex : Excel – Avancé" />
      </Section>
      <Section title="Langues">
        <TagList items={cv.languages} onChange={v => update({ languages: v })} placeholder="Ex : Anglais – B2" />
      </Section>
      <Section title="Centres d'intérêt">
        <TagList items={cv.interests} onChange={v => update({ interests: v })} placeholder="Ex : Lecture" />
      </Section>
    </div>
  )
}

function ParcoursTab({ cv, update }: { cv: CVData; update: (p: Partial<CVData>) => void }) {
  function addExp() {
    update({ experiences: [...cv.experiences, { id: uid(), title: '', company: '', period: '', bullets: [''] }] })
  }
  function removeExp(id: string) { update({ experiences: cv.experiences.filter(e => e.id !== id) }) }
  function updateExp(id: string, patch: Partial<Experience>) {
    update({ experiences: cv.experiences.map(e => e.id === id ? { ...e, ...patch } : e) })
  }

  function addEdu() {
    update({ educations: [...cv.educations, { id: uid(), degree: '', school: '', period: '', details: '' }] })
  }
  function removeEdu(id: string) { update({ educations: cv.educations.filter(e => e.id !== id) }) }
  function updateEdu(id: string, patch: Partial<Education>) {
    update({ educations: cv.educations.map(e => e.id === id ? { ...e, ...patch } : e) })
  }

  return (
    <div className="space-y-5">
      <Section title="Expériences professionnelles">
        <div className="space-y-4">
          {cv.experiences.map((exp, i) => (
            <div key={exp.id} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-400 uppercase">Expérience {i + 1}</span>
                {cv.experiences.length > 1 && (
                  <button onClick={() => removeExp(exp.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <input className={fieldCls} value={exp.title} onChange={e => updateExp(exp.id, { title: e.target.value })} placeholder="Nom du poste" />
              <input className={fieldCls} value={exp.company} onChange={e => updateExp(exp.id, { company: e.target.value })} placeholder="Entreprise" />
              <input className={fieldCls} value={exp.period} onChange={e => updateExp(exp.id, { period: e.target.value })} placeholder="Ex : Jan 2022 – Déc 2023" />
              <div className="space-y-1">
                <label className={labelCls}>Détails (une ligne par tâche)</label>
                {exp.bullets.map((b, bi) => (
                  <div key={bi} className="flex gap-1">
                    <input className={fieldCls} value={b} onChange={e => {
                      const bullets = [...exp.bullets]; bullets[bi] = e.target.value; updateExp(exp.id, { bullets })
                    }} placeholder={`Tâche ${bi + 1}`} />
                    {exp.bullets.length > 1 && (
                      <button onClick={() => { const bullets = exp.bullets.filter((_, j) => j !== bi); updateExp(exp.id, { bullets }) }} className="text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => updateExp(exp.id, { bullets: [...exp.bullets, ''] })}
                  className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-1">
                  <Plus className="w-3 h-3" />Ajouter une ligne
                </button>
              </div>
            </div>
          ))}
          <button onClick={addExp} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-dashed border-gray-200 rounded-xl px-3 py-2 w-full justify-center hover:border-gray-300 transition-colors">
            <Plus className="w-3.5 h-3.5" />Ajouter une expérience
          </button>
        </div>
      </Section>

      <Section title="Formations">
        <div className="space-y-4">
          {cv.educations.map((edu, i) => (
            <div key={edu.id} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-400 uppercase">Formation {i + 1}</span>
                {cv.educations.length > 1 && (
                  <button onClick={() => removeEdu(edu.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <input className={fieldCls} value={edu.degree} onChange={e => updateEdu(edu.id, { degree: e.target.value })} placeholder="Nom du diplôme" />
              <input className={fieldCls} value={edu.school} onChange={e => updateEdu(edu.id, { school: e.target.value })} placeholder="École / Université" />
              <input className={fieldCls} value={edu.period} onChange={e => updateEdu(edu.id, { period: e.target.value })} placeholder="Ex : 2020 – 2022" />
              <textarea className={fieldCls} rows={2} value={edu.details} onChange={e => updateEdu(edu.id, { details: e.target.value })} placeholder="Spécialité, mention, modules clés..." />
            </div>
          ))}
          <button onClick={addEdu} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-dashed border-gray-200 rounded-xl px-3 py-2 w-full justify-center hover:border-gray-300 transition-colors">
            <Plus className="w-3.5 h-3.5" />Ajouter une formation
          </button>
        </div>
      </Section>
    </div>
  )
}

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)) }
  return '#' + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

function hexToHsv(hex: string): [number, number, number] {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return [0, 0, 0.1]
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return [Math.round(h), max ? d / max : 0, max]
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [popPos, setPopPos] = useState({ top: 0, left: 0 })
  const [hue, setHue] = useState(0)
  const [sat, setSat] = useState(0)
  const [bri, setBri] = useState(1)
  const [hexInput, setHexInput] = useState(value)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'canvas' | 'hue' | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Sync from prop
  useEffect(() => {
    const [h, s, v] = hexToHsv(value)
    setHue(h); setSat(s); setBri(v); setHexInput(value)
  }, [value])

  // Mouse drag handlers
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragging.current === 'canvas' && canvasRef.current) {
        const r = canvasRef.current.getBoundingClientRect()
        const s = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
        const v = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height))
        setSat(s); setBri(v)
        const hex = hsvToHex(hue, s, v)
        setHexInput(hex); onChange(hex)
      }
      if (dragging.current === 'hue' && hueRef.current) {
        const r = hueRef.current.getBoundingClientRect()
        const h = Math.max(0, Math.min(360, ((e.clientX - r.left) / r.width) * 360))
        setHue(h)
        const hex = hsvToHex(h, sat, bri)
        setHexInput(hex); onChange(hex)
      }
    }
    function onUp() { dragging.current = null }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [hue, sat, bri, onChange])

  // Click-outside close
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (popoverRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleOpen() {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setPopPos({
      top: r.bottom + window.scrollY + 8,
      left: Math.max(8, r.right + window.scrollX - 224),
    })
    setOpen(v => !v)
  }

  function handleCanvasDown(e: React.MouseEvent) {
    dragging.current = 'canvas'
    const r = canvasRef.current!.getBoundingClientRect()
    const s = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    const v = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height))
    setSat(s); setBri(v)
    const hex = hsvToHex(hue, s, v)
    setHexInput(hex); onChange(hex)
  }

  function handleHueDown(e: React.MouseEvent) {
    dragging.current = 'hue'
    const r = hueRef.current!.getBoundingClientRect()
    const h = Math.max(0, Math.min(360, ((e.clientX - r.left) / r.width) * 360))
    setHue(h)
    const hex = hsvToHex(h, sat, bri)
    setHexInput(hex); onChange(hex)
  }

  function handleHexInput(v: string) {
    setHexInput(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      const [h, s, bv] = hexToHsv(v)
      setHue(h); setSat(s); setBri(bv); onChange(v)
    }
  }

  const pureHue = `hsl(${hue}, 100%, 50%)`
  const cursorX = sat * 100
  const cursorY = (1 - bri) * 100

  return (
    <>
      <button ref={triggerRef} onClick={handleOpen}
        className="w-8 h-8 rounded-lg border-2 border-white shadow-md ring-1 ring-gray-200 shrink-0 transition-transform hover:scale-105"
        style={{ background: value }} />

      {open && mounted && createPortal(
        <div ref={popoverRef} className="absolute z-[999] bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 select-none" style={{ top: popPos.top, left: popPos.left, width: 224 }}>
          {/* 2D canvas */}
          <div ref={canvasRef} onMouseDown={handleCanvasDown}
            className="relative rounded-xl overflow-hidden cursor-crosshair mb-3"
            style={{ height: 150, background: pureHue }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff, transparent)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, #000)' }} />
            {/* Cursor */}
            <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${cursorX}%`, top: `${cursorY}%`, background: value }} />
          </div>

          {/* Hue slider */}
          <div ref={hueRef} onMouseDown={handleHueDown}
            className="relative h-3 rounded-full cursor-pointer mb-3"
            style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}>
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{ left: `${(hue / 360) * 100}%`, transform: 'translate(-50%, -50%)', background: pureHue }} />
          </div>

          {/* Hex input */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus-within:ring-2 focus-within:ring-gray-300">
            <div className="w-4 h-4 rounded-md shrink-0 border border-gray-200" style={{ background: value }} />
            <input value={hexInput} onChange={e => handleHexInput(e.target.value)}
              className="flex-1 text-xs font-mono bg-transparent outline-none text-gray-700 uppercase tracking-wider"
              maxLength={7} placeholder="#000000" />
          </div>
        </div>
      , document.body)}
    </>
  )
}

function StyleTab({ cv, update }: { cv: CVData; update: (p: Partial<CVData>) => void }) {
  function applyTheme(t: Theme) {
    update({ sidebarBg: t.sidebarBg, sidebarAccent: t.sidebarAccent, mainAccent: t.mainAccent, fontFamily: t.fontFamily })
  }

  const activeTheme = THEMES.find(t =>
    t.sidebarBg === cv.sidebarBg && t.sidebarAccent === cv.sidebarAccent && t.mainAccent === cv.mainAccent
  )?.id

  return (
    <div className="space-y-6">
      {/* Thèmes */}
      <Section title="Modèles">
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => applyTheme(t)}
              className={cn('rounded-xl border overflow-hidden transition-all',
                activeTheme === t.id ? 'border-gray-300' : 'border-transparent hover:border-gray-200')}>
              {/* Mini preview */}
              <div style={{ background: t.sidebarBg, height: 36, display: 'flex', alignItems: 'flex-end', padding: '0 6px 4px' }}>
                <div style={{ width: 20, height: 20, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
                <div style={{ flex: 1, marginLeft: 5 }}>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.9)', borderRadius: 2, marginBottom: 2 }} />
                  <div style={{ height: 3, background: t.sidebarAccent, borderRadius: 2, width: '60%' }} />
                </div>
              </div>
              <div style={{ background: '#f9fafb', padding: '4px 6px' }}>
                <div style={{ height: 2, background: t.mainAccent, borderRadius: 1, width: '50%', marginBottom: 2 }} />
                <div style={{ height: 2, background: '#e5e7eb', borderRadius: 1, marginBottom: 2 }} />
                <div style={{ height: 2, background: '#e5e7eb', borderRadius: 1, width: '70%' }} />
              </div>
              <p className="text-[10px] font-medium text-gray-600 py-1 bg-white text-center">{t.label}</p>
            </button>
          ))}
        </div>
      </Section>

      {/* Couleurs manuelles */}
      <Section title="Couleurs">
        <div className="space-y-3">
          {([
            ['sidebarBg', 'Fond de la colonne'],
            ['sidebarAccent', 'Titres de la colonne'],
            ['mainAccent', 'Titres du contenu'],
          ] as [keyof CVData, string][]).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <label className={labelCls + ' mb-0'}>{label}</label>
              <ColorPicker value={cv[key] as string} onChange={v => update({ [key]: v })} />
            </div>
          ))}
        </div>
      </Section>

      {/* Police */}
      <Section title="Police">
        <div className="grid grid-cols-1 gap-1.5">
          {FONTS.map(f => (
            <button key={f.value} onClick={() => update({ fontFamily: f.value })}
              className={cn('text-left px-3 py-2 rounded-lg border text-xs transition-all',
                cv.fontFamily === f.value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300')}
              style={{ fontFamily: f.value }}>
              {f.label} — <span className="opacity-60">Aa Bb Cc</span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

function MiseEnPageTab({ cv, update }: { cv: CVData; update: (p: Partial<CVData>) => void }) {
  return (
    <div className="space-y-5">
      <Section title="Disposition de la sidebar">
        <div className="grid grid-cols-2 gap-2">
          {(['left', 'right'] as const).map(v => (
            <button key={v} onClick={() => update({ layout: v })}
              className={cn('py-3 rounded-xl border text-xs font-medium transition-all',
                cv.layout === v ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
              {v === 'left' ? 'Colonne à gauche' : 'Colonne à droite'}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Nombre de pages">
        <div className="grid grid-cols-2 gap-2">
          {([1, 2] as const).map(v => (
            <button key={v} onClick={() => update({ pages: v })}
              className={cn('py-3 rounded-xl border text-xs font-medium transition-all',
                cv.pages === v ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
              {v} page{v > 1 ? 's' : ''}
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

/* ──────────────────── HELPERS ──────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-4 py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
        {title}
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-2">{children}</div>}
    </div>
  )
}

function TagList({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-1">
          <input className={fieldCls} value={item} onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n) }} placeholder={placeholder} />
          {items.length > 1 && (
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          )}
        </div>
      ))}
      <button onClick={() => onChange([...items, ''])} className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
        <Plus className="w-3 h-3" />Ajouter
      </button>
    </div>
  )
}

/* ──────────────────── CV PREVIEW ──────────────────── */

function CVPreview({ cv }: { cv: CVData }) {
  const BG = cv.sidebarBg || '#1e3a8a'
  const SA = cv.sidebarAccent || '#60a5fa'
  const MA = cv.mainAccent || '#1a56e8'
  const FONT = cv.fontFamily || 'Arial, sans-serif'
  const textMuted = 'rgba(255,255,255,0.7)'

  const bullet = (s: string, i: number) => (
    <p key={i} style={{ color: textMuted, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: SA, display: 'inline-block', flexShrink: 0 }} />{s}
    </p>
  )

  const sidebar = (
    <div style={{ color: 'white', padding: '24px 16px', fontSize: 11, lineHeight: 1.5 }} className="space-y-4">
      <SideSection title="Coordonnées" accent={SA}>
        {[cv.email, cv.phone, cv.address, cv.linkedin, cv.license].filter(Boolean).map((v, i) => (
          <p key={i} style={{ color: textMuted, fontSize: 10, marginBottom: 2 }}>{v}</p>
        ))}
      </SideSection>
      {cv.softSkills.some(Boolean) && <SideSection title="Atouts" accent={SA}>{cv.softSkills.filter(Boolean).map(bullet)}</SideSection>}
      {cv.skills.some(Boolean) && <SideSection title="Compétences" accent={SA}>{cv.skills.filter(Boolean).map(bullet)}</SideSection>}
      {cv.tools.some(Boolean) && <SideSection title="Logiciels" accent={SA}>{cv.tools.filter(Boolean).map(bullet)}</SideSection>}
      {cv.languages.some(Boolean) && <SideSection title="Langues" accent={SA}>{cv.languages.filter(Boolean).map(bullet)}</SideSection>}
      {cv.interests.some(Boolean) && <SideSection title="Centres d'intérêt" accent={SA}>{cv.interests.filter(Boolean).map(bullet)}</SideSection>}
    </div>
  )

  const main = (
    <div style={{ padding: '24px 20px', fontSize: 11, lineHeight: 1.6, flex: 1 }}>
      {cv.summary && (
        <MainSection title="Profil" accent={MA}>
          <p style={{ color: '#374151', fontSize: 10 }}>{cv.summary}</p>
        </MainSection>
      )}
      {cv.experiences.some(e => e.title || e.company) && (
        <MainSection title="Expériences professionnelles" accent={MA}>
          {cv.experiences.filter(e => e.title || e.company).map(exp => (
            <div key={exp.id} style={{ marginBottom: 10 }}>
              <p style={{ fontWeight: 700, color: '#111827', fontSize: 11 }}>{exp.title || 'Poste'}</p>
              {(exp.company || exp.period) && (
                <p style={{ color: '#6b7280', fontSize: 10, fontStyle: 'italic' }}>{[exp.company, exp.period].filter(Boolean).join(' · ')}</p>
              )}
              {exp.bullets.filter(Boolean).length > 0 && (
                <ul style={{ marginTop: 3, paddingLeft: 12 }}>
                  {exp.bullets.filter(Boolean).map((b, i) => (
                    <li key={i} style={{ color: '#374151', fontSize: 10, marginBottom: 1, listStyleType: 'disc' }}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </MainSection>
      )}
      {cv.educations.some(e => e.degree || e.school) && (
        <MainSection title="Formations" accent={MA}>
          {cv.educations.filter(e => e.degree || e.school).map(edu => (
            <div key={edu.id} style={{ marginBottom: 10 }}>
              <p style={{ fontWeight: 700, color: '#111827', fontSize: 11 }}>{edu.degree || 'Diplôme'}</p>
              {(edu.school || edu.period) && (
                <p style={{ color: '#6b7280', fontSize: 10, fontStyle: 'italic' }}>{[edu.school, edu.period].filter(Boolean).join(' · ')}</p>
              )}
              {edu.details && <p style={{ color: '#374151', fontSize: 10, marginTop: 2 }}>{edu.details}</p>}
            </div>
          ))}
        </MainSection>
      )}
    </div>
  )

  return (
    <div style={{ fontFamily: FONT, background: 'white', width: '100%', minHeight: 1123, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: BG, color: 'white', padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 20, boxShadow: 'inset 0 0 0 9999px rgba(0,0,0,0.15)' }}>
        {cv.photo && (
          <img src={cv.photo} alt="photo" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
        )}
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>
            {cv.firstName || 'Prénom'} {cv.lastName || 'NOM'}
          </h1>
          {cv.jobTitle && <p style={{ fontSize: 12, color: SA, marginTop: 4, fontWeight: 500 }}>{cv.jobTitle}</p>}
        </div>
      </div>
      {/* Body */}
      <div style={{
        display: 'flex',
        flexDirection: cv.layout === 'left' ? 'row' : 'row-reverse',
        flex: 1,
        minHeight: 950,
        background: cv.layout === 'left'
          ? `linear-gradient(to right, ${BG} 200px, transparent 200px)`
          : `linear-gradient(to left, ${BG} 200px, transparent 200px)`,
      }}>
        <div style={{ width: 200, flexShrink: 0 }}>{sidebar}</div>
        {main}
      </div>
    </div>
  )
}

function SideSection({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, borderBottom: `1px solid ${accent}30`, paddingBottom: 3 }}>{title}</p>
      {children}
    </div>
  )
}

function MainSection({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: accent, borderBottom: `1.5px solid ${accent}25`, paddingBottom: 3, marginBottom: 6 }}>{title}</p>
      {children}
    </div>
  )
}
