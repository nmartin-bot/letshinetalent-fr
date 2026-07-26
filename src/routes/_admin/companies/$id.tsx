import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Pencil, Trash2, Plus, UserCircle, Calendar, ChevronDown, Check, Users, Zap, FileText, Building2, GraduationCap, User, Send, KeyRound } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Modal from '@/components/shared/Modal'
import EmptyState from '@/components/shared/EmptyState'
import { useCompany } from '@/hooks/useCompanies'
import { useContacts } from '@/hooks/useContacts'
import { useAppointments } from '@/hooks/useAppointments'
import EntityTimeline from '@/components/shared/EntityTimeline'

import DocumentManager from '@/components/shared/DocumentManager'
import CompanyForm from '@/components/companies/CompanyForm'
import { sendAccessFn } from '@/server/send-access'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export const Route = createFileRoute('/_admin/companies/$id')({
  component: CompanyPage,
})

type Tab = 'contacts' | 'rdv' | 'activite' | 'docs'

const TABS: { id: Tab; label: string; color: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'contacts', label: 'Contacts', color: 'bg-rose-400', icon: Users },
  { id: 'rdv', label: 'RDV', color: 'bg-violet-500', icon: Calendar },
  { id: 'activite', label: 'Activité', color: 'bg-blue-500', icon: Zap },
  { id: 'docs', label: 'Documents', color: 'bg-cyan-400', icon: FileText },
]

const ROLE_LABELS: Record<string, string> = {
  dirigeant: 'Dirigeant',
  rh: 'RH',
  manager: 'Manager',
  comptable: 'Comptable',
  autre: 'Autre',
}



function PortalSection({ companyId, initial }: { companyId: string; initial: { portal_first_name?: string | null; portal_last_name?: string | null; portal_email?: string | null } }) {
  const supabase = createClient()
  const [firstName, setFirstName] = useState(initial.portal_first_name ?? '')
  const [lastName, setLastName] = useState(initial.portal_last_name ?? '')
  const [email, setEmail] = useState(initial.portal_email ?? '')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    await supabase.from('companies').update({ portal_first_name: firstName || null, portal_last_name: lastName || null, portal_email: email || null } as never).eq('id', companyId)
    setSaving(false)
  }

  async function handleSendAccess() {
    if (!email) return
    setSending(true)
    setError(null)
    await handleSave()
    const result = await sendAccessFn({ data: { email, entityType: 'company', entityId: companyId } })
    if (result.ok) { setSent(true); setTimeout(() => setSent(false), 3000) }
    else setError(result.error ?? 'Erreur')
    setSending(false)
  }

  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      <div className="flex items-center gap-1.5 mb-3">
        <KeyRound className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accès portail</p>
      </div>
      <div className="space-y-2">
        <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" onBlur={handleSave}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-300" />
        <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" onBlur={handleSave}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-300" />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" onBlur={handleSave}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-300" />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={handleSendAccess} disabled={!email || sending || saving}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-40">
          <Send className="w-3 h-3" />
          {sent ? 'Accès envoyé !' : sending ? 'Envoi...' : 'Envoyer l\'accès'}
        </button>
      </div>
    </div>
  )
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
            <PortalSection companyId={id} initial={company as never} />
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {tab === 'contacts' && <ContactsTab companyId={id} />}
          {tab === 'rdv' && <RdvTab companyId={id} />}
          {tab === 'activite' && <EntityTimeline entityType="company" entityId={id} />}
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

type CandidateRow = Database['public']['Tables']['candidates']['Row']
type LearnerRow = Database['public']['Tables']['learners']['Row']

function useCompanyPeople(companyId: string) {
  const supabase = createClient()
  const [candidates, setCandidates] = useState<CandidateRow[]>([])
  const [learners, setLearners] = useState<LearnerRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    Promise.all([
      supabase.from('candidates').select('*').eq('company_id', companyId).order('last_name'),
      supabase.from('learners').select('*').eq('company_id', companyId).order('last_name'),
    ]).then(([c, l]) => {
      setCandidates((c.data as CandidateRow[] | null) ?? [])
      setLearners((l.data as LearnerRow[] | null) ?? [])
      setLoading(false)
    })
  }, [companyId])
  return { candidates, learners, loading }
}

function ContactsTab({ companyId }: { companyId: string }) {
  const { contacts, loading: loadingContacts, create, remove } = useContacts(companyId)
  const { candidates, learners, loading: loadingPeople } = useCompanyPeople(companyId)
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

  const loading = loadingContacts || loadingPeople
  const isEmpty = !loading && contacts.length === 0 && candidates.length === 0 && learners.length === 0

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">Chargement...</div>

  if (isEmpty && !showForm) {
    return (
      <div className="p-6">
        <EmptyState
          variant="table"
          title="Aucun contact"
          description="Ajoutez des contacts manuels ou rattachez des candidats et apprenants à cette entreprise."
          action={{ label: 'Ajouter un contact', onClick: () => setShowForm(true) }}
          ghostOpacity={0.7}
        />
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      {/* Add form */}
      {showForm && (
        <div className="px-6 py-4 border-b border-gray-100">
          <form onSubmit={handleCreate} className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nouveau contact</p>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Prénom" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300" />
              <input required placeholder="Nom" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300" />
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300">
                {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input placeholder="Téléphone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300" />
              <input type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs col-span-2 focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.is_main_contact} onChange={e => setForm(p => ({ ...p, is_main_contact: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded border-gray-200 accent-gray-900" />
                Contact principal
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="text-xs text-gray-500 px-3 py-1.5 hover:text-gray-700">Annuler</button>
                <button type="submit" disabled={saving}
                  className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium">
                  {saving ? 'Enregistrement...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left pl-6 pr-4 py-2.5 text-xs font-medium text-gray-400">Nom</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Rôle</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Email</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Téléphone</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Type</th>
            <th className="pr-6 py-2.5">
              <div className="flex justify-end">
                <button onClick={() => setShowForm(v => !v)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                  <Plus className="w-3.5 h-3.5" />Contact
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.map(c => {
            const fullName = `${c.first_name} ${c.last_name}`
            return (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
                <td className="pl-6 pr-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold', avatarColor(fullName))}>
                      {c.first_name[0]}{c.last_name[0]}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{fullName}</span>
                      {c.is_main_contact && <span className="ml-1.5 text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Principal</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{ROLE_LABELS[c.role ?? ''] ?? c.role ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.email ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.phone ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                    <UserCircle className="w-3 h-3" />Contact
                  </span>
                </td>
                <td className="pr-6 py-3">
                  <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => remove(c.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
          {candidates.map(c => {
            const fullName = `${c.first_name} ${c.last_name}`
            return (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
                <td className="pl-6 pr-4 py-3">
                  <Link to="/candidates/$id" params={{ id: c.id }} className="flex items-center gap-2.5 group/link">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold', avatarColor(fullName))}>
                      {c.first_name[0]}{c.last_name[0]}
                    </div>
                    <span className="font-medium text-gray-900 group-hover/link:text-blue-600 transition-colors">{fullName}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.current_situation ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.email ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.phone ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit">
                    <User className="w-3 h-3" />Candidat
                  </span>
                </td>
                <td className="pr-6 py-3" />
              </tr>
            )
          })}
          {learners.map(l => {
            const fullName = `${l.first_name} ${l.last_name}`
            return (
              <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
                <td className="pl-6 pr-4 py-3">
                  <Link to="/learners/$id" params={{ id: l.id }} className="flex items-center gap-2.5 group/link">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold', avatarColor(fullName))}>
                      {l.first_name[0]}{l.last_name[0]}
                    </div>
                    <span className="font-medium text-gray-900 group-hover/link:text-blue-600 transition-colors">{fullName}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{l.function ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{l.email ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{l.phone ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                    <GraduationCap className="w-3 h-3" />Apprenant
                  </span>
                </td>
                <td className="pr-6 py-3" />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const STATUS_APPT_CONFIG: Record<string, { label: string; class: string }> = {
  confirmed: { label: 'Confirmé',  class: 'bg-green-100 text-green-700' },
  pending:   { label: 'En attente', class: 'bg-yellow-100 text-yellow-700' },
  done:      { label: 'Effectué',  class: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'Annulé',   class: 'bg-red-100 text-red-600' },
}

function RdvTab({ companyId }: { companyId: string }) {
  const { appointments, loading } = useAppointments(undefined, undefined)
  const appts = appointments
    .filter(a => a.entity_type === 'company' && a.entity_id === companyId)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">Chargement...</div>
  if (appts.length === 0) {
    return (
      <EmptyState
        variant="table"
        title="Aucun rendez-vous"
        description="Créez un RDV depuis l'agenda en sélectionnant cette entreprise."
        ghostOpacity={0.7}
      />
    )
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left pl-6 pr-4 py-2.5 text-xs font-medium text-gray-400">Date</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Heure</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Durée</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Lieu</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Notes</th>
            <th className="text-left pr-6 px-4 py-2.5 text-xs font-medium text-gray-400">Statut</th>
          </tr>
        </thead>
        <tbody>
          {appts.map(appt => {
            const s = STATUS_APPT_CONFIG[appt.status] ?? STATUS_APPT_CONFIG.pending
            return (
              <tr key={appt.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                <td className="pl-6 pr-4 py-3 text-xs font-medium text-gray-900">
                  {new Date(appt.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(appt.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{appt.duration_minutes} min</td>
                <td className="px-4 py-3 text-xs text-gray-500">{appt.location ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">
                  <span className="truncate block">{appt.notes ?? <span className="text-gray-300">—</span>}</span>
                </td>
                <td className="pr-6 px-4 py-3">
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', s.class)}>{s.label}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
