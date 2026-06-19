import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fieldLabel, fieldInput, fieldSelect, FormFooter } from '@/components/shared/Modal'
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
          <label className={fieldLabel}>Prénom *</label>
          <input required value={values.first_name} onChange={e => set('first_name', e.target.value)}
            placeholder="Jean" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Nom *</label>
          <input required value={values.last_name} onChange={e => set('last_name', e.target.value)}
            placeholder="Martin" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Email</label>
          <input type="email" value={values.email ?? ''} onChange={e => set('email', e.target.value)}
            placeholder="jean.martin@email.fr" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Téléphone</label>
          <input value={values.phone ?? ''} onChange={e => set('phone', e.target.value)}
            placeholder="+33 6 12 34 56 78" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Fonction</label>
          <input value={values.function ?? ''} onChange={e => set('function', e.target.value)}
            placeholder="Technicien, Manager..." className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Entreprise</label>
          <select value={values.company_id ?? ''} onChange={e => set('company_id', e.target.value || null)} className={fieldSelect}>
            <option value="">— Aucune —</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  )
}
