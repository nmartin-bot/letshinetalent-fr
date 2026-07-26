import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/client/entreprise')({
  component: () => <Outlet />,
})
