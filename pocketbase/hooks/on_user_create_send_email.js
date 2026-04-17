onRecordAfterCreateSuccess((e) => {
  const record = e.record
  const email = record.getString('email')
  const name = record.getString('name') || 'Usuário'
  const apiKey = $secrets.get('RESEND_API_KEY')

  if (apiKey && email) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb;">Bem-vindo ao Elektra CRM, ${name}!</h2>
        <p>Sua conta foi criada com sucesso por um administrador da sua empresa.</p>
        <p>Para ativar sua conta e definir sua senha de acesso, clique no botão abaixo:</p>
        <div style="margin: 30px 0;">
          <a href="${$secrets.get('PB_INSTANCE_URL') || 'https://elektra-crm.goskip.app'}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Acessar o Sistema</a>
        </div>
        <p style="font-size: 14px; color: #666;">Se você não solicitou este acesso, por favor ignore este email.</p>
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
        to: [email],
        subject: 'Bem-vindo ao Elektra CRM - Confirme sua conta',
        html: html,
      }),
      timeout: 10,
    })

    if (res.statusCode >= 400) {
      console.log('Failed to send Resend email to ' + email, res.raw)
    }
  }

  e.next()
}, 'users')
