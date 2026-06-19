import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, GraduationCap, Filter, ArrowUpDown, Check, X } from 'lucide-react'
import { useLearners } from '@/hooks/useLearners'
import LearnerForm from '@/components/learners/LearnerForm'
import PageHeader from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_admin/learners/')({
  component: LearnersPage,
})

const ghostBtn = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors'

type CompanyFilter = 'all' | 'with' | 'without'

function LearnersPage() {
  const { learners, loading, create } = useLearners()
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>('all')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'date_desc' | 'date_asc'>('name_asc')
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const filtered = [...learners]
    .filter(l => {
      const name = `${l.first_name} ${l.last_name}`.toLowerCase()
      const matchSearch = name.includes(search.toLowerCase()) ||
        (l.email ?? '').toLowerCase().includes(search.toLowerCase())
      const matchCompany = companyFilter === 'all' ? true
        : companyFilter === 'with' ? !!l.company_id : !l.company_id
      return matchSearch && matchCompany
    })
    .sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`
      const nameB = `${b.first_name} ${b.last_name}`
      if (sortBy === 'name_asc') return nameA.localeCompare(nameB)
      if (sortBy === 'name_desc') return nameB.localeCompare(nameA)
      if (sortBy === 'date_desc') return b.created_at.localeCompare(a.created_at)
      return a.created_at.localeCompare(b.created_at)
    })

  async function handleCreate(values: Parameters<typeof create>[0]) {
    await create(values)
    setShowForm(false)
  }

  function initials(first: string, last: string) {
    return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
  }

  return (
    <>
      <PageHeader
        pathItems={[{ label: 'Formation' }, { label: 'Apprenants' }]}
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
                    <p className="text-xs text-gray-400 uppercase tracking-wide px-2 py-1.5 font-medium">Entreprise</p>
                    {([['all', 'Tous'] as const, ['with', 'Avec entreprise'] as const, ['without', 'Sans entreprise'] as const]).map(([id, label]) => (
                      <button key={id} onClick={() => { setCompanyFilter(id); setShowFilter(false) }}
                        className={cn('flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-left transition-colors',
                          companyFilter === id ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                        {label}
                        {companyFilter === id && <Check className="w-3.5 h-3.5" />}
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
            {companyFilter !== 'all' && (
              <button onClick={() => setCompanyFilter('all')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-900 text-white text-xs font-medium hover:bg-gray-700">
                {companyFilter === 'with' ? 'Avec entreprise' : 'Sans entreprise'}
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        }
        secondBarRight={
          <>
            <span className="text-xs text-gray-400">{filtered.length} apprenant{filtered.length > 1 ? 's' : ''}</span>
            <div className="w-px h-4 bg-gray-200" />
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" />Nouvel apprenant
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
            <GraduationCap className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucun apprenant trouvé</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-blue-600 hover:underline">
              Créer le premier apprenant
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-8 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Téléphone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Entreprise</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Ajouté le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(l => {
                const company = (l as typeof l & { companies?: { name: string } | null }).companies
                return (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-3.5">
                      <Link to="/learners/$id" params={{ id: l.id }}
                        className="flex items-center gap-3 group">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-emerald-700 text-xs font-semibold">{initials(l.first_name, l.last_name)}</span>
                        </div>
                        <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {l.first_name} {l.last_name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">{l.email ?? '—'}</td>
                    <td className="px-4 py-3.5 text-gray-500">{l.phone ?? '—'}</td>
                    <td className="px-4 py-3.5 text-gray-500">{company?.name ?? '—'}</td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs">
                      {new Date(l.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-base">Nouvel apprenant</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <LearnerForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
