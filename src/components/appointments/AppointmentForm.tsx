import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fieldLabel, fieldInput, fieldSelect, fieldTextarea, FormFooter } from '@/components/shared/Modal'
import type { Database } from '@/types/database.types'

type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']

interface Props {
  initial?: Partial<AppointmentInsert>
  onSubmit: (values: AppointmentInsert) => Promise<void>
  onCancel: () => void
  label?: string
}

const TYPE_LABELS = {
  coaching_1: 'Session coaching 1',
  coaching_2: 'Session coaching 2',
  coaching_3: 'Session coaching 3',
  training: 'Formation',
  company: 'Rendez-vous entreprise',
  other: 'Autre',
}

const STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
  done: 'Effectué',
}

type EntityOption = { id: string; label: string }

function toLocalDatetimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AppointmentForm({ initial = {}, onSubmit, onCancel, label }: Props) {
  const [values, setValues] = useState<AppointmentInsert>({
    entity_type: initial.entity_type ?? 'candidate',
    entity_id: initial.entity_id ?? '',
    type: initial.type ?? 'other',
    status: initial.status ?? 'confirmed',
    starts_at: initial.starts_at ? toLocalDatetimeInput(new Date(initial.starts_at)) : toLocalDatetimeInput(new Date()),
    duration_minutes: initial.duration_minutes ?? 60,
    location: initial.location ?? '',
    notes: initial.notes ?? '',
  })
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [saving, setSaving] = useState(false)

  const isEditing = !!initial.entity_id

  useEffect(() => { loadEntities(values.entity_type, isEditing) }, [values.entity_type])

  async function loadEntities(type: string, keepEntityId = false) {
    const supabase = createClient()
    if (type === 'candidate') {
      const { data } = await supabase.from('candidates').select('id, first_name, last_name').order('last_name')
      setEntities((data ?? []).map((c: { id: string; first_name: string; last_name: string }) => ({ id: c.id, label: `${c.first_name} ${c.last_name}` })))
    } else if (type === 'company') {
      const { data } = await supabase.from('companies').select('id, name').order('name')
      setEntities((data ?? []).map((c: { id: string; name: string }) => ({ id: c.id, label: c.name })))
    } else if (type === 'learner') {
      const { data } = await supabase.from('learners').select('id, first_name, last_name').order('last_name')
      setEntities((data ?? []).map((l: { id: string; first_name: string; last_name: string }) => ({ id: l.id, label: `${l.first_name} ${l.last_name}` })))
    }
    if (!keepEntityId) setValues(prev => ({ ...prev, entity_id: '' }))
  }

  function set(field: keyof AppointmentInsert, value: unknown) {
    setValues(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.entity_id) return
    setSaving(true)
    await onSubmit({ ...values, starts_at: new Date(values.starts_at).toISOString() })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={fieldLabel}>Type de contact</label>
          <select value={values.entity_type} onChange={e => set('entity_type', e.target.value)} className={fieldSelect}>
            <option value="candidate">Candidat</option>
            <option value="company">Entreprise</option>
            <option value="learner">Apprenant</option>
          </select>
        </div>
        <div>
          <label className={fieldLabel}>Avec *</label>
          <select required value={values.entity_id} onChange={e => set('entity_id', e.target.value)} className={fieldSelect}>
            <option value="">— Choisir —</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
        <div>
          <label className={fieldLabel}>Type de RDV</label>
          <select value={values.type} onChange={e => set('type', e.target.value)} className={fieldSelect}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={fieldLabel}>Statut</label>
          <select value={values.status ?? 'confirmed'} onChange={e => set('status', e.target.value)} className={fieldSelect}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={fieldLabel}>Date et heure *</label>
          <input required type="datetime-local" value={values.starts_at as string}
            onChange={e => set('starts_at', e.target.value)} className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Durée</label>
          <select value={values.duration_minutes ?? 60} onChange={e => set('duration_minutes', parseInt(e.target.value))} className={fieldSelect}>
            {[30, 45, 60, 90, 120, 180].map(d => <option key={d} value={d}>{d} min</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className={fieldLabel}>Lieu</label>
          <input value={values.location ?? ''} onChange={e => set('location', e.target.value)}
            placeholder="En ligne, adresse, téléphone..." className={fieldInput} />
        </div>
        <div className="col-span-2">
          <label className={fieldLabel}>Notes</label>
          <textarea value={values.notes ?? ''} onChange={e => set('notes', e.target.value)}
            rows={3} placeholder="Points à aborder, contexte..." className={fieldTextarea} />
        </div>
      </div>
      <FormFooter onCancel={onCancel} saving={saving} label={label ?? 'Créer le RDV'} />
    </form>
  )
}
