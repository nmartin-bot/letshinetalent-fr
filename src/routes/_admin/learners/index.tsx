import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, Filter, ArrowUpDown, Check, X, Trash2 } from 'lucide-react'
import { useLearners } from '@/hooks/useLearners'
import LearnerForm from '@/components/learners/LearnerForm'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import Modal from '@/components/shared/Modal'
import { GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_admin/learners/')({
  component: LearnersPage,
})

const ghostBtn = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors'

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

type CompanyFilter = 'all' | 'with' | 'without'

function LearnersPage() {
  const { learners, loading, create, remove } = useLearners()
  const [selected, setSelected] = useState<Set<string>>(new Set())
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
            {selected.size > 0 && (
              <>
                <div className="w-px h-4 bg-gray-200" />
                <button onClick={async () => {
                  if (!confirm(`Supprimer ${selected.size} apprenant${selected.size > 1 ? 's' : ''} ?`)) return
                  await Promise.all([...selected].map(id => remove(id)))
                  setSelected(new Set())
                }} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />Supprimer ({selected.size})
                </button>
              </>
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
          <EmptyState
            variant="table"
            title="Aucun apprenant"
            description="Ajoutez vos apprenants pour suivre leurs formations et leur progression."
            action={{ label: 'Nouvel apprenant', onClick: () => setShowForm(true) }}
            ghostOpacity={0.7}
          />
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pl-6 pr-3 py-2.5 w-10">
                  <input type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={e => setSelected(e.target.checked ? new Set(filtered.map(l => l.id)) : new Set())}
                    className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                </th>
                <th className="text-left pr-6 py-2.5 text-xs font-medium text-gray-400">Apprenant</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Téléphone</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Entreprise</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 pr-6">Ajouté le</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const company = (l as typeof l & { companies?: { name: string } | null }).companies
                const isSelected = selected.has(l.id)
                const fullName = `${l.first_name} ${l.last_name}`
                return (
                  <tr key={l.id} className={cn('border-b border-gray-50 transition-colors', isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/60')}>
                    <td className="pl-6 pr-3 py-3 w-10">
                      <input type="checkbox" checked={isSelected}
                        onChange={e => {
                          const next = new Set(selected)
                          e.target.checked ? next.add(l.id) : next.delete(l.id)
                          setSelected(next)
                        }}
                        className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                    </td>
                    <td className="pr-6 py-3">
                      <Link to="/learners/$id" params={{ id: l.id }} className="flex items-center gap-2.5 group/link">
                        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold', avatarColor(fullName))}>
                          {initials(l.first_name, l.last_name)}
                        </div>
                        <span className="font-medium text-gray-900 group-hover/link:text-blue-600 transition-colors">{fullName}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{l.email ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{l.phone ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{company?.name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 pr-6 text-gray-400 text-xs">
                      {new Date(l.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <Modal title="Nouvel apprenant" subtitle="Ajoutez un apprenant et associez-le à une formation." icon={GraduationCap} onClose={() => setShowForm(false)}>
          <LearnerForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </>
  )
}
