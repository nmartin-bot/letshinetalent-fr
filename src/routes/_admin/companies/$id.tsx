import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { MapPin, Pencil, Trash2, Plus, UserCircle, Calendar, Clock, ChevronDown, Check, Users, Zap, ListTodo, FileText, Building2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Modal from '@/components/shared/Modal'
import { useCompany } from '@/hooks/useCompanies'
import { useContacts } from '@/hooks/useContacts'
import { useAppointments } from '@/hooks/useAppointments'
import EntityTimeline from '@/components/shared/EntityTimeline'
import TaskList from '@/components/shared/TaskList'
import DocumentManager from '@/components/shared/DocumentManager'
import CompanyForm from '@/components/companies/CompanyForm'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

export const Route = createFileRoute('/_admin/companies/$id')({
  component: CompanyPage,
})

type Tab = 'contacts' | 'rdv' | 'activite' | 'taches' | 'docs'

const TABS: { id: Tab; label: string; color: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'contacts', label: 'Contacts', color: 'bg-rose-400', icon: Users },
  { id: 'rdv', label: 'RDV', color: 'bg-violet-500', icon: Calendar },
  { id: 'activite', label: 'Activité', color: 'bg-blue-500', icon: Zap },
  { id: 'taches', label: 'Tâches', color: 'bg-cyan-400', icon: ListTodo },
  { id: 'docs', label: 'Documents', color: 'bg-green-500', icon: FileText },
]

const ROLE_LABELS: Record<string, string> = {
  dirigeant: 'Dirigeant',
  rh: 'RH',
  manager: 'Manager',
  comptable: 'Comptable',
  autre: 'Autre',
}



function CompanyPage() {
  const { id } = Route.useParams()
  const { company, loading, update } = useCompany(id)
  const [tab, setTab] = useState<Tab>('contacts')
  const [showTabMenu, setShowTabMenu] = useState(false)
  const [editing, setEditing] = useState(false)

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>
  if (!company) return <div className="p-8 text-gray-500">Entreprise introuvable.</div>

  async function handleUpdate(values: Database['public']['Tables']['companies']['Insert']) {
    await update(values)
    setEditing(false)
  }



  const infoFields = [
    { label: 'Email', value: company.email },
    { label: 'Téléphone', value: company.phone },
    { label: 'Ville', value: company.city },
    { label: 'Secteur', value: company.sector },
    { label: 'Site web', value: company.website },
    { label: 'SIRET', value: company.siret },
    { label: 'Convention', value: company.collective_agreement },
    { label: 'Effectif', value: company.headcount ? `${company.headcount} salariés` : null },
    { label: 'Adresse', value: [company.address, company.postal_code, company.city].filter(Boolean).join(', ') || null },
  ]

  return (
    <>
      <PageHeader
        pathItems={[
          { label: 'CRM', href: '/companies' },
          { label: 'Entreprises', href: '/companies' },
          { label: company.name },
        ]}
        secondBarRight={
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
            <Pencil className="w-3.5 h-3.5" />Modifier
          </button>
        }
        secondBarLeft={
          <div className="relative">
            <button onClick={() => setShowTabMenu(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
              {(() => { const active = TABS.find(t => t.id === tab)!; return <span className={cn('w-4 h-4 rounded flex items-center justify-center shrink-0', active.color)}><active.icon className="w-2.5 h-2.5 text-white" /></span> })()}
              {TABS.find(t => t.id === tab)?.label}
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>
            {showTabMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTabMenu(false)} />
                <div className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 min-w-[160px]">
                  {TABS.map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); setShowTabMenu(false) }}
                      className={cn('flex items-center gap-2.5 w-full pl-1 pr-3 py-1 rounded-lg text-sm hover:bg-gray-50 text-left transition-colors',
                        tab === t.id ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                      <span className={cn('w-4 h-4 rounded flex items-center justify-center shrink-0', t.color)}><t.icon className="w-2.5 h-2.5 text-white" /></span>
                      {t.label}
                      {tab === t.id && <Check className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        }
      />

      {/* Two-column layout */}
      <div className="flex h-full overflow-hidden">
        {/* Left panel */}
        <div className="w-72 shrink-0 border-r border-gray-100 overflow-y-auto bg-white">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="font-bold text-gray-900 text-lg">{company.name}</h2>
              {company.sector && <p className="text-sm text-gray-500 mt-0.5">{company.sector}</p>}
            </div>

            {/* Info fields */}
            <div className="border-t border-gray-100">
              {infoFields.filter(f => f.value).map(f => (
                <div key={f.label} className="flex justify-between items-center py-2.5 border-b border-gray-50">
                  <span className="text-xs text-gray-400">{f.label}</span>
                  <span className="text-sm text-gray-900 text-right max-w-[160px] truncate">{f.value}</span>
                </div>
              ))}
              {company.notes && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{company.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'contacts' && <ContactsTab companyId={id} />}
          {tab === 'rdv' && <RdvTab companyId={id} />}
          {tab === 'activite' && <EntityTimeline entityType="company" entityId={id} />}
          {tab === 'taches' && <TaskList entityType="company" entityId={id} />}
          {tab === 'docs' && <DocumentManager entityType="company" entityId={id} />}
        </div>
      </div>

      {editing && (
        <Modal title={`Modifier ${company.name}`} subtitle="Mettez à jour les informations de l'entreprise." icon={Building2} onClose={() => setEditing(false)} size="lg">
          <CompanyForm initial={company} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </>
  )
}

function ContactsTab({ companyId }: { companyId: string }) {
  const { contacts, loading, create, remove } = useContacts(companyId)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', role: 'autre', email: '', phone: '', is_main_contact: false })
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await create({ ...form, company_id: companyId })
    setForm({ first_name: '', last_name: '', role: 'autre', email: '', phone: '', is_main_contact: false })
    setShowForm(false)
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Contacts</h3>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-50 rounded-lg p-4 space-y-3 border">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Prénom" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input required placeholder="Nom" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input placeholder="Téléphone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.is_main_contact} onChange={e => setForm(p => ({ ...p, is_main_contact: e.target.checked }))} />
            Contact principal
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-3 py-1.5">Annuler</button>
            <button type="submit" disabled={saving} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Aucun contact enregistré</p>
      ) : (
        <div className="space-y-2">
          {contacts.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
              <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <UserCircle className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-gray-900">{c.first_name} {c.last_name}</p>
                  {c.is_main_contact && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Principal</span>}
                </div>
                <p className="text-xs text-gray-500">{ROLE_LABELS[c.role ?? ''] ?? c.role}</p>
                <div className="flex gap-3 mt-0.5">
                  {c.email && <span className="text-xs text-gray-400">{c.email}</span>}
                  {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                </div>
              </div>
              <button onClick={() => remove(c.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RdvTab({ companyId }: { companyId: string }) {
  const { appointments, loading } = useAppointments(undefined, undefined)
  const companyAppts = appointments
    .filter(a => a.entity_type === 'company' && a.entity_id === companyId)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  const STATUS_COLORS: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    done: 'bg-gray-100 text-gray-500',
    cancelled: 'bg-red-100 text-red-600',
  }

  if (loading) return <p className="text-sm text-gray-400">Chargement...</p>
  if (companyAppts.length === 0) {
    return (
      <div className="text-center py-10">
        <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Aucun rendez-vous enregistré</p>
        <p className="text-xs text-gray-300 mt-1">Créez un RDV depuis l'agenda en sélectionnant cette entreprise</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900">Historique des rendez-vous</h3>
      {companyAppts.map(appt => {
        const isPast = new Date(appt.starts_at) < new Date()
        return (
          <div key={appt.id} className={cn('flex items-start gap-4 p-4 rounded-xl border', isPast ? 'bg-gray-50' : 'bg-white')}>
            <div className="text-center shrink-0 w-12">
              <p className="text-lg font-bold text-gray-900">{new Date(appt.starts_at).getDate()}</p>
              <p className="text-xs text-gray-400">{new Date(appt.starts_at).toLocaleDateString('fr-FR', { month: 'short' })}</p>
              <p className="text-xs text-gray-300">{new Date(appt.starts_at).getFullYear()}</p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm text-gray-900">Rendez-vous entreprise</p>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[appt.status])}>
                  {appt.status === 'confirmed' ? 'Confirmé' : appt.status === 'done' ? 'Effectué' : appt.status === 'cancelled' ? 'Annulé' : 'En attente'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(appt.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {appt.duration_minutes} min
                </span>
                {appt.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{appt.location}
                  </span>
                )}
              </div>
              {appt.notes && <p className="text-xs text-gray-500 mt-1.5 bg-gray-100 rounded px-2 py-1">{appt.notes}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
