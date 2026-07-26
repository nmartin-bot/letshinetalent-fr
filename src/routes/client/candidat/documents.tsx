import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import DocumentManager from '@/components/shared/DocumentManager'

const clientRoute = getRouteApi('/client')

export const Route = createFileRoute('/client/candidat/documents')({
  component: CandidatDocuments,
})

function CandidatDocuments() {
  const { entityId } = clientRoute.useLoaderData()
  if (!entityId) return null
  return <div className="flex-1 min-h-0 flex flex-col"><DocumentManager entityType="candidate" entityId={entityId} clientMode /></div>
}
