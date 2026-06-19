import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Appointment = Database['public']['Tables']['appointments']['Row']
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update']

export type AppointmentWithLabel = Appointment & { entityLabel: string }

async function resolveEntityLabels(appointments: Appointment[]): Promise<AppointmentWithLabel[]> {
  if (!appointments.length) return []
  const supabase = createClient()

  const byType: Record<string, string[]> = {}
  for (const a of appointments) {
    byType[a.entity_type] = byType[a.entity_type] ?? []
    byType[a.entity_type].push(a.entity_id)
  }

  const labels: Record<string, string> = {}

  await Promise.all(Object.entries(byType).map(async ([type, ids]) => {
    if (type === 'candidate') {
      const { data } = await supabase.from('candidates').select('id, first_name, last_name').in('id', ids)
      for (const c of (data ?? []) as { id: string; first_name: string; last_name: string }[])
        labels[c.id] = `${c.first_name} ${c.last_name}`
    } else if (type === 'company') {
      const { data } = await supabase.from('companies').select('id, name').in('id', ids)
      for (const c of (data ?? []) as { id: string; name: string }[])
        labels[c.id] = c.name
    } else if (type === 'learner') {
      const { data } = await supabase.from('learners').select('id, first_name, last_name').in('id', ids)
      for (const l of (data ?? []) as { id: string; first_name: string; last_name: string }[])
        labels[l.id] = `${l.first_name} ${l.last_name}`
    }
  }))

  return appointments.map(a => ({ ...a, entityLabel: labels[a.entity_id] ?? '—' }))
}

export function useAppointments(from?: string, to?: string) {
  const supabase = createClient()
  const [appointments, setAppointments] = useState<AppointmentWithLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState<number | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const [{ count }, periodResult] = await Promise.all([
      supabase.from('appointments').select('*', { count: 'exact', head: true }),
      (async () => {
        let query = supabase.from('appointments').select('*').order('starts_at')
        if (from) query = query.gte('starts_at', from)
        if (to) query = query.lte('starts_at', to)
        return query as unknown as Promise<{ data: Appointment[] | null }>
      })(),
    ])
    setTotalCount(count ?? 0)
    const enriched = await resolveEntityLabels((periodResult as { data: Appointment[] | null }).data ?? [])
    setAppointments(enriched)
    setLoading(false)
  }, [from, to])

  useEffect(() => { fetch() }, [fetch])

  async function create(values: AppointmentInsert) {
    const { data, error } = await supabase.from('appointments').insert(values as never).select().single() as { data: Appointment | null; error: unknown }
    if (!error && data) {
      const [enriched] = await resolveEntityLabels([data])
      setAppointments(prev => [...prev, enriched].sort((a, b) => a.starts_at.localeCompare(b.starts_at)))
      setTotalCount(prev => (prev ?? 0) + 1)
    }
    return { data, error }
  }

  async function update(id: string, values: AppointmentUpdate) {
    const { data, error } = await supabase.from('appointments').update(values as never).eq('id', id).select().single() as { data: Appointment | null; error: unknown }
    if (!error && data) {
      const [enriched] = await resolveEntityLabels([data])
      setAppointments(prev => prev.map(a => a.id === id ? enriched : a))
    }
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (!error) {
      setAppointments(prev => prev.filter(a => a.id !== id))
      setTotalCount(prev => Math.max(0, (prev ?? 1) - 1))
    }
    return { error }
  }

  return { appointments, loading, totalCount, refresh: fetch, create, update, remove }
}
