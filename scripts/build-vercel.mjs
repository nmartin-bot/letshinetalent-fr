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

// 6. Create the Vercel function wrapper (Node.js req/res → fetch)
await writeFile('.vercel/output/functions/index.func/index.mjs', `
import server from './server.js'

export default async function handler(req, res) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers['host']
  const url = proto + '://' + host + req.url

  const headers = new Headers()
  for (const [key, val] of Object.entries(req.headers)) {
    if (typeof val === 'string') headers.set(key, val)
    else if (Array.isArray(val)) val.forEach(v => headers.append(key, v))
  }

  let body = undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise((resolve) => {
      const chunks = []
      req.on('data', c => chunks.push(c))
      req.on('end', () => resolve(Buffer.concat(chunks)))
    })
    if (body.length === 0) body = undefined
  }

  const request = new Request(url, { method: req.method, headers, body })
  const response = await server.fetch(request)

  res.statusCode = response.status
  response.headers.forEach((val, key) => res.setHeader(key, val))
  const buf = await response.arrayBuffer()
  res.end(Buffer.from(buf))
}
`)

// 7. Function config
await writeFile('.vercel/output/functions/index.func/.vc-config.json', JSON.stringify({
  runtime: 'nodejs20.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs'
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
