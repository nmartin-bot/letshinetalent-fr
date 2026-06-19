import { useState } from 'react'
import { fieldLabel, fieldInput, fieldSelect, fieldTextarea, FormFooter } from '@/components/shared/Modal'
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Nom de l'entreprise *</label>
          <input required value={values.name} onChange={e => set('name', e.target.value)}
            placeholder="Acme Corp" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>SIRET</label>
          <input value={values.siret ?? ''} onChange={e => set('siret', e.target.value)}
            placeholder="123 456 789 00012" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Secteur</label>
          <input value={values.sector ?? ''} onChange={e => set('sector', e.target.value)}
            placeholder="Industrie, Services..." className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Convention collective</label>
          <input value={values.collective_agreement ?? ''} onChange={e => set('collective_agreement', e.target.value)}
            placeholder="Métallurgie, Commerce..." className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Effectif</label>
          <input type="number" value={values.headcount ?? ''} onChange={e => set('headcount', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="50" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Téléphone</label>
          <input value={values.phone ?? ''} onChange={e => set('phone', e.target.value)}
            placeholder="+33 1 23 45 67 89" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Email</label>
          <input type="email" value={values.email ?? ''} onChange={e => set('email', e.target.value)}
            placeholder="contact@entreprise.fr" className={fieldInput} />
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Adresse</label>
          <input value={values.address ?? ''} onChange={e => set('address', e.target.value)}
            placeholder="12 rue de la Paix" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Ville</label>
          <input value={values.city ?? ''} onChange={e => set('city', e.target.value)}
            placeholder="Paris" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Code postal</label>
          <input value={values.postal_code ?? ''} onChange={e => set('postal_code', e.target.value)}
            placeholder="75001" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Site web</label>
          <input value={values.website ?? ''} onChange={e => set('website', e.target.value)}
            placeholder="https://..." className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Statut</label>
          <select value={values.status ?? 'active'} onChange={e => set('status', e.target.value)} className={fieldSelect}>
            <option value="prospect">Prospect</option>
            <option value="active">Client actif</option>
            <option value="inactive">Inactif</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Notes</label>
          <textarea value={values.notes ?? ''} onChange={e => set('notes', e.target.value)}
            rows={3} placeholder="Informations complémentaires..." className={fieldTextarea} />
        </div>
      </div>
      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  )
}
