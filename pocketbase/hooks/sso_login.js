routerAdd('POST', '/backend/v1/sso/login', (e) => {
  const body = e.requestInfo().body || {}
  const token = body.sso_token

  if (!token) {
    return e.badRequestError('Token não fornecido')
  }

  const secret = $secrets.get('SSO_SECRET')
  if (!secret) {
    return e.internalServerError('SSO não configurado corretamente')
  }

  let payload
  try {
    payload = $security.parseJWT(token, secret)
  } catch (err) {
    return e.unauthorizedError('Token inválido ou expirado')
  }

  const hubUserId = payload.id
  if (!hubUserId) {
    return e.unauthorizedError('Token inválido: ID ausente')
  }

  try {
    const userRecord = $app.findFirstRecordByData('users', 'hub_user_id', hubUserId)

    if (userRecord.getString('status') === 'inactive') {
      return e.forbiddenError('Usuário inativo')
    }

    return $apis.recordAuthResponse($app, e, userRecord)
  } catch (err) {
    return e.unauthorizedError('Usuário não encontrado')
  }
})
