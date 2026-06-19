import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, Building2, Filter, ArrowUpDown, Check, X } from 'lucide-react'
import { useCompanies } from '@/hooks/useCompanies'
import CompanyForm from '@/components/companies/CompanyForm'
import PageHeader from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'

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
  const { companies, loading, create } = useCompanies()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'date_desc' | 'date_asc'>('name_asc')
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [showForm, setShowForm] = useState(false)

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
          </>
        }
        secondBarRight={
          <>
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
      <div className="h-full overflow-auto bg-white">
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucune entreprise trouvée</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-blue-600 hover:underline">
              Créer la première entreprise
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-8 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Secteur</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Ville</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Téléphone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(company => {
                const statusCfg = STATUS_CONFIG[company.status as keyof typeof STATUS_CONFIG]
                return (
                  <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-3.5">
                      <Link to="/companies/$id" params={{ id: company.id }}
                        className="flex items-center gap-3 group">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {company.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">{company.sector ?? '—'}</td>
                    <td className="px-4 py-3.5 text-gray-500">{company.city ?? '—'}</td>
                    <td className="px-4 py-3.5 text-gray-500">{company.phone ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      {statusCfg ? (
                        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', statusCfg.class)}>
                          {statusCfg.label}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal création */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-base">Nouvelle entreprise</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <CompanyForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
