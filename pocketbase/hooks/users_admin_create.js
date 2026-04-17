routerAdd(
  'POST',
  '/backend/v1/users/admin-create',
  (e) => {
    const auth = e.auth
    if (!auth) throw new UnauthorizedError('Authentication required')

    const body = e.requestInfo().body

    if (auth.getString('role') !== 'admin_elektra') {
      if (
        auth.getString('role') !== 'admin_company' ||
        auth.getString('company_id') !== body.company_id
      ) {
        throw new ForbiddenError('Not allowed to create user for this company')
      }
    }

    const collection = $app.findCollectionByNameOrId('users')
    const record = new Record(collection)

    record.set('name', body.name)
    record.setEmail(body.email)
    record.setPassword(body.password)
    record.set('role', body.role)
    record.set('company_id', body.company_id)
    record.set('status', 'active')
    record.setVerified(true)

    $app.save(record)

    const apiKey = $secrets.get('RESEND_API_KEY')
    if (apiKey && body.email) {
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #2563eb;">Bem-vindo ao Elektra CRM, ${body.name || 'Usuário'}!</h2>
          <p>Sua conta foi criada com sucesso pelo administrador da sua empresa.</p>
          <p>Suas credenciais de acesso são:</p>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${body.email}</p>
            <p style="margin: 0;"><strong>Senha:</strong> ${body.password}</p>
          </div>
          <p>Por favor, altere sua senha após o primeiro login.</p>
          <div style="margin: 30px 0;">
            <a href="https://elektra-crm.goskip.app/" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Acessar o Sistema</a>
          </div>
          <p>Atenciosamente,<br>Equipe Elektra CRM</p>
        </div>
      `
      const res = $http.send({
        url: 'https://api.resend.com/emails',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Elektra CRM <notificacao@elektrasolucoes.tech>',
          to: [body.email],
          subject: 'Suas credenciais de acesso - Elektra CRM',
          html: html,
        }),
        timeout: 10,
      })
      if (res.statusCode >= 400) {
        console.log('Failed to send Resend email to ' + body.email, res.raw)
      }
    }

    return e.json(200, record)
  },
  $apis.requireAuth(),
)
