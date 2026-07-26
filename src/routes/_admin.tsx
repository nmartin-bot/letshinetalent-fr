import { createFileRoute, redirect, Outlet, Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Bell, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AdminSidebar from '@/components/layout/AdminSidebar'
import { ThemeProvider } from '@/contexts/ThemeContext'

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
  const [initials, setInitials] = useState('–')
  const pathname = useRouterState({ select: s => s.location.pathname })
  const hideSecondBar = pathname.startsWith('/settings')
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? ''
      const name = data.user?.user_metadata?.full_name as string | undefined
      if (name) {
        const parts = name.trim().split(' ')
        setInitials((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? ''))
      } else {
        setInitials((email[0] ?? '').toUpperCase())
      }
    })
  }, [])

  return (
    <ThemeProvider>
    <div className="flex h-screen bg-white overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-12 border-b border-gray-100 flex items-center justify-between px-6 shrink-0 bg-white">
          <div id="layout-breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0" />
          <div className="flex items-center gap-1 shrink-0">
            <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors dark:text-amber-400 dark:hover:bg-gray-100">
              <Bell className="w-4 h-4" />
            </button>
            <Link to="/settings" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors dark:text-amber-400 dark:hover:bg-gray-100">
              <Settings className="w-4 h-4" />
            </Link>
            <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-gray-100 flex items-center justify-center text-white dark:text-amber-400 text-xs font-semibold ml-1 uppercase">
              {initials}
            </div>
          </div>
        </div>
        {/* Second bar */}
        {!hideSecondBar && (
          <div className="h-12 border-b border-gray-100 flex items-center justify-between px-6 shrink-0 bg-white">
            <div id="layout-sb-left" className="flex items-center gap-2" />
            <div id="layout-sb-right" className="flex items-center gap-2" />
          </div>
        )}
        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
    </ThemeProvider>
  )
}
