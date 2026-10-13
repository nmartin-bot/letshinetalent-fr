import { createFileRoute } from '@tanstack/react-router'
import { ClientFormations } from '@/routes/client/apprenant/formations'

export const Route = createFileRoute('/client/candidat/formations')({
  component: () => <ClientFormations subjectType="candidate" />,
})
