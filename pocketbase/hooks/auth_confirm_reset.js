routerAdd('POST', '/backend/v1/auth/confirm-reset', (e) => {
  const body = e.requestInfo().body || {}
  const token = body.token
  const newPassword = body.password

  if (!token || !newPassword) return e.badRequestError('Token e nova senha são obrigatórios.')
  if (newPassword.length < 8) return e.badRequestError('A senha deve ter pelo menos 8 caracteres.')

  const secret = $secrets.get('HUB_SECRET') || 'fallback_secret_for_jwt_auth'
  let payload
  try {
    payload = $security.parseJWT(token, secret)
  } catch (err) {
    return e.badRequestError('Token inválido ou expirado.')
  }

  if (payload.purpose !== 'reset') return e.badRequestError('Token de operação inválida.')

  let user
  try {
    user = $app.findRecordById('users', payload.id)
  } catch (_) {
    return e.badRequestError('Usuário não encontrado na base de dados.')
  }

  user.setPassword(newPassword)
  user.setVerified(true)

  try {
    $app.save(user)
    return e.json(200, { success: true })
  } catch (err) {
    return e.internalServerError('Falha ao salvar as configurações de segurança: ' + err.message)
  }
})
