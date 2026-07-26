import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, Filter, ArrowUpDown, Check, X, Trash2 } from 'lucide-react'
import { useCompanies } from '@/hooks/useCompanies'
import CompanyForm from '@/components/companies/CompanyForm'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import HelpTooltip from '@/components/shared/HelpTooltip'
import Modal from '@/components/shared/Modal'
import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export const Route = createFileRoute('/_admin/companies/')({
  component: CompaniesPage,
})

const STATUS_TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'active', label: 'Clients actifs' },
  { id: 'prospect', label: 'Prospects' },
  { id: 'inactive', label: 'Inactifs' },
]

const STATUS_CONFIG = {
  active: { label: 'Client actif', class: 'bg-green-50 text-green-700 border border-green-200' },
  prospect: { label: 'Prospect', class: 'bg-blue-50 text-blue-700 border border-blue-200' },
  inactive: { label: 'Inactif', class: 'bg-gray-100 text-gray-500 border border-gray-200' },
} as const

const ghostBtn = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors'

function CompaniesPage() {
  const { companies, loading, create, remove } = useCompanies()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'date_desc' | 'date_asc'>('name_asc')
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  const filtered = [...companies]
    .filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.city ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.sector ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'all' || c.status === filterStatus
      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name)
      if (sortBy === 'date_desc') return b.created_at.localeCompare(a.created_at)
      return a.created_at.localeCompare(b.created_at)
    })

  async function handleCreate(values: Parameters<typeof create>[0]) {
    await create(values)
    setShowForm(false)
  }

  return (
    <>
      <PageHeader
        pathItems={[{ label: 'CRM' }, { label: 'Entreprises' }]}
        secondBarLeft={
          <>
            <div className="relative">
              <button onClick={() => { setShowFilter(v => !v); setShowSort(false) }} className={ghostBtn}>
                <Filter className="w-3.5 h-3.5" />Filtrer
              </button>
              {showFilter && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)} />
                  <div className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 min-w-[180px]">
                    <p className="text-xs text-gray-400 uppercase tracking-wide px-2 py-1.5 font-medium">Statut</p>
                    {STATUS_TABS.map(tab => (
                      <button key={tab.id} onClick={() => { setFilterStatus(tab.id); setShowFilter(false) }}
                        className={cn('flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-left transition-colors',
                          filterStatus === tab.id ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                        {tab.label}
                        {filterStatus === tab.id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button onClick={() => { setShowSort(v => !v); setShowFilter(false) }} className={ghostBtn}>
                <ArrowUpDown className="w-3.5 h-3.5" />Trier
              </button>
              {showSort && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                  <div className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 min-w-[180px]">
                    <p className="text-xs text-gray-400 uppercase tracking-wide px-2 py-1.5 font-medium">Trier par</p>
                    {([['name_asc', 'Nom A → Z'], ['name_desc', 'Nom Z → A'], ['date_desc', 'Plus récent'], ['date_asc', 'Plus ancien']] as const).map(([id, label]) => (
                      <button key={id} onClick={() => { setSortBy(id); setShowSort(false) }}
                        className={cn('flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-left transition-colors',
                          sortBy === id ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                        {label}
                        {sortBy === id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 w-40 placeholder:text-gray-300" />
            </div>
            {filterStatus !== 'all' && (
              <button onClick={() => setFilterStatus('all')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-900 text-white text-xs font-medium hover:bg-gray-700">
                {STATUS_TABS.find(t => t.id === filterStatus)?.label}
                <X className="w-3 h-3" />
              </button>
            )}
            {selected.size > 0 && (
              <>
                <div className="w-px h-4 bg-gray-200" />
                <button onClick={() => setConfirmBulkDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />Supprimer ({selected.size})
                </button>
              </>
            )}
          </>
        }
        secondBarRight={
          <>
            <HelpTooltip
              id="companies-table"
              title="Gestion des entreprises"
              description="Chaque entreprise peut être liée à des contacts, des rendez-vous et des devis. Cliquez sur une ligne pour accéder à la fiche complète avec tous les onglets."
              visual={
                <div className="space-y-1.5">
                  <div className="flex gap-2 items-center px-1">
                    <div className="w-6 h-6 rounded bg-gray-200 shrink-0" />
                    <div className="flex-1 h-2 rounded bg-gray-200" />
                    <div className="w-10 h-2 rounded bg-emerald-100" />
                  </div>
                  <div className="flex gap-2 items-center px-1">
                    <div className="w-6 h-6 rounded bg-gray-100 shrink-0" />
                    <div className="flex-1 h-2 rounded bg-gray-100" />
                    <div className="w-10 h-2 rounded bg-blue-100" />
                  </div>
                  <div className="flex gap-2 items-center px-1">
                    <div className="w-6 h-6 rounded bg-gray-100 shrink-0" />
                    <div className="flex-1 h-2 rounded bg-gray-100" />
                    <div className="w-10 h-2 rounded bg-gray-100" />
                  </div>
                </div>
              }
            />
            <span className="text-xs text-gray-400">{filtered.length} entreprise{filtered.length > 1 ? 's' : ''}</span>
            <div className="w-px h-4 bg-gray-200" />
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" />Nouvelle entreprise
            </button>
          </>
        }
      />

      {/* Table */}
      <div className="h-full overflow-auto relative">
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            variant="table"
            title="Aucune entreprise"
            description="Ajoutez vos entreprises partenaires pour gérer vos contacts et rendez-vous."
            action={{ label: 'Nouvelle entreprise', onClick: () => setShowForm(true) }}
            ghostOpacity={0.7}
          />
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pl-6 pr-3 py-2.5 w-10">
                  <input type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={e => setSelected(e.target.checked ? new Set(filtered.map(c => c.id)) : new Set())}
                    className="w-3.5 h-3.5 rounded border-gray-200 accent-gray-900 cursor-pointer" />
                </th>
                <th className="text-left pr-6 py-2.5 text-xs font-medium text-gray-400">Entreprise</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Secteur</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Ville</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Téléphone</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 pr-6">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(company => {
                const statusCfg = STATUS_CONFIG[company.status as keyof typeof STATUS_CONFIG]
                const isSelected = selected.has(company.id)
                return (
                  <tr key={company.id}
                    className={cn('border-b border-gray-50 transition-colors', isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/60')}>
                    <td className="pl-6 pr-3 py-3 w-10">
                      <input type="checkbox" checked={isSelected}
                        onChange={e => {
                          const next = new Set(selected)
                          e.target.checked ? next.add(company.id) : next.delete(company.id)
                          setSelected(next)
                        }}
                        className="w-3.5 h-3.5 rounded border-gray-200 accent-gray-900 cursor-pointer" />
                    </td>
                    <td className="pr-6 py-3">
                      <Link to="/companies/$id" params={{ id: company.id }}
                        className="flex items-center gap-2.5 group/link">
                        <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs font-semibold', avatarColor(company.name))}>
                          {company.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 group-hover/link:text-blue-600 transition-colors">
                          {company.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{company.sector ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{company.city ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{company.phone ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 pr-6">
                      {statusCfg ? (
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', statusCfg.class)}>
                          {statusCfg.label}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {confirmBulkDelete && (
        <ConfirmDialog
          title={`Supprimer ${selected.size} entreprise${selected.size > 1 ? 's' : ''} ?`}
          description={`${selected.size} entreprise${selected.size > 1 ? 's' : ''} seront définitivement supprimées.`}
          confirmLabel="Supprimer"
          icon={Trash2}
          onConfirm={async () => { await Promise.all([...selected].map(id => remove(id))); setSelected(new Set()); setConfirmBulkDelete(false) }}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}

      {showForm && (
        <Modal title="Nouvelle entreprise" subtitle="Ajoutez une entreprise partenaire à votre CRM." icon={Building2} onClose={() => setShowForm(false)} size="lg">
          <CompanyForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </>
  )
}
