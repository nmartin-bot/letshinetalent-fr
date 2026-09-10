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
//    ws is imported statically so esbuild bundles it, then we set it as
//    globalThis.WebSocket BEFORE server.js loads (via dynamic import) so
//    Supabase Realtime doesn't throw on Node.js < 22.
await writeFile('_vercel_entry_tmp.mjs', `
import ws from 'ws'

// Polyfill WebSocket for Node.js < 22 before any module that needs it loads
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws
}

// Dynamic import so server.js (and Supabase) loads AFTER the polyfill above
const { default: server } = await import('./dist/server/server.js')

async function handleAnalyseCv(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY non configurée' }))
    return
  }

  const body = await new Promise((resolve) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })

  let pdf_base64, cv, job
  try {
    ;({ pdf_base64, cv, job } = JSON.parse(body))
  } catch {
    res.statusCode = 400
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'Corps invalide' }))
    return
  }

  if (!pdf_base64 && !cv?.trim()) {
    res.statusCode = 400
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'CV vide' }))
    return
  }

  const systemPrompt = "Tu es un expert en recrutement et en optimisation de CV pour les systèmes ATS (Applicant Tracking System). Tu analyses des CV et fournis des retours structurés en JSON."

  const textPrompt = \`Analyse ce CV pour son passage en ATS\${job ? \` et sa correspondance avec l'offre d'emploi fournie\` : ''}.

\${!pdf_base64 ? \`CV :\\n\${cv}\\n\\n\` : ''}\${job ? \`Offre d'emploi :\\n\${job}\\n\\n\` : ''}Réponds UNIQUEMENT avec un JSON valide dans ce format exact :
{
  "globalScore": <nombre 0-100>,
  "summary": "<phrase de 2-3 lignes résumant le diagnostic>",
  "sections": [
    {"label": "Structure et lisibilité", "score": <0-25>, "max": 25, "status": "<good|warn|bad>", "feedback": "<diagnostic>", "tips": ["<conseil>"]},
    {"label": "Informations de contact", "score": <0-15>, "max": 15, "status": "<good|warn|bad>", "feedback": "<diagnostic>", "tips": ["<conseil>"]},
    {"label": "Expériences professionnelles", "score": <0-25>, "max": 25, "status": "<good|warn|bad>", "feedback": "<diagnostic>", "tips": ["<conseil>"]},
    {"label": "Compétences et mots-clés", "score": <0-20>, "max": 20, "status": "<good|warn|bad>", "feedback": "<diagnostic>", "tips": ["<conseil>"]},
    {"label": "Formation", "score": <0-15>, "max": 15, "status": "<good|warn|bad>", "feedback": "<diagnostic>", "tips": ["<conseil>"]}
  ],
  "keywords": {"found": ["<mot-clé présent>"], "missing": ["<mot-clé manquant>"]}
}\`

  const userContent = pdf_base64
    ? [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf_base64 } },
        { type: 'text', text: textPrompt },
      ]
    : textPrompt

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!resp.ok) {
      const errBody = await resp.text()
      console.error('[analyse-cv] Anthropic error', resp.status, errBody)
      res.statusCode = 502
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'Erreur API Claude ' + resp.status + ': ' + errBody.slice(0, 200) }))
      return
    }

    const claude = await resp.json()
    const text = claude.content?.find(c => c.type === 'text')?.text ?? ''
    const jsonMatch = text.match(/\\{[\\s\\S]*\\}/)
    if (!jsonMatch) throw new Error('No JSON in response: ' + text.slice(0, 100))
    const result = JSON.parse(jsonMatch[0])

    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(result))
  } catch (e) {
    console.error('[analyse-cv] error:', e)
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: String(e?.message ?? e) }))
  }
}

export default async function handler(req, res) {
  // Handle ATS analysis directly — bypasses TanStack server fn (Safari ByteString bug)
  if (req.url === '/api/analyse-cv' && req.method === 'POST') {
    return handleAnalyseCv(req, res)
  }

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
  banner: {
    js: `import { createRequire as __nodeRequire } from 'node:module'; const require = __nodeRequire(import.meta.url);`,
  },
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
