import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_admin/settings/')({
  component: () => (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
      <p className="text-gray-500 mt-1">Module en construction.</p>
    </div>
  ),
})
