routerAdd('POST', '/backend/v1/auth/confirm-reset', (e) => {
  let body = e.requestInfo().body || {}
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (_) {}
  }
  const { token, password, confirmPassword } = body
  if (!token || !password) return e.badRequestError('Token e senha são obrigatórios')
  if (password !== confirmPassword) return e.badRequestError('Senhas não coincidem')

  const secret = $secrets.get('SSO_SECRET') || 'elektra_reset_secret_key_2026'
  let payload
  try {
    payload = $security.parseJWT(token, secret)
  } catch (err) {
    return e.badRequestError('Token inválido ou expirado')
  }

  const userId = payload.id
  if (!userId) return e.badRequestError('Token inválido')

  const user = $app.findRecordById('users', userId)
  user.setPassword(password)
  $app.save(user)

  return e.json(200, { success: true })
})
