import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { createClient } from '@/lib/supabase/client'

export const Route = createFileRoute('/client')({
  beforeLoad: async ({ location }) => {
    // La route /client/login est publique (magic link)
    if (location.pathname === '/client/login') return

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) throw redirect({ to: '/client/login' })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single() as { data: { role: string } | null; error: unknown }

    if (profile?.role === 'admin') throw redirect({ to: '/dashboard' })
  },
  component: ClientLayout,
})

function ClientLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">L</span>
          </div>
          <span className="font-semibold text-sm">LetShine Talent</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto py-8 px-6">
        <Outlet />
      </main>
    </div>
  )
}
