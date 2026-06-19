import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, Filter, ArrowUpDown, Check, X, Trash2 } from 'lucide-react'
import { useCandidates } from '@/hooks/useCandidates'
import CandidateForm from '@/components/candidates/CandidateForm'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import Modal from '@/components/shared/Modal'
import { UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_admin/candidates/')({
  component: CandidatesPage,
})

const STATUS_TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'active', label: 'En cours' },
  { id: 'paused', label: 'En pause' },
  { id: 'completed', label: 'Terminés' },
]

const STATUS_CONFIG = {
  active: { label: 'En cours', class: 'bg-green-50 text-green-700 border border-green-200' },
  paused: { label: 'En pause', class: 'bg-orange-50 text-orange-700 border border-orange-200' },
  completed: { label: 'Terminé', class: 'bg-gray-100 text-gray-500 border border-gray-200' },
} as const

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

function CandidatesPage() {
  const { candidates, loading, create, remove } = useCandidates()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'date_desc' | 'date_asc'>('name_asc')
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const filtered = [...candidates]
    .filter(c => {
      const name = `${c.first_name} ${c.last_name}`.toLowerCase()
      const matchSearch = name.includes(search.toLowerCase()) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.current_situation ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'all' || c.status === filterStatus
      return matchSearch && matchStatus
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
        pathItems={[{ label: 'CRM' }, { label: 'Candidats' }]}
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
                <button onClick={async () => {
                  if (!confirm(`Supprimer ${selected.size} candidat${selected.size > 1 ? 's' : ''} ?`)) return
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
            <span className="text-xs text-gray-400">{filtered.length} candidat{filtered.length > 1 ? 's' : ''}</span>
            <div className="w-px h-4 bg-gray-200" />
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" />Nouveau candidat
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
            title="Aucun candidat"
            description="Commencez par ajouter vos candidats pour suivre leur parcours de coaching."
            action={{ label: 'Nouveau candidat', onClick: () => setShowForm(true) }}
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
                    className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                </th>
                <th className="text-left pr-6 py-2.5 text-xs font-medium text-gray-400">Candidat</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Téléphone</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Situation</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 pr-6">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const statusCfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG]
                const isSelected = selected.has(c.id)
                const fullName = `${c.first_name} ${c.last_name}`
                return (
                  <tr key={c.id} className={cn('border-b border-gray-50 transition-colors', isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/60')}>
                    <td className="pl-6 pr-3 py-3 w-10">
                      <input type="checkbox" checked={isSelected}
                        onChange={e => {
                          const next = new Set(selected)
                          e.target.checked ? next.add(c.id) : next.delete(c.id)
                          setSelected(next)
                        }}
                        className="w-3.5 h-3.5 rounded border-gray-300 accent-gray-900 cursor-pointer" />
                    </td>
                    <td className="pr-6 py-3">
                      <Link to="/candidates/$id" params={{ id: c.id }} className="flex items-center gap-2.5 group/link">
                        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold', avatarColor(fullName))}>
                          {initials(c.first_name, c.last_name)}
                        </div>
                        <span className="font-medium text-gray-900 group-hover/link:text-blue-600 transition-colors">{fullName}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.email ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.phone ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.current_situation ?? <span className="text-gray-300">—</span>}</td>
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

      {showForm && (
        <Modal title="Nouveau candidat" subtitle="Créez une fiche pour suivre le parcours de coaching." icon={UserRound} onClose={() => setShowForm(false)}>
          <CandidateForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </>
  )
}
