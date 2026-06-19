import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, X, UserPlus, Trash2, ExternalLink, Mail, Phone, Search } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import { useAts } from '@/hooks/useAts'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

export const Route = createFileRoute('/_admin/ats/')({
  component: AtsPage,
})

type Application = Database['public']['Tables']['ats_applications']['Row']
type Status = Application['status']

const COLUMNS: { id: Status; label: string; color: string; dot: string }[] = [
  { id: 'new', label: 'Nouvelles', color: 'bg-blue-50 border-blue-200', dot: 'bg-blue-400' },
  { id: 'reviewing', label: 'En étude', color: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-400' },
  { id: 'interview', label: 'Entretien', color: 'bg-purple-50 border-purple-200', dot: 'bg-purple-400' },
  { id: 'accepted', label: 'Acceptées', color: 'bg-green-50 border-green-200', dot: 'bg-green-400' },
  { id: 'refused', label: 'Refusées', color: 'bg-red-50 border-red-200', dot: 'bg-red-400' },
]

const SOURCE_LABELS: Record<string, string> = {
  website: 'Site web',
  linkedin: 'LinkedIn',
  referral: 'Recommandation',
  manual: 'Ajout manuel',
  other: 'Autre',
}

function AtsPage() {
  const { applications, loading, create, updateStatus, convertToCandidate, remove } = useAts()
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Application | null>(null)
  const [converting, setConverting] = useState(false)
  const [search, setSearch] = useState('')

  const filteredApplications = search
    ? applications.filter(a =>
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (a.position ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : applications

  async function handleConvert(app: Application) {
    if (!confirm(`Convertir ${app.first_name} ${app.last_name} en fiche candidat ?`)) return
    setConverting(true)
    await convertToCandidate(app)
    setSelected(null)
    setConverting(false)
  }

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>

  return (
    <>
      <PageHeader
        pathItems={[{ label: 'Recrutement' }, { label: 'Candidatures' }]}
        secondBarLeft={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un candidat..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 w-56 placeholder:text-gray-300" />
          </div>
        }
        secondBarRight={
          <>
            <span className="text-xs text-gray-400">{applications.length} candidature{applications.length > 1 ? 's' : ''}</span>
            <div className="w-px h-4 bg-gray-200" />
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" />Ajouter
            </button>
          </>
        }
      />

      {/* Modal ajout */}
      {showForm && <AddForm onSubmit={async v => { await create(v); setShowForm(false) }} onCancel={() => setShowForm(false)} />}

      {/* Modal détail */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{selected.first_name} {selected.last_name}</h3>
                {selected.position && <p className="text-sm text-gray-500">{selected.position}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {selected.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{selected.email}</div>}
              {selected.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{selected.phone}</div>}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                Source : {SOURCE_LABELS[selected.source] ?? selected.source} · {new Date(selected.applied_at).toLocaleDateString('fr-FR')}
              </div>
            </div>

            {selected.notes && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-4">{selected.notes}</p>
            )}

            {selected.cv_url && (
              <a href={selected.cv_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-4">
                <ExternalLink className="w-4 h-4" />Voir le CV
              </a>
            )}

            <div className="border-t pt-4 space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Changer le statut</p>
              <div className="flex flex-wrap gap-2">
                {COLUMNS.map(col => (
                  <button key={col.id} onClick={() => { updateStatus(selected.id, col.id); setSelected(s => s ? { ...s, status: col.id } : null) }}
                    className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-all',
                      selected.status === col.id ? col.color + ' ring-2 ring-offset-1 ring-current' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')}>
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              {selected.candidate_id ? (
                <Link to="/candidates/$id" params={{ id: selected.candidate_id }}
                  className="flex items-center gap-2 text-sm text-green-600 font-medium hover:underline">
                  <UserPlus className="w-4 h-4" />Voir la fiche candidat
                </Link>
              ) : (
                <button onClick={() => handleConvert(selected)} disabled={converting}
                  className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-700 disabled:opacity-50">
                  <UserPlus className="w-4 h-4" />{converting ? 'Conversion...' : 'Convertir en candidat'}
                </button>
              )}
              <button onClick={() => { remove(selected.id); setSelected(null) }}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600">
                <Trash2 className="w-4 h-4" />Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state global */}
      {!loading && applications.length === 0 && (
        <EmptyState
          variant="kanban"
          title="Aucune candidature"
          description="Ajoutez vos candidatures pour les suivre étape par étape jusqu'à l'embauche."
          action={{ label: 'Ajouter une candidature', onClick: () => setShowForm(true) }}
          className="flex-1 h-full"
        />
      )}

      {/* Kanban */}
      {applications.length > 0 && <div className="flex gap-4 overflow-x-auto flex-1 pb-2 px-8">
        {COLUMNS.map(col => {
          const cards = filteredApplications.filter(a => a.status === col.id)
          return (
            <div key={col.id} className="flex flex-col min-w-[240px] w-[240px]">
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('w-2 h-2 rounded-full', col.dot)} />
                <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{cards.length}</span>
              </div>
              <div className={cn('flex-1 rounded-xl border p-2 space-y-2 overflow-y-auto', col.color)}>
                {cards.map(app => (
                  <button key={app.id} onClick={() => setSelected(app)}
                    className="w-full text-left bg-white rounded-lg border border-gray-100 shadow-sm p-3 hover:shadow-md transition-shadow">
                    <p className="font-medium text-sm text-gray-900">{app.first_name} {app.last_name}</p>
                    {app.position && <p className="text-xs text-gray-500 mt-0.5 truncate">{app.position}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">{SOURCE_LABELS[app.source] ?? app.source}</span>
                      <span className="text-xs text-gray-400">{new Date(app.applied_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    {app.candidate_id && (
                      <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                        <UserPlus className="w-3 h-3" />Converti
                      </span>
                    )}
                  </button>
                ))}
                {cards.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">Aucune candidature</p>
                )}
              </div>
            </div>
          )
        })}
      </div>}
    </>
  )
}

function AddForm({ onSubmit, onCancel }: {
  onSubmit: (v: Database['public']['Tables']['ats_applications']['Insert']) => Promise<void>
  onCancel: () => void
}) {
  const [values, setValues] = useState({
    first_name: '', last_name: '', email: '', phone: '', position: '',
    source: 'manual' as const, notes: '', cv_url: '',
  })
  const [saving, setSaving] = useState(false)

  function set(field: string, value: string) { setValues(p => ({ ...p, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSubmit({ ...values, status: 'new' })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">Ajouter une candidature</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input required value={values.first_name} onChange={e => set('first_name', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input required value={values.last_name} onChange={e => set('last_name', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={values.email} onChange={e => set('email', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input value={values.phone} onChange={e => set('phone', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poste visé</label>
              <input value={values.position} onChange={e => set('position', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select value={values.source} onChange={e => set('source', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lien CV</label>
              <input value={values.cv_url} onChange={e => set('cv_url', e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={values.notes} onChange={e => set('notes', e.target.value)} rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600">Annuler</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
