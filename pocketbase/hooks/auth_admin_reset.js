routerAdd(
  'POST',
  '/backend/v1/auth/admin-reset',
  (e) => {
    const admin = e.auth
    if (!admin) return e.unauthorizedError('Não autenticado')

    if (admin.getString('role') !== 'User_owner' && admin.getString('role') !== 'User_elektra') {
      return e.forbiddenError('Acesso negado')
    }

    let body = e.requestInfo().body || {}
    const targetId = body.userId

    if (!targetId) return e.badRequestError('ID do usuário é obrigatório')

    let targetUser
    try {
      targetUser = $app.findRecordById('users', targetId)
    } catch (_) {
      return e.notFoundError('Usuário não encontrado')
    }

    if (admin.getString('role') === 'User_owner') {
      if (targetUser.getString('company_id') !== admin.getString('company_id')) {
        return e.forbiddenError('Usuário não pertence à sua companhia')
      }
    }

    const secret = $secrets.get('SSO_SECRET') || 'elektra_reset_secret_key_2026'
    const token = $security.createJWT(
      { id: targetUser.id, email: targetUser.getString('email') },
      secret,
      3600,
    )

    let origin = body.origin || 'https://crm.elektrasolucoes.tech'
    if (origin.endsWith('/')) origin = origin.slice(0, -1)
    const resetLink = `${origin}/reset-password?token=${token}`

    const resendKey = $secrets.get('RESEND_API_KEY')
    if (resendKey) {
      const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Olá, ${targetUser.getString('name') || 'Usuário'}</h2>
        <p>O administrador da sua empresa solicitou a redefinição da sua senha no Elektra CRM.</p>
        <p><a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 5px;">Configurar Minha Senha</a></p>
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
          to: targetUser.getString('email'),
          subject: 'Redefinição de Senha - Elektra CRM',
          html: html,
        }),
        timeout: 15,
      })

      if (resendReq.statusCode >= 400) {
        $app
          .logger()
          .error('Erro ao enviar email via Resend (admin-reset)', 'status', resendReq.statusCode)
        return e.internalServerError('Erro ao enviar o e-mail.')
      }
    }

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
