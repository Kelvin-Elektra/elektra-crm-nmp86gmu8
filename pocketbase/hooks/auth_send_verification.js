routerAdd('POST', '/backend/v1/auth/send-verification', (e) => {
  let body = e.requestInfo().body || {}
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (_) {}
  }
  const email = body.email
  let origin = body.origin || 'https://crm.elektrasolucoes.tech'
  if (origin.endsWith('/')) origin = origin.slice(0, -1)

  if (!email) return e.badRequestError('Email é obrigatório')

  let user
  try {
    user = $app.findAuthRecordByEmail('users', email)
  } catch (err) {
    return e.json(200, { success: true })
  }

  if (user.getBool('verified')) {
    return e.badRequestError('Usuário já está verificado')
  }

  const secret = $secrets.get('SSO_SECRET') || 'elektra_reset_secret_key_2026'
  const token = $security.createJWT({ id: user.id, email: user.getString('email') }, secret, 86400)
  const verifyLink = `${origin}/verify?token=${token}`

  const resendKey = $secrets.get('RESEND_API_KEY')
  if (resendKey) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Olá, ${user.getString('name') || 'Usuário'}</h2>
        <p>Bem-vindo(a) ao Elektra CRM.</p>
        <p>Por favor, confirme seu e-mail acessando o link abaixo para liberar seu acesso:</p>
        <p><a href="${verifyLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 5px;">Verificar E-mail</a></p>
      </div>
    `
    const resendReq = $http.send({
      url: 'https://api.resend.com/emails',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + resendKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Elektra CRM <suporte@elektrasolucoes.tech>',
        to: email,
        subject: 'Confirme seu e-mail - Elektra CRM',
        html: html,
      }),
      timeout: 15,
    })

    if (resendReq.statusCode >= 400) {
      $app
        .logger()
        .error('Erro ao enviar email via Resend (verification)', 'status', resendReq.statusCode)
      return e.internalServerError('Erro ao enviar o e-mail.')
    }
  }

  return e.json(200, { success: true })
})
