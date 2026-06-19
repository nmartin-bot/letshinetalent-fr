import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/client/dashboard')({
  component: () => (
    <div>
      <h1 className="text-xl font-bold text-gray-900">Mon espace</h1>
      <p className="text-gray-500 mt-1">Bienvenue sur votre portail client.</p>
    </div>
  ),
})
