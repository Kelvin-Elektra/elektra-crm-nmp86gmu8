onRecordAfterCreateSuccess((e) => {
  const user = e.record
  const email = user.getString('email')

  if (!email || user.getBool('verified')) return e.next()

  const secret = $secrets.get('SSO_SECRET') || 'elektra_reset_secret_key_2026'
  const token = $security.createJWT({ id: user.id, email: email }, secret, 86400)

  const origin = 'https://crm.elektrasolucoes.tech'
  const verifyLink = `${origin}/verify?token=${token}`

  const resendKey = $secrets.get('RESEND_API_KEY')
  if (resendKey) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Olá, ${user.getString('name') || 'Usuário'}</h2>
        <p>Você foi convidado(a) para acessar o Elektra CRM.</p>
        <p>Por favor, confirme seu e-mail acessando o link abaixo:</p>
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
        subject: 'Bem-vindo(a) ao Elektra CRM - Verifique seu E-mail',
        html: html,
      }),
      timeout: 15,
    })
  }
  return e.next()
}, 'users')
