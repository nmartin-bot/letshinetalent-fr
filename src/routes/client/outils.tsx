import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { OutilsThemeContext, GuideModal } from '@/routes/outils'
import { BookOpen, Download } from 'lucide-react'

export const Route = createFileRoute('/client/outils')({
  component: ClientOutilsLayout,
})

function ClientOutilsLayout() {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const isCV = pathname.startsWith('/client/outils/cv')
  const isLettre = pathname.startsWith('/client/outils/lettre')

  const dark = false
  const [guideOpen, setGuideOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const slot = mounted ? document.getElementById('client-header-slot') : null

  return (
    <OutilsThemeContext.Provider value={{ dark }}>
      {slot && createPortal(
        <div className="flex items-center gap-2 ml-auto">
          {isCV && (
            <button onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
              <BookOpen className="w-3.5 h-3.5" />Aide à la rédaction
            </button>
          )}
          {(isCV || isLettre) && (
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs text-white bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-lg font-medium transition-colors">
              <Download className="w-3.5 h-3.5" />Télécharger PDF
            </button>
          )}
        </div>,
        slot
      )}
      <div className="flex-1 flex overflow-hidden">
        <Outlet />
      </div>
      {mounted && guideOpen && <GuideModal onClose={() => setGuideOpen(false)} dark={dark} />}
    </OutilsThemeContext.Provider>
  )
}
