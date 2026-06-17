routerAdd('POST', '/backend/v1/auth/request-reset', (e) => {
  let body = e.requestInfo().body || {}
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (_) {}
  }

  const email = body.email
  let origin = body.origin || 'https://crm.elektrasolucoes.tech'
  if (origin.endsWith('/')) {
    origin = origin.slice(0, -1)
  }

  if (!email) {
    throw new BadRequestError('Email é obrigatório')
  }

  let user
  try {
    user = $app.findAuthRecordByEmail('users', email)
  } catch (err) {
    // Return 200 even if user is not found to prevent user enumeration
    return e.json(200, { success: true })
  }

  const secret = $secrets.get('SSO_SECRET') || 'elektra_reset_secret_key_2026'
  const token = $security.createJWT({ id: user.id, email: user.getString('email') }, secret, 3600)
  const resetLink = `${origin}/reset-password?token=${token}`

  const resendKey = $secrets.get('RESEND_API_KEY')
  if (resendKey) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Olá, ${user.getString('name') || 'Usuário'}</h2>
        <p>Você solicitou a definição ou redefinição da sua senha no Elektra CRM.</p>
        <p><a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 5px;">Configurar Minha Senha</a></p>
        <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Se você não solicitou isso, ignore este e-mail.</p>
      </div>
    `
    try {
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
          subject: 'Configuração de Senha - Elektra CRM',
          html: html,
        }),
        timeout: 15,
      })

      if (resendReq.statusCode >= 400) {
        $app
          .logger()
          .error(
            'Erro ao enviar email via Resend',
            'status',
            String(resendReq.statusCode),
            'body',
            JSON.stringify(resendReq.json || {}),
          )
        throw new InternalServerError('Erro ao enviar o e-mail.')
      }
    } catch (err) {
      $app.logger().error('Erro na requisição Resend', 'error', err.message)
      throw new InternalServerError('Erro ao comunicar com o servidor de e-mail.')
    }
  }

  return e.json(200, { success: true })
})
