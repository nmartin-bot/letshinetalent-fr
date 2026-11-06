import { createFileRoute, redirect } from '@tanstack/react-router'
import { createClient } from '@/lib/supabase/client'

export const Route = createFileRoute('/')({
  // Page d'aiguillage sans contenu : elle doit être traitée dans le navigateur, sinon le
  // serveur saute la redirection, le navigateur ne la relance pas, et la page reste blanche.
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === 'undefined') return // skip SSR — les cookies ne sont pas lisibles, cf. _admin.tsx

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
