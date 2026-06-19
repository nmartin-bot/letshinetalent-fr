import { useState } from 'react'
import { Phone, Mail, Users, Calendar, StickyNote, Plus } from 'lucide-react'
import { useInteractions } from '@/hooks/useInteractions'
import { cn } from '@/lib/utils'

const TYPE_CONFIG = {
  call: { icon: Phone, label: 'Appel', color: 'text-blue-500 bg-blue-50' },
  email: { icon: Mail, label: 'Email', color: 'text-purple-500 bg-purple-50' },
  meeting: { icon: Users, label: 'Réunion', color: 'text-green-500 bg-green-50' },
  rdv: { icon: Calendar, label: 'RDV', color: 'text-orange-500 bg-orange-50' },
  note: { icon: StickyNote, label: 'Note', color: 'text-gray-500 bg-gray-100' },
} as const

type InteractionType = keyof typeof TYPE_CONFIG

export default function EntityTimeline({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { interactions, loading, create } = useInteractions(entityType, entityId)
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
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Historique</h3>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 space-y-3 border">
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(TYPE_CONFIG) as InteractionType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                )}
              >
                {TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="Résumé de l'échange..."
            rows={3}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !summary.trim()}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : interactions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Aucun échange enregistré</p>
      ) : (
        <div className="space-y-3">
          {interactions.map(item => {
            const config = TYPE_CONFIG[item.type as InteractionType] ?? TYPE_CONFIG.note
            const Icon = config.icon
            return (
              <div key={item.id} className="flex gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', config.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-gray-500">{config.label}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(item.occurred_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{item.summary}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
