import { createAPIFileRoute } from '@tanstack/react-start/api'

export const APIRoute = createAPIFileRoute('/api/analyse-cv')({
  POST: async ({ request }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY non configurée' }, { status: 500 })
    }

    const { cv, job } = await request.json() as { cv: string; job?: string }
    if (!cv?.trim()) return Response.json({ error: 'CV vide' }, { status: 400 })

    const systemPrompt = `Tu es un expert en recrutement et en optimisation de CV pour les systèmes ATS (Applicant Tracking System). Tu analyses des CV et fournis des retours structurés en JSON.`

    const userPrompt = `Analyse ce CV pour son passage en ATS${job ? ` et sa correspondance avec l'offre d'emploi fournie` : ''}.

CV :
${cv}

${job ? `Offre d'emploi :\n${job}` : ''}

Réponds UNIQUEMENT avec un JSON valide dans ce format exact :
{
  "globalScore": <nombre 0-100>,
  "summary": "<phrase de 2-3 lignes résumant le diagnostic>",
  "sections": [
    {
      "label": "Structure et lisibilité",
      "score": <0-25>,
      "max": 25,
      "status": "<good|warn|bad>",
      "feedback": "<diagnostic en 1-2 phrases>",
      "tips": ["<conseil 1>", "<conseil 2>"]
    },
    {
      "label": "Informations de contact",
      "score": <0-15>,
      "max": 15,
      "status": "<good|warn|bad>",
      "feedback": "<diagnostic>",
      "tips": ["<conseil>"]
    },
    {
      "label": "Expériences professionnelles",
      "score": <0-25>,
      "max": 25,
      "status": "<good|warn|bad>",
      "feedback": "<diagnostic>",
      "tips": ["<conseil 1>", "<conseil 2>"]
    },
    {
      "label": "Compétences et mots-clés",
      "score": <0-20>,
      "max": 20,
      "status": "<good|warn|bad>",
      "feedback": "<diagnostic>",
      "tips": ["<conseil 1>", "<conseil 2>"]
    },
    {
      "label": "Formation",
      "score": <0-15>,
      "max": 15,
      "status": "<good|warn|bad>",
      "feedback": "<diagnostic>",
      "tips": ["<conseil>"]
    }
  ],
  "keywords": {
    "found": ["<mot-clé présent>", ...],
    "missing": ["<mot-clé manquant important>", ...]
  }
}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      return Response.json({ error: 'Erreur API Claude' }, { status: 502 })
    }

    const claude = await res.json() as { content: { type: string; text: string }[] }
    const text = claude.content.find(c => c.type === 'text')?.text ?? ''

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON')
      const result = JSON.parse(jsonMatch[0])
      return Response.json(result)
    } catch {
      return Response.json({ error: 'Réponse invalide de Claude' }, { status: 502 })
    }
  },
})
