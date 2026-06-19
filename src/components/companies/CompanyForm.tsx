import { useState } from 'react'
import type { Database } from '@/types/database.types'

type CompanyInsert = Database['public']['Tables']['companies']['Insert']

interface Props {
  initial?: Partial<CompanyInsert>
  onSubmit: (values: CompanyInsert) => Promise<void>
  onCancel: () => void
}

export default function CompanyForm({ initial = {}, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<CompanyInsert>({
    name: initial.name ?? '',
    siret: initial.siret ?? '',
    sector: initial.sector ?? '',
    collective_agreement: initial.collective_agreement ?? '',
    headcount: initial.headcount ?? null,
    address: initial.address ?? '',
    city: initial.city ?? '',
    postal_code: initial.postal_code ?? '',
    phone: initial.phone ?? '',
    email: initial.email ?? '',
    website: initial.website ?? '',
    status: initial.status ?? 'active',
    notes: initial.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(field: keyof CompanyInsert, value: unknown) {
    setValues(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSubmit(values)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise *</label>
          <input
            required
            value={values.name}
            onChange={e => set('name', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
          <input
            value={values.siret ?? ''}
            onChange={e => set('siret', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
          <input
            value={values.sector ?? ''}
            onChange={e => set('sector', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Convention collective</label>
          <input
            value={values.collective_agreement ?? ''}
            onChange={e => set('collective_agreement', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Effectif</label>
          <input
            type="number"
            value={values.headcount ?? ''}
            onChange={e => set('headcount', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
          <input
            value={values.phone ?? ''}
            onChange={e => set('phone', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={values.email ?? ''}
            onChange={e => set('email', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
          <input
            value={values.address ?? ''}
            onChange={e => set('address', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
          <input
            value={values.city ?? ''}
            onChange={e => set('city', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
          <input
            value={values.postal_code ?? ''}
            onChange={e => set('postal_code', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
          <input
            value={values.website ?? ''}
            onChange={e => set('website', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
          <select
            value={values.status ?? 'active'}
            onChange={e => set('status', e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="prospect">Prospect</option>
            <option value="active">Client actif</option>
            <option value="inactive">Inactif</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={values.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}
