import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, BookOpen, Filter, ArrowUpDown, Check, X, Trash2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import HelpTooltip from '@/components/shared/HelpTooltip'
import Modal, { fieldLabel, fieldInput, fieldTextarea, FormFooter } from '@/components/shared/Modal'
import { useTrainingCourses } from '@/hooks/useTraining'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

export const Route = createFileRoute('/_admin/training/')({
  component: TrainingPage,
})

type CourseInsert = Database['public']['Tables']['training_courses']['Insert']

const STATUS_CONFIG = {
  planned:   { label: 'Planifiée', class: 'bg-blue-100 text-blue-700' },
  ongoing:   { label: 'En cours',  class: 'bg-green-100 text-green-700' },
  completed: { label: 'Terminée', class: 'bg-gray-100 text-gray-500' },
} as const

const STATUS_TABS = [
  { id: 'all',       label: 'Toutes' },
  { id: 'planned',   label: 'Planifiées' },
  { id: 'ongoing',   label: 'En cours' },
  { id: 'completed', label: 'Terminées' },
]

const ghostBtn = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors'

function TrainingPage() {
  const { courses, loading, create, remove } = useTrainingCourses()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState<'title_asc' | 'title_desc' | 'date_desc' | 'date_asc'>('title_asc')
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [confirmDeleteSingle, setConfirmDeleteSingle] = useState<{ id: string; title: string } | null>(null)

  const filtered = [...courses]
    .filter(c => {
      const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.companies?.name ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'all' || c.status === filterStatus
      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title)
      if (sortBy === 'title_desc') return b.title.localeCompare(a.title)
      if (sortBy === 'date_desc') return b.created_at.localeCompare(a.created_at)
      return a.created_at.localeCompare(b.created_at)
    })

  async function handleCreate(values: CourseInsert) {
    await create(values)
    setShowForm(false)
  }

  return (
    <>
      <PageHeader
        pathItems={[{ label: 'Formation' }, { label: 'Formations' }]}
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
                    {([['title_asc', 'Titre A → Z'], ['title_desc', 'Titre Z → A'], ['date_desc', 'Plus récente'], ['date_asc', 'Plus ancienne']] as const).map(([id, label]) => (
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
              id="training-catalog"
              title="Catalogue de formations"
              description="Créez vos formations et associez-y des apprenants depuis leurs fiches individuelles."
              visual={
                <div className="grid grid-cols-3 gap-1.5">
                  {[['bg-emerald-100', 'bg-emerald-50'], ['bg-violet-100', 'bg-violet-50'], ['bg-blue-100', 'bg-blue-50']].map(([header, body], i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-gray-100">
                      <div className={`h-5 ${header}`} />
                      <div className={`p-1 ${body} space-y-1`}>
                        <div className="h-1.5 rounded bg-white/70 w-full" />
                        <div className="h-1.5 rounded bg-white/70 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              }
            />
            <span className="text-xs text-gray-400">{filtered.length} formation{filtered.length > 1 ? 's' : ''}</span>
            <div className="w-px h-4 bg-gray-200" />
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" />Nouvelle formation
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
            title="Aucune formation"
            description="Créez vos catalogues de formations pour les associer à vos apprenants."
            action={{ label: 'Nouvelle formation', onClick: () => setShowForm(true) }}
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
                <th className="text-left pr-4 py-2.5 text-xs font-medium text-gray-400">Formation</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Entreprise</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Description</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Statut</th>
                <th className="pr-6 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(course => {
                const status = STATUS_CONFIG[course.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.planned
                const isSelected = selected.has(course.id)
                return (
                  <tr key={course.id}
                    className={cn('border-b border-gray-50 transition-colors group', isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/60')}>
                    <td className="pl-6 pr-3 py-3 w-10">
                      <input type="checkbox" checked={isSelected}
                        onChange={e => {
                          const next = new Set(selected)
                          e.target.checked ? next.add(course.id) : next.delete(course.id)
                          setSelected(next)
                        }}
                        className="w-3.5 h-3.5 rounded border-gray-200 accent-gray-900 cursor-pointer" />
                    </td>
                    <td className="pr-4 py-3">
                      <Link to="/training/$id" params={{ id: course.id }}
                        className="flex items-center gap-2.5 group/link">
                        <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <span className="font-medium text-gray-900 group-hover/link:text-blue-600 transition-colors">
                          {course.title}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {course.companies?.name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[240px]">
                      <span className="truncate block">
                        {course.description ?? <span className="text-gray-300">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', status.class)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="pr-6 py-3">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setConfirmDeleteSingle({ id: course.id, title: course.title })}
                          className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
          title={`Supprimer ${selected.size} formation${selected.size > 1 ? 's' : ''} ?`}
          description={`${selected.size} formation${selected.size > 1 ? 's' : ''} seront définitivement supprimées du catalogue.`}
          confirmLabel="Supprimer"
          icon={Trash2}
          onConfirm={async () => {
            await Promise.all([...selected].map(id => remove(id)))
            setSelected(new Set())
            setConfirmBulkDelete(false)
          }}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}

      {confirmDeleteSingle && (
        <ConfirmDialog
          title={`Supprimer "${confirmDeleteSingle.title}" ?`}
          description="Cette formation sera définitivement supprimée du catalogue."
          confirmLabel="Supprimer"
          icon={Trash2}
          onConfirm={async () => { await remove(confirmDeleteSingle.id); setConfirmDeleteSingle(null) }}
          onCancel={() => setConfirmDeleteSingle(null)}
        />
      )}

      {showForm && (
        <Modal title="Nouvelle formation" subtitle="Créez un catalogue de formation et suivez les participants." icon={BookOpen} onClose={() => setShowForm(false)}>
          <CourseForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </>
  )
}

function CourseForm({ onSubmit, onCancel, initial }: {
  onSubmit: (v: CourseInsert) => Promise<void>
  onCancel: () => void
  initial?: Partial<CourseInsert>
}) {
  const [values, setValues] = useState<CourseInsert>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(field: keyof CourseInsert, value: unknown) {
    setValues(p => ({ ...p, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSubmit(values)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={fieldLabel}>Titre *</label>
        <input required value={values.title} onChange={e => set('title', e.target.value)}
          className={fieldInput} autoFocus />
      </div>
      <div>
        <label className={fieldLabel}>Description</label>
        <textarea value={values.description ?? ''} onChange={e => set('description', e.target.value || null)}
          className={fieldTextarea} rows={3} placeholder="Objectifs, public cible, contenu..." />
      </div>
      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  )
}

export { CourseForm }
