import { createAPIFileRoute } from '@tanstack/react-start/api'

const PROMPTS: Record<string, (ctx: Record<string, string>) => string> = {
  accroche: ({ nom, poste, experience, atouts }) =>
    `Tu es expert en rédaction de CV. Rédige une accroche professionnelle (3-4 phrases max, ~80 mots) pour un CV.
Nom : ${nom || 'Non précisé'}
Poste ciblé : ${poste || 'Non précisé'}
Expérience : ${experience || 'Non précisée'}
Points forts : ${atouts || 'Non précisés'}
Réponds UNIQUEMENT avec le texte de l'accroche, sans introduction ni guillemets.`,

  experience: ({ poste, entreprise, periode, missions }) =>
    `Tu es expert en rédaction de CV. Rédige 3 à 5 bullet points percutants pour une expérience professionnelle (commencer chaque ligne par un verbe d'action fort).
Poste : ${poste || 'Non précisé'}
Entreprise : ${entreprise || 'Non précisée'}
Période : ${periode || 'Non précisée'}
Missions / contexte : ${missions || 'Non précisées'}
Réponds UNIQUEMENT avec les bullet points (une ligne par point, sans tiret ni puce, juste le texte).`,

  competences: ({ poste, secteur, niveau }) =>
    `Tu es expert en rédaction de CV. Suggère une liste de 6 à 10 compétences clés pertinentes pour le profil suivant.
Poste ciblé : ${poste || 'Non précisé'}
Secteur : ${secteur || 'Non précisé'}
Niveau d'expérience : ${niveau || 'Non précisé'}
Réponds UNIQUEMENT avec les compétences, une par ligne, sans numérotation ni tiret.`,

  formation: ({ diplome, ecole, specialite }) =>
    `Tu es expert en rédaction de CV. Rédige une description courte et valorisante (2-3 lignes) pour une formation.
Diplôme : ${diplome || 'Non précisé'}
École : ${ecole || 'Non précisée'}
Spécialité / modules : ${specialite || 'Non précisée'}
Réponds UNIQUEMENT avec la description, sans introduction.`,
}

export const APIRoute = createAPIFileRoute('/api/redaction')({
  POST: async ({ request }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY non configurée' }, { status: 500 })

    const { type, context } = await request.json() as { type: string; context: Record<string, string> }
    const promptFn = PROMPTS[type]
    if (!promptFn) return Response.json({ error: 'Type inconnu' }, { status: 400 })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: promptFn(context) }],
      }),
    })

    if (!res.ok) return Response.json({ error: 'Erreur API Claude' }, { status: 502 })
    const data = await res.json() as { content: { type: string; text: string }[] }
    const text = data.content.find(c => c.type === 'text')?.text ?? ''
    return Response.json({ text })
  },
})
