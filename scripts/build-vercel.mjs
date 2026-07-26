import { mkdir, writeFile, rm, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { execSync } from 'child_process'
import { build as esbuild } from 'esbuild'

// 1. Build the app
execSync('npx vite build', { stdio: 'inherit' })

// 2. Clean previous output
if (existsSync('.vercel/output')) {
  await rm('.vercel/output', { recursive: true })
}

// 3. Create structure
await mkdir('.vercel/output/static', { recursive: true })
await mkdir('.vercel/output/functions/index.func', { recursive: true })

// 4. Copy static client assets
const { cp } = await import('fs/promises')
await cp('dist/client', '.vercel/output/static', { recursive: true })

// 5. Write entry that wraps the server with the Vercel Node.js adapter
await writeFile('_vercel_entry_tmp.mjs', `
import server from './dist/server/server.js'

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

// 6. Bundle with splitting so dynamic imports (asset chunks) are also bundled
//    All npm packages get inlined; only node:* builtins remain external
await esbuild({
  entryPoints: ['_vercel_entry_tmp.mjs'],
  bundle: true,
  splitting: true,
  platform: 'node',
  format: 'esm',
  outdir: '.vercel/output/functions/index.func',
  entryNames: 'index',
  chunkNames: 'chunks/[name]-[hash]',
  external: ['node:*'],
  conditions: ['import', 'module'],
  mainFields: ['module', 'main'],
  minify: false,
  logLevel: 'warning',
})

await unlink('_vercel_entry_tmp.mjs')

// 7. Function config
await writeFile('.vercel/output/functions/index.func/.vc-config.json', JSON.stringify({
  runtime: 'nodejs20.x',
  handler: 'index.js',
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
