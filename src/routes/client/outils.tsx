import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { OutilsThemeContext, GuideModal } from '@/routes/outils'
import { BookOpen, Download } from 'lucide-react'

async function downloadAsPdf(selector: string, filename: string) {
  const { default: html2canvas } = await import('html2canvas')
  const { default: jsPDF } = await import('jspdf')
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return
  const clone = el.cloneNode(true) as HTMLElement
  clone.style.cssText = 'display:block;width:794px;height:1123px;overflow:hidden;'
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;overflow:hidden;'
  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)
  const canvas = await html2canvas(clone, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 794, height: 1123, windowWidth: 794, windowHeight: 1123 })
  document.body.removeChild(wrapper)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pdfW = pdf.internal.pageSize.getWidth()
  const pdfH = pdf.internal.pageSize.getHeight()
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH)
  pdf.save(filename)
}

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
          {isCV && (
            <button onClick={() => downloadAsPdf('.cv-preview-shell', 'mon-cv.pdf')}
              className="flex items-center gap-1.5 text-xs text-white bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-lg font-medium transition-colors">
              <Download className="w-3.5 h-3.5" />Télécharger PDF
            </button>
          )}
          {isLettre && (
            <button onClick={() => downloadAsPdf('.lettre-preview-shell', 'ma-lettre.pdf')}
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
