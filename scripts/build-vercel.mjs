import { cp, mkdir, writeFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import { execSync } from 'child_process'

// 1. Build the app
execSync('vite build', { stdio: 'inherit' })

// 2. Clean previous output
if (existsSync('.vercel/output')) {
  await rm('.vercel/output', { recursive: true })
}

// 3. Create structure
await mkdir('.vercel/output/static', { recursive: true })
await mkdir('.vercel/output/functions/index.func', { recursive: true })

// 4. Copy static client assets
await cp('dist/client', '.vercel/output/static', { recursive: true })

// 5. Copy server bundle into the function
await cp('dist/server', '.vercel/output/functions/index.func', { recursive: true })

// 6. Create the Vercel function wrapper
await writeFile('.vercel/output/functions/index.func/index.mjs', `
import server from './server.js'

export default async function handler(request) {
  return server.fetch(request)
}
`)

// 7. Function config
await writeFile('.vercel/output/functions/index.func/.vc-config.json', JSON.stringify({
  runtime: 'nodejs20.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
  environment: { NODE_ENV: 'production' }
}))

await writeFile('.vercel/output/functions/index.func/package.json', JSON.stringify({ type: 'module' }))

// 8. Routing config
await writeFile('.vercel/output/config.json', JSON.stringify({
  version: 3,
  routes: [
    { handle: 'filesystem' },
    { src: '^/(.*)$', dest: '/index' }
  ]
}))

console.log('✓ Vercel output ready')
