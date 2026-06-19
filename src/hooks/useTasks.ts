import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']

export function useTasks(entityType: string, entityId: string) {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('completed')
      .order('due_date', { nullsFirst: false })
      .order('created_at', { ascending: false }) as { data: Task[] | null }
    setTasks(data ?? [])
    setLoading(false)
  }, [entityType, entityId])

  useEffect(() => { fetch() }, [fetch])

  async function create(values: Pick<TaskInsert, 'title' | 'priority' | 'due_date'>) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...values, entity_type: entityType, entity_id: entityId } as never)
      .select().single() as { data: Task | null; error: unknown }
    if (!error && data) setTasks(prev => [data, ...prev])
    return { data, error }
  }

  async function toggle(id: string, completed: boolean) {
    const { data, error } = await supabase.from('tasks').update({ completed } as never).eq('id', id).select().single() as { data: Task | null; error: unknown }
    if (!error && data) setTasks(prev => prev.map(t => t.id === id ? data : t).sort((a, b) => Number(a.completed) - Number(b.completed)))
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) setTasks(prev => prev.filter(t => t.id !== id))
    return { error }
  }

  return { tasks, loading, create, toggle, remove }
}
