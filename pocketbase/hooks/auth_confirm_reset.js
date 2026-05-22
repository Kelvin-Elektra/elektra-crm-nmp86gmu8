routerAdd('POST', '/backend/v1/auth/confirm-reset', (e) => {
  const body = e.requestInfo().body || {}
  const token = body.token
  const password = body.password

  if (!token || !password) {
    return e.badRequestError('Token e senha são obrigatórios')
  }

  if (password.length < 8) {
    return e.badRequestError('A senha deve ter pelo menos 8 caracteres')
  }

  const secret = $secrets.get('SSO_SECRET') || 'elektra_reset_secret_key_2026'

  let payload
  try {
    payload = $security.parseJWT(token, secret)
  } catch (err) {
    return e.badRequestError('Token inválido ou expirado')
  }

  if (!payload || !payload.id) {
    return e.badRequestError('Token inválido')
  }

  try {
    const user = $app.findRecordById('users', payload.id)
    user.setPassword(password)
    $app.save(user)
    return e.json(200, { success: true })
  } catch (err) {
    return e.internalServerError('Erro ao atualizar senha')
  }
})
