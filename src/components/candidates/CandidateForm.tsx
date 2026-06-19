import { useState } from 'react'
import type { Database } from '@/types/database.types'

type CandidateInsert = Database['public']['Tables']['candidates']['Insert']

interface Props {
  initial?: Partial<CandidateInsert>
  onSubmit: (values: CandidateInsert) => Promise<void>
  onCancel: () => void
}

export default function CandidateForm({ initial = {}, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<CandidateInsert>({
    first_name: initial.first_name ?? '',
    last_name: initial.last_name ?? '',
    email: initial.email ?? '',
    phone: initial.phone ?? '',
    address: initial.address ?? '',
    current_situation: initial.current_situation ?? '',
    objective: initial.objective ?? '',
    status: initial.status ?? 'active',
  })
  const [saving, setSaving] = useState(false)

  function set(field: keyof CandidateInsert, value: unknown) {
    setValues(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSubmit(values)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
          <input required value={values.first_name} onChange={e => set('first_name', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
          <input required value={values.last_name} onChange={e => set('last_name', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={values.email ?? ''} onChange={e => set('email', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
          <input value={values.phone ?? ''} onChange={e => set('phone', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
          <input value={values.address ?? ''} onChange={e => set('address', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Situation actuelle</label>
          <input value={values.current_situation ?? ''} onChange={e => set('current_situation', e.target.value)}
            placeholder="Ex : En poste, En recherche active, Cadre licencié..."
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Objectif professionnel</label>
          <textarea value={values.objective ?? ''} onChange={e => set('objective', e.target.value)}
            rows={3} placeholder="Quel est l'objectif du candidat ?"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
          <select value={values.status ?? 'active'} onChange={e => set('status', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="active">En cours</option>
            <option value="completed">Terminé</option>
            <option value="paused">En pause</option>
          </select>
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
