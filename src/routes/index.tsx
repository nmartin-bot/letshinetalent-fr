import { createFileRoute, redirect } from '@tanstack/react-router'
import { createClient } from '@/lib/supabase/client'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw redirect({ to: '/login' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single() as { data: { role: string } | null; error: unknown }

    if (profile?.role === 'admin') {
      throw redirect({ to: '/dashboard' })
    } else {
      throw redirect({ to: '/client/dashboard' })
    }
  },
  component: () => null,
})
