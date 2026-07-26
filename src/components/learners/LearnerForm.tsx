import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fieldLabel, fieldInput, fieldSelect, FormFooter } from '@/components/shared/Modal'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

type LearnerInsert = Database['public']['Tables']['learners']['Insert']

interface Props {
  initial?: Partial<LearnerInsert>
  onSubmit: (values: LearnerInsert) => Promise<void>
  onCancel: () => void
}

export default function LearnerForm({ initial = {}, onSubmit, onCancel }: Props) {
  const [type, setType] = useState<'external' | 'company'>(initial.company_id ? 'company' : 'external')
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

  function switchType(t: 'external' | 'company') {
    setType(t)
    if (t === 'external') set('company_id', null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSubmit({ ...values, company_id: type === 'external' ? null : (values.company_id ?? null) })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <div>
        <label className={fieldLabel}>Type d'apprenant</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {([['external', 'Externe', 'Particulier, indépendant...'], ['company', 'Entreprise', 'Salarié lié à une entreprise']] as const).map(([val, label, sub]) => (
            <button key={val} type="button" onClick={() => switchType(val)}
              className={cn(
                'flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all',
                type === val ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
              )}>
              <span className="text-xs font-semibold">{label}</span>
              <span className={cn('text-[10px]', type === val ? 'text-white/60' : 'text-gray-400')}>{sub}</span>
            </button>
          ))}
        </div>
      </div>

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
        {type === 'company' && (
          <div>
            <label className={fieldLabel}>Entreprise *</label>
            <select required value={values.company_id ?? ''} onChange={e => set('company_id', e.target.value || null)} className={fieldSelect}>
              <option value="">— Sélectionner —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  )
}
