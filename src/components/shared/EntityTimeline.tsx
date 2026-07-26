import { useState, useEffect, useCallback } from 'react'
import { Phone, Mail, Users, Calendar, StickyNote, Plus, FileText, Euro, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useInteractions } from '@/hooks/useInteractions'
import EmptyState from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import Modal, { fieldLabel, fieldTextarea, FormFooter } from '@/components/shared/Modal'

type ActivityItem = {
  id: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  label: string
  description: string
  date: string
}

const INTERACTION_CONFIG = {
  call:    { icon: Phone,      label: 'Appel',    color: 'bg-blue-50 text-blue-500' },
  email:   { icon: Mail,       label: 'Email',    color: 'bg-violet-50 text-violet-500' },
  meeting: { icon: Users,      label: 'Réunion',  color: 'bg-green-50 text-green-500' },
  rdv:     { icon: Calendar,   label: 'RDV',      color: 'bg-orange-50 text-orange-500' },
  note:    { icon: StickyNote, label: 'Note',     color: 'bg-gray-100 text-gray-500' },
} as const

const APPT_STATUS: Record<string, string> = {
  confirmed: 'Confirmé', pending: 'En attente', done: 'Effectué', cancelled: 'Annulé',
}

const APPT_TYPE: Record<string, string> = {
  coaching_1: 'Session 1 — Analyse CV',
  coaching_2: 'Session 2 — Simulation entretien',
  coaching_3: 'Session 3 — Bilan final',
  other: 'Rendez-vous',
}

function useActivityFeed(entityType: string, entityId: string) {
  const supabase = createClient()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const results: ActivityItem[] = []

    type InteractionRow = { id: string; type: string; summary: string; occurred_at: string }
    type AppointmentRow = { id: string; type: string; status: string; starts_at: string; duration_minutes: number; location: string | null }
    type DocumentRow = { id: string; name: string; uploaded_at: string }

    const [intRes, apptRes, docRes, quoteRes] = await Promise.all([
      supabase.from('interactions').select('id,type,summary,occurred_at').eq('entity_type', entityType).eq('entity_id', entityId) as unknown as Promise<{ data: InteractionRow[] | null }>,
      supabase.from('appointments').select('id,type,status,starts_at,duration_minutes,location').eq('entity_type', entityType).eq('entity_id', entityId) as unknown as Promise<{ data: AppointmentRow[] | null }>,
      supabase.from('documents').select('id,name,uploaded_at').eq('entity_type', entityType).eq('entity_id', entityId) as unknown as Promise<{ data: DocumentRow[] | null }>,
      entityType === 'company'
        ? supabase.from('quotes').select('id,reference,status,amount_ht,created_at').eq('company_id', entityId)
        : Promise.resolve({ data: [] as never[] }),
    ])

    for (const i of (intRes.data ?? [])) {
      const cfg = INTERACTION_CONFIG[i.type as keyof typeof INTERACTION_CONFIG] ?? INTERACTION_CONFIG.note
      results.push({ id: `int-${i.id}`, icon: cfg.icon, iconColor: cfg.color, label: cfg.label, description: i.summary, date: i.occurred_at })
    }

    for (const a of (apptRes.data ?? [])) {
      const typeLabel = APPT_TYPE[a.type] ?? a.type ?? 'Rendez-vous'
      const statusLabel = APPT_STATUS[a.status] ?? a.status
      const time = new Date(a.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      results.push({
        id: `appt-${a.id}`, icon: Calendar, iconColor: 'bg-cyan-50 text-cyan-500',
        label: 'Rendez-vous',
        description: `${typeLabel} · ${time} · ${a.duration_minutes} min · ${statusLabel}${a.location ? ` · ${a.location}` : ''}`,
        date: a.starts_at,
      })
    }

    for (const d of (docRes.data ?? [])) {
      results.push({
        id: `doc-${d.id}`, icon: FileText, iconColor: 'bg-emerald-50 text-emerald-500',
        label: 'Document',
        description: d.name,
        date: d.uploaded_at,
      })
    }

    for (const q of ((quoteRes.data ?? []) as { id: string; reference: string | null; status: string; amount_ht: number | null; created_at: string }[])) {
      const STATUS_LABELS: Record<string, string> = { draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', refused: 'Refusé' }
      results.push({
        id: `quote-${q.id}`, icon: Euro, iconColor: 'bg-amber-50 text-amber-500',
        label: 'Devis',
        description: [q.reference ? `#${q.reference}` : null, STATUS_LABELS[q.status] ?? q.status, q.amount_ht != null ? `${q.amount_ht.toLocaleString('fr-FR')} € HT` : null].filter(Boolean).join(' · '),
        date: q.created_at,
      })
    }

    results.sort((a, b) => b.date.localeCompare(a.date))
    setItems(results)
    setLoading(false)
  }, [entityType, entityId])

  useEffect(() => { fetch() }, [fetch])
  return { items, loading, refresh: fetch }
}

type InteractionType = keyof typeof INTERACTION_CONFIG

export default function EntityTimeline({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { items, loading, refresh } = useActivityFeed(entityType, entityId)
  const { create } = useInteractions(entityType, entityId)
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<InteractionType>('note')
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!summary.trim()) return
    setSaving(true)
    await create({ type, summary })
    setSummary('')
    setShowForm(false)
    setSaving(false)
    refresh()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-12 border-b border-gray-100 shrink-0">
        <span className="text-xs font-medium text-gray-500">
          {loading ? '' : `${items.length} événement${items.length !== 1 ? 's' : ''}`}
        </span>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" />Ajouter une note
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Chargement...</div>
      ) : items.length === 0 ? (
        <EmptyState variant="table" title="Aucune activité" description="Les rendez-vous, documents et échanges apparaîtront ici automatiquement." ghostOpacity={0.7} />
      ) : (
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {items.map((item, i) => {
                const Icon = item.icon
                const date = new Date(item.date)
                const isToday = date.toDateString() === new Date().toDateString()
                const dateStr = isToday
                  ? `Aujourd'hui · ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                  : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                return (
                  <tr key={item.id} className={cn('border-b border-gray-50', i % 2 === 0 ? '' : '')}>
                    <td className="pl-6 pr-4 py-3 w-10">
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', item.iconColor)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </td>
                    <td className="pr-4 py-3 w-24">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{item.label}</span>
                    </td>
                    <td className="py-3 flex-1">
                      <span className="text-xs text-gray-700">{item.description}</span>
                    </td>
                    <td className="pr-6 py-3 text-right">
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 justify-end whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {dateStr}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title="Nouvel échange" onClose={() => setShowForm(false)} size="sm">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={fieldLabel}>Type</label>
              <div className="flex gap-1.5 flex-wrap">
                {(Object.keys(INTERACTION_CONFIG) as InteractionType[]).map(t => (
                  <button key={t} type="button" onClick={() => setType(t)}
                    className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                      type === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400')}>
                    {INTERACTION_CONFIG[t].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={fieldLabel}>Résumé</label>
              <textarea autoFocus value={summary} onChange={e => setSummary(e.target.value)}
                placeholder="Résumé de l'échange..." rows={3} className={fieldTextarea} />
            </div>
            <FormFooter onCancel={() => setShowForm(false)} saving={saving} label="Enregistrer" />
          </form>
        </Modal>
      )}
    </div>
  )
}
