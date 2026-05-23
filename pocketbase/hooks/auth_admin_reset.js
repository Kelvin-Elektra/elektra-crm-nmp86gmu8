routerAdd(
  'POST',
  '/backend/v1/auth/admin-reset',
  (e) => {
    let body = e.requestInfo().body || {}
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch (_) {}
    }
    const userId = body.userId
    let origin = body.origin || 'https://crm.elektrasolucoes.tech'
    if (origin.endsWith('/')) origin = origin.slice(0, -1)

    if (!userId) return e.badRequestError('Usuário é obrigatório')

    const targetUser = $app.findRecordById('users', userId)

    if (e.auth.id !== targetUser.id) {
      if (
        e.auth.getString('role') !== 'User_elektra' &&
        e.auth.getString('company_id') !== targetUser.getString('company_id')
      ) {
        return e.forbiddenError('Não autorizado')
      }
      const roleCompany = e.auth.getString('role_company')
      const role = e.auth.getString('role')
      if (role !== 'User_owner' && roleCompany !== 'admin' && role !== 'User_elektra') {
        return e.forbiddenError('Apenas administradores podem redefinir senhas')
      }
    }

    const email = targetUser.getString('email')
    if (!email) return e.badRequestError('Usuário não possui email')

    const secret = $secrets.get('SSO_SECRET') || 'elektra_reset_secret_key_2026'
    const token = $security.createJWT({ id: targetUser.id, email }, secret, 3600)
    const resetLink = `${origin}/reset-password?token=${token}`

    const resendKey = $secrets.get('RESEND_API_KEY')
    if (resendKey) {
      const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Olá, ${targetUser.getString('name') || 'Usuário'}</h2>
        <p>Um administrador solicitou a redefinição da sua senha no Elektra CRM.</p>
        <p><a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 5px;">Configurar Nova Senha</a></p>
        <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
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
          subject: 'Redefinição de Senha - Elektra CRM',
          html: html,
        }),
        timeout: 15,
      })

      if (resendReq.statusCode >= 400) {
        $app.logger().error('Erro ao enviar email de reset (admin)', 'status', resendReq.statusCode)
        return e.internalServerError('Erro ao enviar o e-mail.')
      }
    }

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
