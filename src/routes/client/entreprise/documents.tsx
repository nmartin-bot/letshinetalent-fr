import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import DocumentManager from '@/components/shared/DocumentManager'

const clientRoute = getRouteApi('/client')

export const Route = createFileRoute('/client/entreprise/documents')({
  component: EntrepriseDocuments,
})

function EntrepriseDocuments() {
  const { entityId } = clientRoute.useLoaderData()
  if (!entityId) return null
  return <div className="flex-1 min-h-0 flex flex-col"><DocumentManager entityType="company" entityId={entityId} clientMode /></div>
}
