import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, BookOpen, Building2, Calendar, Clock, Filter, ArrowUpDown, Check, X, Trash2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import HelpTooltip from '@/components/shared/HelpTooltip'
import Modal, { fieldLabel, fieldInput, fieldSelect, FormFooter } from '@/components/shared/Modal'
import { useTrainingCourses } from '@/hooks/useTraining'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

export const Route = createFileRoute('/_admin/training/')({
  component: TrainingPage,
})

type CourseInsert = Database['public']['Tables']['training_courses']['Insert']

const STATUS_CONFIG = {
  planned: { label: 'Planifiée', class: 'bg-blue-100 text-blue-700' },
  ongoing: { label: 'En cours', class: 'bg-green-100 text-green-700' },
  completed: { label: 'Terminée', class: 'bg-gray-100 text-gray-500' },
} as const

const STATUS_TABS = [
  { id: 'all', label: 'Toutes' },
  { id: 'planned', label: 'Planifiées' },
  { id: 'ongoing', label: 'En cours' },
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
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState<{ id: string; title: string } | null>(null)

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
                    {([['title_asc', 'Titre A → Z'], ['title_desc', 'Titre Z → A'], ['date_desc', 'Plus récent'], ['date_asc', 'Plus ancien']] as const).map(([id, label]) => (
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
            <HelpTooltip
              id="training-catalog"
              title="Catalogue de formations"
              description="Créez vos formations et associez-y des apprenants depuis leurs fiches individuelles. Survolez une carte pour faire apparaître le bouton de suppression."
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

      {/* Content */}
      <div className="h-full overflow-y-auto px-8 py-6">
        {confirmDeleteCourse && (
          <ConfirmDialog
            title={`Supprimer "${confirmDeleteCourse.title}" ?`}
            description="Cette formation sera définitivement supprimée du catalogue."
            confirmLabel="Supprimer"
            icon={Trash2}
            onConfirm={async () => { await remove(confirmDeleteCourse.id); setConfirmDeleteCourse(null) }}
            onCancel={() => setConfirmDeleteCourse(null)}
          />
        )}

        {showForm && (
          <Modal title="Nouvelle formation" subtitle="Créez un catalogue de formation et suivez les participants." icon={BookOpen} onClose={() => setShowForm(false)}>
            <CourseForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
          </Modal>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            variant="cards"
            title="Aucune formation"
            description="Créez vos catalogues de formations pour les associer à vos apprenants."
            action={{ label: 'Nouvelle formation', onClick: () => setShowForm(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(course => {
              const status = STATUS_CONFIG[course.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.planned
              return (
                <div key={course.id} className="relative group/card">
                  <Link to="/training/$id" params={{ id: course.id }}
                    className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-emerald-600" />
                      </div>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', status.class)}>
                        {status.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1 line-clamp-2">
                      {course.title}
                    </h3>
                    {course.type && <p className="text-xs text-gray-500 mb-3">{course.type}</p>}
                    <div className="space-y-1">
                      {course.companies && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Building2 className="w-3 h-3" />{course.companies.name}
                        </div>
                      )}
                      {course.start_date && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(course.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {course.end_date && ` → ${new Date(course.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </div>
                      )}
                      {course.total_hours && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />{course.total_hours}h
                        </div>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => setConfirmDeleteCourse({ id: course.id, title: course.title })}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/card:opacity-100 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
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
    type: initial?.type ?? '',
    status: initial?.status ?? 'planned',
    company_id: initial?.company_id ?? null,
    start_date: initial?.start_date ?? null,
    end_date: initial?.end_date ?? null,
    total_hours: initial?.total_hours ?? null,
  })
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)

  useState(() => {
    import('@/lib/supabase/client').then(({ createClient }) =>
      createClient().from('companies').select('id, name').order('name')
        .then(({ data }) => setCompanies((data as { id: string; name: string }[] | null) ?? []))
    )
  })

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
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={fieldLabel}>Titre *</label>
          <input required value={values.title} onChange={e => set('title', e.target.value)}
            className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Type</label>
          <input value={values.type ?? ''} onChange={e => set('type', e.target.value)}
            placeholder="Ex : Présentiel, E-learning..."
            className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Statut</label>
          <select value={values.status ?? 'planned'} onChange={e => set('status', e.target.value)}
            className={fieldSelect}>
            <option value="planned">Planifiée</option>
            <option value="ongoing">En cours</option>
            <option value="completed">Terminée</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className={fieldLabel}>Entreprise cliente</label>
          <select value={values.company_id ?? ''} onChange={e => set('company_id', e.target.value || null)}
            className={fieldSelect}>
            <option value="">— Aucune —</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={fieldLabel}>Date de début</label>
          <input type="date" value={values.start_date ?? ''} onChange={e => set('start_date', e.target.value || null)}
            className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Date de fin</label>
          <input type="date" value={values.end_date ?? ''} onChange={e => set('end_date', e.target.value || null)}
            className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>Nombre d'heures total</label>
          <input type="number" value={values.total_hours ?? ''} onChange={e => set('total_hours', e.target.value ? parseInt(e.target.value) : null)}
            className={fieldInput} />
        </div>
      </div>
      <FormFooter onCancel={onCancel} saving={saving} />
    </form>
  )
}

export { CourseForm }
