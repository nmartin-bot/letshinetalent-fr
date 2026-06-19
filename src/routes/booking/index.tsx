import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/booking/')({
  component: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl border shadow-sm text-center">
        <h1 className="text-xl font-bold text-gray-900">Prendre un rendez-vous</h1>
        <p className="text-gray-500 mt-2 text-sm">Module de booking en construction.</p>
      </div>
    </div>
  ),
})
