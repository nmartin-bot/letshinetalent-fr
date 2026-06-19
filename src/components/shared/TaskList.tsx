import { useState } from 'react'
import { Plus, Trash2, AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { cn } from '@/lib/utils'

const PRIORITY_CONFIG = {
  high: { label: 'Urgent', class: 'text-red-600 bg-red-50 border-red-200' },
  medium: { label: 'Normal', class: 'text-orange-500 bg-orange-50 border-orange-200' },
  low: { label: 'Faible', class: 'text-gray-400 bg-gray-50 border-gray-200' },
}

export default function TaskList({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { tasks, loading, create, toggle, remove } = useTasks(entityType, entityId)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', priority: 'medium' as 'low' | 'medium' | 'high', due_date: '' })
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await create({ title: form.title, priority: form.priority, due_date: form.due_date || null })
    setForm({ title: '', priority: 'medium', due_date: '' })
    setShowForm(false)
    setSaving(false)
  }

  const pending = tasks.filter(t => !t.completed)
  const done = tasks.filter(t => t.completed)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          Tâches
          {pending.length > 0 && <span className="ml-2 text-xs font-medium bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">{pending.length}</span>}
        </h3>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
          <Plus className="w-4 h-4" />Ajouter
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-50 border rounded-lg p-4 space-y-3">
          <input
            required
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Description de la tâche..."
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-3">
            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as typeof form.priority }))}
              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="low">Faible</option>
              <option value="medium">Normal</option>
              <option value="high">Urgent</option>
            </select>
            <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
              className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-3 py-1.5">Annuler</button>
            <button type="submit" disabled={saving}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Ajouter'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Aucune tâche</p>
      ) : (
        <div className="space-y-1.5">
          {pending.map(task => {
            const isOverdue = task.due_date && task.due_date < today
            return (
              <div key={task.id} className={cn('flex items-start gap-3 p-3 rounded-lg border group',
                isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100 hover:border-gray-200')}>
                <button onClick={() => toggle(task.id, true)} className="mt-0.5 shrink-0 text-gray-300 hover:text-green-500 transition-colors">
                  <Circle className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('text-xs px-1.5 py-0.5 rounded border font-medium', PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.class)}>
                      {PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.label}
                    </span>
                    {task.due_date && (
                      <span className={cn('text-xs flex items-center gap-1', isOverdue ? 'text-red-500 font-medium' : 'text-gray-400')}>
                        {isOverdue && <AlertCircle className="w-3 h-3" />}
                        {new Date(task.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => remove(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}

          {done.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 py-1">
                {done.length} tâche{done.length > 1 ? 's' : ''} terminée{done.length > 1 ? 's' : ''}
              </summary>
              <div className="space-y-1.5 mt-2">
                {done.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 group">
                    <button onClick={() => toggle(task.id, false)} className="shrink-0 text-green-500 hover:text-gray-300 transition-colors">
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <p className="flex-1 text-sm text-gray-400 line-through">{task.title}</p>
                    <button onClick={() => remove(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
