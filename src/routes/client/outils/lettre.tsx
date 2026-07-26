import { createFileRoute } from '@tanstack/react-router'
import { LettreEditor } from '@/routes/outils/lettre'

export const Route = createFileRoute('/client/outils/lettre')({
  component: LettreEditor,
})
