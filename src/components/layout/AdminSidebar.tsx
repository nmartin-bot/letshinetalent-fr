import { Link, useNavigate } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  Calendar,
  FileText,
  FileSearch,
  Quote,
  Settings,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/companies', icon: Building2, label: 'Entreprises' },
  { to: '/candidates', icon: Users, label: 'Candidats' },
  { to: '/learners', icon: GraduationCap, label: 'Apprenants' },
  { to: '/training', icon: FileText, label: 'Formations' },
  { to: '/appointments', icon: Calendar, label: 'Agenda' },
  { to: '/ats', icon: FileSearch, label: 'Candidatures' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/quotes', icon: Quote, label: 'Devis' },
] as const

export default function AdminSidebar() {
  const navigate = useNavigate()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    navigate({ to: '/login' })
  }

  return (
    <aside className="w-64 flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">L</span>
        </div>
        <div>
          <p className="font-semibold text-sm leading-none">LetShine Talent</p>
          <p className="text-xs text-gray-400 mt-0.5">Espace coach</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
              '[&.active]:bg-blue-50 [&.active]:text-blue-700'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Paramètres</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
