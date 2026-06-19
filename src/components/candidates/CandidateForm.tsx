import { useState } from 'react'
import { fieldLabel, fieldInput, fieldSelect, fieldTextarea, FormFooter } from '@/components/shared/Modal'
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
          <label className={fieldLabel}>Prénom *</label>
          <input required value={values.first_name} onChange={e => set('first_name', e.target.value)}
            placeholder="Marie" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Nom *</label>
          <input required value={values.last_name} onChange={e => set('last_name', e.target.value)}
            placeholder="Dupont" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Email</label>
          <input type="email" value={values.email ?? ''} onChange={e => set('email', e.target.value)}
            placeholder="marie.dupont@email.fr" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Téléphone</label>
          <input value={values.phone ?? ''} onChange={e => set('phone', e.target.value)}
            placeholder="+33 6 12 34 56 78" className={fieldInput} />
        </div>
        <div className="col-span-2">
          <label className={fieldLabel}>Adresse</label>
          <input value={values.address ?? ''} onChange={e => set('address', e.target.value)}
            placeholder="12 rue de la Paix, 75001 Paris" className={fieldInput} />
        </div>
        <div className="col-span-2">
          <label className={fieldLabel}>Situation actuelle</label>
          <input value={values.current_situation ?? ''} onChange={e => set('current_situation', e.target.value)}
            placeholder="Ex : En poste, En recherche active, Cadre licencié..." className={fieldInput} />
        </div>
        <div className="col-span-2">
          <label className={fieldLabel}>Objectif professionnel</label>
          <textarea value={values.objective ?? ''} onChange={e => set('objective', e.target.value)}
            rows={3} placeholder="Quel est l'objectif du candidat ?" className={fieldTextarea} />
        </div>
        <div>
          <label className={fieldLabel}>Statut</label>
          <select value={values.status ?? 'active'} onChange={e => set('status', e.target.value)} className={fieldSelect}>
            <option value="active">En cours</option>
            <option value="completed">Terminé</option>
            <option value="paused">En pause</option>
          </select>
        </div>
      </div>
      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  )
}
