routerAdd('POST', '/backend/v1/auth/request-reset', (e) => {
  const body = e.requestInfo().body || {}
  const email = body.email
  const origin = body.origin || ''

  if (!email) return e.badRequestError('Email é obrigatório.')

  let user
  try {
    user = $app.findAuthRecordByEmail('users', email)
  } catch (_) {
    // Silent success to prevent email enumeration
    return e.json(200, { success: true })
  }

  if (user.getString('status') === 'inactive') {
    return e.json(200, { success: true })
  }

  const secret = $secrets.get('HUB_SECRET') || 'fallback_secret_for_jwt_auth'
  const token = $security.createJWT(
    { id: user.id, email: user.email, purpose: 'reset' },
    secret,
    3600,
  )

  const resetLink = `${origin}/reset-password?token=${token}`
  const isSetup = !user.getString('passwordHash')

  const subject = isSetup
    ? 'Configure sua senha de acesso - Elektra CRM'
    : 'Recuperação de senha - Elektra CRM'
  const title = isSetup ? 'Bem-vindo ao Elektra CRM!' : 'Recuperação de Senha'
  const message = isSetup
    ? 'Seu usuário foi ativado. Clique no botão abaixo para configurar sua senha e acessar a plataforma.'
    : 'Recebemos uma solicitação de recuperação de senha para sua conta. Clique no botão abaixo para criar uma nova senha.'

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
      <h2 style="color: #0f172a; margin-top: 0;">${title}</h2>
      <p style="color: #334155; font-size: 16px; line-height: 1.6;">${message}</p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${resetLink}" style="background-color: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Configurar Senha</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Se o botão não funcionar, copie e cole este link no seu navegador: <br/><a href="${resetLink}" style="color: #0ea5e9; word-break: break-all;">${resetLink}</a></p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">Este link é válido por 1 hora. Se você não solicitou este e-mail, pode ignorá-lo com segurança.</p>
    </div>
  `

  const resendKey = $secrets.get('RESEND_API_KEY')
  if (resendKey) {
    try {
      const res = $http.send({
        url: 'https://api.resend.com/emails',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + resendKey,
        },
        body: JSON.stringify({
          from: 'Elektra CRM <suporte@elektrasolucoes.tech>',
          to: [email],
          subject: subject,
          html: html,
        }),
      })
      if (res.statusCode >= 400) {
        $app.logger().error('Erro envio Resend', 'status', res.statusCode, 'body', res.json)
      }
    } catch (err) {
      $app.logger().error('Falha ao se conectar com Resend', 'error', err.message)
    }
  } else {
    $app.logger().warn('RESEND_API_KEY não configurada. Link gerado: ' + resetLink)
  }

  return e.json(200, { success: true })
})
