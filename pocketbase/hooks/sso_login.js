routerAdd('POST', '/backend/v1/sso/login', (e) => {
  const body = e.requestInfo().body || {}
  const ssoToken = body.sso_token

  if (!ssoToken) {
    return e.badRequestError('sso_token is required')
  }

  const secret = $secrets.get('SSO_SECRET')
  if (!secret) {
    return e.internalServerError('SSO is not configured')
  }

  try {
    // 1. Verify token signature and expiration
    const payload = $security.parseJWT(ssoToken, secret)

    // The HUB provides its user ID in the JWT "id" claim
    const hubUserId = payload.id
    if (!hubUserId) {
      return e.badRequestError('Invalid token payload: missing id')
    }

    // 2. Find user by hub_user_id, not by internal CRM ID
    let user
    try {
      user = $app.findFirstRecordByData('users', 'hub_user_id', hubUserId)
    } catch (_) {
      return e.notFoundError('Usuário não encontrado ou não vinculado ao CRM.')
    }

    // 3. Return standard auth response for the matched CRM user
    return $apis.recordAuthResponse($app, e, user)
  } catch (err) {
    return e.unauthorizedError('Token inválido ou expirado.')
  }
})
