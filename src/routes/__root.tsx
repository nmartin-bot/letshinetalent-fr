import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles/app.css?url'

export const Route = createRootRoute({
  head: () => {
    // Clé publique en écriture seule, restreinte aux domaines déclarés côté Wake.
    // Sans clé on n'injecte rien : une sonde sans clé se chargerait pour rien.
    const cleSonde = import.meta.env.VITE_WAKE_SONDE_CLE
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: 'Let Shine Talent' },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
      ],
      scripts: cleSonde
        ? [{ src: 'https://www.wakesystems.fr/sonde.js', 'data-cle': cleSonde, defer: true }]
        : [],
    }
  },
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
