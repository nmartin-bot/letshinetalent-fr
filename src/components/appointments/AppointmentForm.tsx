import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']

interface Props {
  initial?: Partial<AppointmentInsert>
  onSubmit: (values: AppointmentInsert) => Promise<void>
  onCancel: () => void
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

export default function AppointmentForm({ initial = {}, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<AppointmentInsert>({
    entity_type: initial.entity_type ?? 'candidate',
    entity_id: initial.entity_id ?? '',
    type: initial.type ?? 'other',
    status: initial.status ?? 'confirmed',
    starts_at: initial.starts_at ?? new Date().toISOString().slice(0, 16),
    duration_minutes: initial.duration_minutes ?? 60,
    location: initial.location ?? '',
    notes: initial.notes ?? '',
  })
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadEntities(values.entity_type)
  }, [values.entity_type])

  async function loadEntities(type: string) {
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
    setValues(prev => ({ ...prev, entity_id: '' }))
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Type de contact</label>
          <select value={values.entity_type} onChange={e => { set('entity_type', e.target.value) }}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="candidate">Candidat</option>
            <option value="company">Entreprise</option>
            <option value="learner">Apprenant</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Avec *</label>
          <select required value={values.entity_id} onChange={e => set('entity_id', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Choisir —</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type de RDV</label>
          <select value={values.type} onChange={e => set('type', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
          <select value={values.status ?? 'confirmed'} onChange={e => set('status', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date et heure *</label>
          <input required type="datetime-local" value={values.starts_at as string}
            onChange={e => set('starts_at', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Durée (minutes)</label>
          <select value={values.duration_minutes ?? 60} onChange={e => set('duration_minutes', parseInt(e.target.value))}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {[30, 45, 60, 90, 120, 180].map(d => <option key={d} value={d}>{d} min</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
          <input value={values.location ?? ''} onChange={e => set('location', e.target.value)}
            placeholder="En ligne, Adresse, Téléphone..."
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={values.notes ?? ''} onChange={e => set('notes', e.target.value)}
            rows={3} className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}
