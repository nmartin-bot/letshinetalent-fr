import { createFileRoute } from '@tanstack/react-router'
import { getRouteApi } from '@tanstack/react-router'
import DocumentManager from '@/components/shared/DocumentManager'

const clientRoute = getRouteApi('/client')

export const Route = createFileRoute('/client/apprenant/documents')({
  component: ApprenantDocuments,
})

function ApprenantDocuments() {
  const { entityId } = clientRoute.useLoaderData()
  if (!entityId) return null
  return <div className="flex-1 min-h-0 flex flex-col"><DocumentManager entityType="learner" entityId={entityId} clientMode /></div>
}
