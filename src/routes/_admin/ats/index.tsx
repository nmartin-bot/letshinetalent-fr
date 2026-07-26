import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, UserPlus, GraduationCap, Trash2, ExternalLink, Mail, Phone, ArrowUpDown, Check, X, ChevronRight, FileText, ScrollText } from 'lucide-react'
import { DocViewer } from '@/components/shared/DocPreview'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Modal, { fieldLabel, fieldSelect, fieldInput, fieldTextarea, FormFooter } from '@/components/shared/Modal'
import HelpTooltip from '@/components/shared/HelpTooltip'
import { useAts } from '@/hooks/useAts'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

export const Route = createFileRoute('/_admin/ats/')({
  component: AtsPage,
})

type Application = Database['public']['Tables']['ats_applications']['Row']

const SOURCE_LABELS: Record<string, string> = {
  website:  'Site web',
  linkedin: 'LinkedIn',
  referral: 'Recommandation',
  manual:   'Ajout manuel',
  other:    'Autre',
}

const ghostBtn = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors'

type ConvertStep = 'choose' | 'learner' | 'confirm_candidate'

function AtsPage() {
  const { applications, loading, create, convertToCandidate, convertToLearner, remove } = useAts()
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Application | null>(null)
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc'>('date_desc')
  const [showSort, setShowSort] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [previewDoc, setPreviewDoc] = useState<{ id: string; name: string; file_url: string; mime_type: string | null; file_size: number | null } | null>(null)
  const [convertApp, setConvertApp] = useState<Application | null>(null)
  const [convertStep, setConvertStep] = useState<ConvertStep>('choose')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [learnerType, setLearnerType] = useState<'external' | 'company'>('external')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    if (convertStep === 'learner') {
      const client = createClient()
      if (courses.length === 0) client.from('training_courses').select('id, title').order('title').then(({ data }) => setCourses(data ?? []))
      if (companies.length === 0) client.from('companies').select('id, name').order('name').then(({ data }) => setCompanies(data ?? []))
    }
  }, [convertStep])

  const sorted = [...applications].sort((a, b) => {
    if (sortBy === 'date_asc') return a.applied_at.localeCompare(b.applied_at)
    if (sortBy === 'name_asc') return `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)
    return b.applied_at.localeCompare(a.applied_at)
  })

  function openConvert(app: Application) {
    setConvertApp(app)
    setConvertStep('choose')
    setSelectedCourseId('')
    setLearnerType('external')
    setSelectedCompanyId('')
    setSelected(null)
  }

  async function handleConvert() {
    if (!convertApp) return
    setConverting(true)
    if (convertStep === 'confirm_candidate') {
      await convertToCandidate(convertApp)
    } else if (convertStep === 'learner') {
      if (!selectedCourseId) { setConverting(false); return }
      await convertToLearner(convertApp, selectedCourseId, learnerType === 'company' ? selectedCompanyId || null : null)
    }
    setConverting(false)
    setConvertApp(null)
  }

  return (
    <>
      <PageHeader
        pathItems={[{ label: 'Recrutement' }, { label: 'Candidatures' }]}
        secondBarLeft={
          <>
            <div className="relative">
              <button onClick={() => setShowSort(v => !v)} className={ghostBtn}>
                <ArrowUpDown className="w-3.5 h-3.5" />Trier
              </button>
              {showSort && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                  <div className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 min-w-[180px]">
                    <p className="text-xs text-gray-400 uppercase tracking-wide px-2 py-1.5 font-medium">Trier par</p>
                    {([['date_desc', 'Plus récente'], ['date_asc', 'Plus ancienne'], ['name_asc', 'Nom A → Z']] as const).map(([id, label]) => (
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
          </>
        }
        secondBarRight={
          <>
            <HelpTooltip
              id="ats-list"
              title="Candidatures entrantes"
              description="Les candidatures reçues (formulaire, site web, etc.) arrivent ici. Assignez-les en fiche candidat (coaching, bilan) ou apprenant (formation)."
            />
            <span className="text-xs text-gray-400">{applications.length} candidature{applications.length > 1 ? 's' : ''}</span>
            <div className="w-px h-4 bg-gray-200" />
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" />Ajouter
            </button>
          </>
        }
      />

      <div className="h-full overflow-auto bg-white">
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Chargement...</div>
        ) : sorted.length === 0 ? (
          <EmptyState
            variant="table"
            title="Aucune candidature"
            description="Les candidatures reçues apparaîtront ici. Vous pouvez aussi en ajouter manuellement."
            action={{ label: 'Ajouter une candidature', onClick: () => setShowForm(true) }}
          />
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pl-6 pr-4 py-2.5 text-xs font-medium text-gray-400">Personne</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Contact</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Demande</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Source</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">Assigné à</th>
                <th className="pr-6 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(app => {
                const isConverted = app.candidate_id || app.learner_id
                return (
                  <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
                    <td className="pl-6 pr-4 py-3">
                      <button onClick={() => setSelected(app)} className="flex items-center gap-2.5 text-left group/link">
                        <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold text-gray-500">
                          {app.first_name[0]}{app.last_name[0]}
                        </div>
                        <span className="font-medium text-gray-900 group-hover/link:text-blue-600 transition-colors">
                          {app.first_name} {app.last_name}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div className="space-y-0.5">
                        {app.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-300" />{app.email}</div>}
                        {app.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-300" />{app.phone}</div>}
                        {!app.email && !app.phone && <span className="text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px]">
                      <span className="truncate block">{app.position || <span className="text-gray-300">—</span>}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {SOURCE_LABELS[app.source] ?? app.source}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(app.applied_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3">
                      {app.candidate_id ? (
                        <Link to="/candidates/$id" params={{ id: app.candidate_id }}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors">
                          <UserPlus className="w-2.5 h-2.5" />Candidat
                        </Link>
                      ) : app.learner_id ? (
                        <Link to="/learners/$id" params={{ id: app.learner_id }}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                          <GraduationCap className="w-2.5 h-2.5" />Apprenant
                        </Link>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="pr-6 py-3">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isConverted && (
                          <button onClick={() => openConvert(app)}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 hover:text-gray-900 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                            <UserPlus className="w-3 h-3" />Assigner
                          </button>
                        )}
                        {app.cv_url && (
                          <button
                            onClick={() => setPreviewDoc({ id: app.id + '_cv', name: `CV - ${app.first_name} ${app.last_name}`, file_url: app.cv_url!, mime_type: 'application/pdf', file_size: null })}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 hover:text-gray-900 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                            <FileText className="w-3 h-3" />CV
                          </button>
                        )}
                        {app.cover_letter_url && (
                          <button
                            onClick={() => setPreviewDoc({ id: app.id + '_lettre', name: `Lettre - ${app.first_name} ${app.last_name}`, file_url: app.cover_letter_url!, mime_type: 'application/pdf', file_size: null })}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 hover:text-gray-900 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                            <ScrollText className="w-3 h-3" />Lettre
                          </button>
                        )}
                        <button onClick={() => setConfirmDeleteId(app.id)}
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

      {/* Détail */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{selected.first_name} {selected.last_name}</h3>
                {selected.position && <p className="text-sm text-gray-500">{selected.position}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {selected.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{selected.email}</div>}
              {selected.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{selected.phone}</div>}
              <div className="text-xs text-gray-400">Source : {SOURCE_LABELS[selected.source] ?? selected.source} · {new Date(selected.applied_at).toLocaleDateString('fr-FR')}</div>
            </div>
            {selected.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-4">{selected.notes}</p>}
            {selected.cv_url && (
              <a href={selected.cv_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-4">
                <ExternalLink className="w-4 h-4" />Voir le CV
              </a>
            )}
            <div className="flex items-center justify-between pt-4 border-t">
              {selected.candidate_id ? (
                <Link to="/candidates/$id" params={{ id: selected.candidate_id }} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline">
                  <UserPlus className="w-4 h-4" />Voir la fiche candidat
                </Link>
              ) : selected.learner_id ? (
                <Link to="/learners/$id" params={{ id: selected.learner_id }} className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium hover:underline">
                  <GraduationCap className="w-4 h-4" />Voir la fiche apprenant
                </Link>
              ) : (
                <button onClick={() => openConvert(selected)} className="flex items-center gap-1.5 text-sm text-gray-700 font-medium hover:text-gray-900">
                  <UserPlus className="w-4 h-4" />Assigner à un type
                </button>
              )}
              <button onClick={() => { setConfirmDeleteId(selected.id); setSelected(null) }} className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal conversion */}
      {convertApp && (
        <Modal title="Assigner la candidature" subtitle={`${convertApp.first_name} ${convertApp.last_name}`} onClose={() => setConvertApp(null)} size="sm">
          {convertStep === 'choose' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-4">Que voulez-vous créer à partir de cette candidature ?</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setConvertStep('confirm_candidate')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all group">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-900">Candidat</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Coaching, bilan...</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 self-end" />
                </button>
                <button onClick={() => setConvertStep('learner')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all group">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-900">Apprenant</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Formation, CPF...</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 self-end" />
                </button>
              </div>
            </div>
          )}
          {convertStep === 'confirm_candidate' && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                Une fiche candidat sera créée pour <strong>{convertApp.first_name} {convertApp.last_name}</strong> avec ses coordonnées.
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConvertStep('choose')} className="px-3 py-1.5 text-xs text-gray-500 rounded-lg border border-gray-200 hover:bg-gray-50">Retour</button>
                <button onClick={handleConvert} disabled={converting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg disabled:opacity-50">
                  <UserPlus className="w-3.5 h-3.5" />{converting ? 'Création...' : 'Créer la fiche candidat'}
                </button>
              </div>
            </div>
          )}
          {convertStep === 'learner' && (
            <div className="space-y-4">
              <div>
                <label className={fieldLabel}>Type d'apprenant</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {([['external', 'Externe', 'Particulier, indépendant...'], ['company', 'Entreprise', 'Salarié lié à une entreprise']] as const).map(([val, label, sub]) => (
                    <button key={val} type="button" onClick={() => setLearnerType(val)}
                      className={cn(
                        'flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all',
                        learnerType === val ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      )}>
                      <span className="text-xs font-semibold">{label}</span>
                      <span className={cn('text-[10px]', learnerType === val ? 'text-white/60' : 'text-gray-400')}>{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
              {learnerType === 'company' && (
                <div>
                  <label className={fieldLabel}>Entreprise *</label>
                  <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} className={fieldSelect}>
                    <option value="">— Sélectionner —</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className={fieldLabel}>Formation à rejoindre *</label>
                <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className={fieldSelect}>
                  <option value="">— Sélectionner une formation —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConvertStep('choose')} className="px-3 py-1.5 text-xs text-gray-500 rounded-lg border border-gray-200 hover:bg-gray-50">Retour</button>
                <button onClick={handleConvert}
                  disabled={converting || !selectedCourseId || (learnerType === 'company' && !selectedCompanyId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg disabled:opacity-50">
                  <GraduationCap className="w-3.5 h-3.5" />{converting ? 'Création...' : 'Créer la fiche apprenant'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Supprimer cette candidature ?"
          description="La candidature sera définitivement supprimée."
          confirmLabel="Supprimer"
          icon={Trash2}
          onConfirm={async () => { await remove(confirmDeleteId); setConfirmDeleteId(null) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {showForm && <AddForm onSubmit={async v => { await create(v); setShowForm(false) }} onCancel={() => setShowForm(false)} />}
      {previewDoc && <DocViewer doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </>
  )
}

function AddForm({ onSubmit, onCancel }: {
  onSubmit: (v: Database['public']['Tables']['ats_applications']['Insert']) => Promise<void>
  onCancel: () => void
}) {
  const [values, setValues] = useState({ first_name: '', last_name: '', email: '', phone: '', position: '', source: 'manual' as const, notes: '', cv_url: '' })
  const [saving, setSaving] = useState(false)
  function set(field: string, value: string) { setValues(p => ({ ...p, [field]: value })) }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    await onSubmit({ ...values, status: 'new' }); setSaving(false)
  }
  return (
    <Modal title="Nouvelle candidature" subtitle="Ajoutez manuellement une candidature." onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={fieldLabel}>Prénom *</label><input required value={values.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Marie" className={fieldInput} /></div>
          <div><label className={fieldLabel}>Nom *</label><input required value={values.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Dupont" className={fieldInput} /></div>
          <div><label className={fieldLabel}>Email</label><input type="email" value={values.email} onChange={e => set('email', e.target.value)} placeholder="marie@email.com" className={fieldInput} /></div>
          <div><label className={fieldLabel}>Téléphone</label><input value={values.phone} onChange={e => set('phone', e.target.value)} placeholder="06 00 00 00 00" className={fieldInput} /></div>
          <div><label className={fieldLabel}>Demande / Poste</label><input value={values.position} onChange={e => set('position', e.target.value)} placeholder="Bilan de compétences, CPF..." className={fieldInput} /></div>
          <div>
            <label className={fieldLabel}>Source</label>
            <select value={values.source} onChange={e => set('source', e.target.value)} className={fieldSelect}>
              {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className={fieldLabel}>Lien CV / Document</label><input value={values.cv_url} onChange={e => set('cv_url', e.target.value)} placeholder="https://..." className={fieldInput} /></div>
          <div className="col-span-2"><label className={fieldLabel}>Notes</label><textarea value={values.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Contexte, besoins..." className={fieldTextarea} /></div>
        </div>
        <FormFooter onCancel={onCancel} saving={saving} label="Ajouter la candidature" />
      </form>
    </Modal>
  )
}
