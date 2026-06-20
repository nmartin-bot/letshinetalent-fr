import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, FileText, Building2, Euro, Calendar, Pencil, Trash2, Send, CheckCircle, XCircle, Filter, ArrowUpDown, Check, X } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Modal, { fieldLabel, fieldInput, fieldSelect, fieldTextarea, FormFooter } from '@/components/shared/Modal'
import HelpTooltip from '@/components/shared/HelpTooltip'
import { useQuotes } from '@/hooks/useQuotes'
import { useCompanies } from '@/hooks/useCompanies'
import { cn } from '@/lib/utils'
export const Route = createFileRoute('/_admin/quotes/')({
  component: QuotesPage,
})

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', class: 'bg-gray-100 text-gray-600', icon: FileText },
  sent: { label: 'Envoyé', class: 'bg-blue-100 text-blue-700', icon: Send },
  accepted: { label: 'Accepté', class: 'bg-green-100 text-green-700', icon: CheckCircle },
  refused: { label: 'Refusé', class: 'bg-red-100 text-red-600', icon: XCircle },
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['accepted', 'refused'],
  accepted: [],
  refused: ['draft'],
}

const EMPTY_FORM = {
  company_id: '',
  reference: '',
  description: '',
  amount_ht: '',
  amount_ttc: '',
  valid_until: '',
  status: 'draft' as const,
}

const ghostBtn = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors'

function QuotesPage() {
  const { quotes, loading, create, update, remove } = useQuotes()
  const { companies } = useCompanies()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc')
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(q: ReturnType<typeof useQuotes>['quotes'][0]) {
    setForm({
      company_id: q.company_id ?? '',
      reference: q.reference ?? '',
      description: q.description ?? '',
      amount_ht: q.amount_ht?.toString() ?? '',
      amount_ttc: q.amount_ttc?.toString() ?? '',
      valid_until: q.valid_until ?? '',
      status: q.status as typeof EMPTY_FORM.status,
    })
    setEditing(q.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const values = {
      company_id: form.company_id || null,
      reference: form.reference || null,
      description: form.description || null,
      amount_ht: form.amount_ht ? parseFloat(form.amount_ht) : null,
      amount_ttc: form.amount_ttc ? parseFloat(form.amount_ttc) : null,
      valid_until: form.valid_until || null,
      status: form.status,
    }
    if (editing) await update(editing, values as never)
    else await create(values as never)
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(id)
  }

  async function changeStatus(id: string, status: string) {
    await update(id, { status: status as 'draft' | 'sent' | 'accepted' | 'refused' })
  }

  const filtered = [...quotes]
    .filter(q => filterStatus === 'all' || q.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'date_desc') return b.created_at.localeCompare(a.created_at)
      if (sortBy === 'date_asc') return a.created_at.localeCompare(b.created_at)
      if (sortBy === 'amount_desc') return (b.amount_ht ?? 0) - (a.amount_ht ?? 0)
      return (a.amount_ht ?? 0) - (b.amount_ht ?? 0)
    })

  const totals = {
    accepted: quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.amount_ht ?? 0), 0),
    sent: quotes.filter(q => q.status === 'sent').reduce((s, q) => s + (q.amount_ht ?? 0), 0),
  }

  const STATUS_TABS = [{ id: 'all', label: 'Tous' }, ...Object.entries(STATUS_CONFIG).map(([id, { label }]) => ({ id, label }))]

  return (
    <>
      <PageHeader
        pathItems={[{ label: 'Commerce' }, { label: 'Devis' }]}
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
                    {([['date_desc', 'Plus récent'], ['date_asc', 'Plus ancien'], ['amount_desc', 'Montant ↓'], ['amount_asc', 'Montant ↑']] as const).map(([id, label]) => (
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
              id="quotes-statuts"
              title="Cycle de vie d'un devis"
              description="Un devis suit le parcours : Brouillon → Envoyé → Accepté ou Refusé. Changez le statut depuis la liste en cliquant sur les boutons d'action."
              visual={
                <div className="flex items-center gap-1">
                  {[['Brouillon', 'bg-gray-100 text-gray-500'], ['Envoyé', 'bg-blue-100 text-blue-600'], ['Accepté', 'bg-emerald-100 text-emerald-700']].map(([label, cls], i) => (
                    <div key={label} className="flex items-center gap-1">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>
                      {i < 2 && <span className="text-[9px] text-gray-300">→</span>}
                    </div>
                  ))}
                </div>
              }
            />
            <span className="text-xs text-gray-400">{filtered.length} devis</span>
            <div className="w-px h-4 bg-gray-200" />
            <button onClick={openCreate}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" />Nouveau devis
            </button>
          </>
        }
      />

      {/* Content */}
      <div className="h-full overflow-y-auto px-8 py-6">

        {/* KPIs — masqués si aucun devis */}
        {quotes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = quotes.filter(q => q.status === key).length
              return (
                <div key={key} className="bg-white rounded-xl border p-4">
                  <p className="text-sm text-gray-500">{cfg.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Montants */}
        {(totals.accepted > 0 || totals.sent > 0) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {totals.accepted > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-700">CA signé (HT)</p>
                <p className="text-2xl font-bold text-green-800 mt-1">{totals.accepted.toLocaleString('fr-FR')} €</p>
              </div>
            )}
            {totals.sent > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700">En attente (HT)</p>
                <p className="text-2xl font-bold text-blue-800 mt-1">{totals.sent.toLocaleString('fr-FR')} €</p>
              </div>
            )}
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            variant="list"
            title="Aucun devis"
            description="Créez vos devis et suivez leur statut jusqu'à la signature."
            action={{ label: 'Nouveau devis', onClick: openCreate }}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(quote => {
              const statusCfg = STATUS_CONFIG[quote.status as keyof typeof STATUS_CONFIG]
              const transitions = STATUS_TRANSITIONS[quote.status] ?? []
              return (
                <div key={quote.id} className="bg-white rounded-xl border hover:border-gray-300 transition-colors p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusCfg.class)}>
                          {statusCfg.label}
                        </span>
                        {quote.reference && <span className="text-sm font-semibold text-gray-700">#{quote.reference}</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        {quote.companies && (
                          <span className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            {quote.companies.name}
                          </span>
                        )}
                        {quote.amount_ht != null && (
                          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                            <Euro className="w-4 h-4 text-gray-400" />
                            {quote.amount_ht.toLocaleString('fr-FR')} € HT
                            {quote.amount_ttc != null && <span className="text-xs text-gray-400 font-normal">({quote.amount_ttc.toLocaleString('fr-FR')} € TTC)</span>}
                          </span>
                        )}
                        {quote.valid_until && (
                          <span className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            Valable jusqu'au {new Date(quote.valid_until).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                      {quote.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{quote.description}</p>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {transitions.map(next => {
                        const cfg = STATUS_CONFIG[next as keyof typeof STATUS_CONFIG]
                        return (
                          <button key={next} onClick={() => changeStatus(quote.id, next)}
                            className={cn('text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors', cfg.class, 'hover:opacity-80')}>
                            → {cfg.label}
                          </button>
                        )
                      })}
                      <button onClick={() => openEdit(quote)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(quote.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal formulaire */}
        {confirmDeleteId && (
          <ConfirmDialog
            title="Supprimer ce devis ?"
            description="Le devis sera définitivement supprimé de votre liste."
            confirmLabel="Supprimer"
            icon={Trash2}
            onConfirm={async () => { await remove(confirmDeleteId); setConfirmDeleteId(null) }}
            onCancel={() => setConfirmDeleteId(null)}
          />
        )}

        {showForm && (
          <Modal
            title={editing ? 'Modifier le devis' : 'Nouveau devis'}
            subtitle="Créez ou mettez à jour un devis pour une entreprise."
            onClose={() => setShowForm(false)}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={fieldLabel}>Entreprise</label>
                <select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))} className={fieldSelect}>
                  <option value="">— Sélectionner —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={fieldLabel}>Référence</label>
                  <input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                    placeholder="DEV-2024-001" className={fieldInput} />
                </div>
                <div>
                  <label className={fieldLabel}>Valable jusqu'au</label>
                  <input type="date" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} className={fieldInput} />
                </div>
              </div>
              <div>
                <label className={fieldLabel}>Description / Objet</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3} placeholder="Formation CPF, coaching bilan de compétences..." className={fieldTextarea} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={fieldLabel}>Montant HT (€)</label>
                  <input type="number" step="0.01" value={form.amount_ht} onChange={e => setForm(p => ({ ...p, amount_ht: e.target.value }))}
                    placeholder="0.00" className={fieldInput} />
                </div>
                <div>
                  <label className={fieldLabel}>Montant TTC (€)</label>
                  <input type="number" step="0.01" value={form.amount_ttc} onChange={e => setForm(p => ({ ...p, amount_ttc: e.target.value }))}
                    placeholder="0.00" className={fieldInput} />
                </div>
              </div>
              <FormFooter onCancel={() => setShowForm(false)} saving={saving} label={editing ? 'Enregistrer' : 'Créer le devis'} />
            </form>
          </Modal>
        )}
      </div>
    </>
  )
}
