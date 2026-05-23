routerAdd('POST', '/backend/v1/auth/confirm-verification', (e) => {
  let body = e.requestInfo().body || {}
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (_) {}
  }
  const token = body.token
  if (!token) return e.badRequestError('Token é obrigatório')

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
  user.setVerified(true)
  $app.save(user)

  return e.json(200, { success: true })
})
