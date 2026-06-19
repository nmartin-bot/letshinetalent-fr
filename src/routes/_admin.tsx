import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { createClient } from '@/lib/supabase/client'
import AdminSidebar from '@/components/layout/AdminSidebar'

export const Route = createFileRoute('/_admin')({
  beforeLoad: async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) throw redirect({ to: '/login' })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single() as { data: { role: string } | null; error: unknown }

    if (profile?.role !== 'admin') throw redirect({ to: '/client/dashboard' })
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
