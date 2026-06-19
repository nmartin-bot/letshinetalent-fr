import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type LearnerInsert = Database['public']['Tables']['learners']['Insert']

interface Props {
  initial?: Partial<LearnerInsert>
  onSubmit: (values: LearnerInsert) => Promise<void>
  onCancel: () => void
}

export default function LearnerForm({ initial = {}, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<LearnerInsert>({
    first_name: initial.first_name ?? '',
    last_name: initial.last_name ?? '',
    email: initial.email ?? '',
    phone: initial.phone ?? '',
    function: initial.function ?? '',
    company_id: initial.company_id ?? null,
  })
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    createClient().from('companies').select('id, name').order('name')
      .then(({ data }) => setCompanies((data as { id: string; name: string }[] | null) ?? []))
  }, [])

  function set(field: keyof LearnerInsert, value: unknown) {
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fonction</label>
          <input value={values.function ?? ''} onChange={e => set('function', e.target.value)}
            placeholder="Ex : Technicien, Manager, Commercial..."
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
          <select value={values.company_id ?? ''} onChange={e => set('company_id', e.target.value || null)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Aucune —</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
