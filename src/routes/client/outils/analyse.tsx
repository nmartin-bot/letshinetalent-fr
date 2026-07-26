import { createFileRoute } from '@tanstack/react-router'
import { AnalyseATS } from '@/routes/outils/analyse'

export const Route = createFileRoute('/client/outils/analyse')({
  component: AnalyseATS,
})
