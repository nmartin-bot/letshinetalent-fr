import { createFileRoute } from '@tanstack/react-router'
import { CVEditor } from '@/routes/outils/cv'

export const Route = createFileRoute('/client/outils/cv')({
  component: CVEditor,
})
