import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_admin/quotes/')({
  component: () => (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">quotes</h1>
      <p className="text-gray-500 mt-1">Module en construction.</p>
    </div>
  ),
})
