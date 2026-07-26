import { createServerFn } from '@tanstack/react-start'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { Resend } from 'resend'

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let pwd = ''
  for (let i = 0; i < 8; i++) {
    if (i === 4) pwd += '-'
    pwd += chars[Math.floor(Math.random() * chars.length)]
  }
  return pwd
}

function buildEmailHtml(entityLabel: string, email: string, password: string, loginUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <div style="margin-bottom: 24px;">
        <span style="display: inline-block; background: #c9a84c; color: #111; font-weight: bold; font-size: 13px; padding: 6px 12px; border-radius: 8px;">Let Shine Talent</span>
      </div>
      <h1 style="font-size: 20px; font-weight: bold; color: #111; margin-bottom: 8px;">Accès à votre espace ${entityLabel}</h1>
      <p style="color: #555; font-size: 14px; margin-bottom: 24px;">Voici vos identifiants pour accéder à votre espace personnel :</p>
      <div style="background: #f5f5f5; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #555;">Email</p>
        <p style="margin: 0 0 16px; font-size: 15px; font-weight: bold; color: #111;">${email}</p>
        <p style="margin: 0 0 8px; font-size: 13px; color: #555;">Mot de passe temporaire</p>
        <p style="margin: 0; font-size: 22px; font-weight: bold; color: #111; letter-spacing: 2px;">${password}</p>
      </div>
      <a href="${loginUrl}"
         style="display: inline-block; background: #c9a84c; color: #111; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 10px; text-decoration: none;">
        Accéder à mon espace
      </a>
      <p style="color: #999; font-size: 12px; margin-top: 32px;">Si vous n'attendiez pas cet email, ignorez-le simplement.</p>
    </div>
  `
}

export const sendAccessFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as { email: string; entityType: 'candidate' | 'learner' | 'company'; entityId: string })
  .handler(async ({ data }) => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const resendKey = process.env.RESEND_API_KEY
    const appUrl = process.env.VITE_APP_URL ?? 'http://localhost:3000'

    if (!serviceRoleKey || !supabaseUrl || !resendKey) {
      return { ok: false, error: 'Configuration serveur manquante' }
    }

    const { email, entityType, entityId } = data
    const password = generatePassword()

    const admin = createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Crée ou met à jour l'utilisateur avec le mot de passe temporaire
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    let userId: string | undefined
    if (existingUser) {
      const { data: updated, error } = await admin.auth.admin.updateUserById(existingUser.id, { password })
      if (error) return { ok: false, error: error.message }
      userId = updated.user?.id
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (error) return { ok: false, error: error.message }
      userId = created.user?.id
    }

    if (!userId) return { ok: false, error: 'Impossible de créer le compte' }

    // Upsert profil avec l'entité
    const { error: upsertError } = await admin.from('profiles').upsert({
      id: userId,
      client_type: entityType,
      entity_id: entityId,
      role: 'client',
      password_changed: false,
    })
    if (upsertError) console.error('[sendAccess] upsert error:', upsertError)

    // Envoi email via Resend
    const entityLabel = entityType === 'learner' ? 'apprenant' : entityType === 'company' ? 'entreprise' : 'candidat'
    const resend = new Resend(resendKey)
    const { error: emailError } = await resend.emails.send({
      from: 'Let Shine Talent <noreply@updates.untitled-hr.com>',
      to: email,
      subject: 'Accès à votre espace Let Shine Talent',
      html: buildEmailHtml(entityLabel, email, password, `${appUrl}/login`),
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return { ok: false, error: 'Erreur envoi email' }
    }

    return { ok: true, error: null }
  })
