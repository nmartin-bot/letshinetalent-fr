import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import ClientAgenda from '@/components/client/ClientAgenda'

const clientRoute = getRouteApi('/client')

export const Route = createFileRoute('/client/candidat/agenda')({
  component: CandidatAgenda,
})

function CandidatAgenda() {
  const { entityId } = clientRoute.useLoaderData()
  return <div className="flex-1 min-h-0 flex flex-col"><ClientAgenda entityType="candidate" entityId={entityId} /></div>
}
