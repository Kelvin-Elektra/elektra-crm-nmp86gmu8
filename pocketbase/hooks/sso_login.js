routerAdd('POST', '/backend/v1/sso/login', (e) => {
  const body = e.requestInfo().body || {}
  const ssoToken = body.sso_token

  if (!ssoToken) {
    throw new BadRequestError('sso_token is required')
  }

  const secret = $secrets.get('SSO_SECRET')
  if (!secret) {
    throw new InternalServerError('SSO is not configured')
  }

  let payload
  try {
    // 1. Verify token signature and expiration
    payload = $security.parseJWT(ssoToken, secret)
  } catch (err) {
    throw new UnauthorizedError('Token inválido ou expirado.')
  }

  // The HUB provides its user ID in the JWT "hub_user_id" or "id" claim
  const hubUserId = payload.hub_user_id || payload.id
  if (!hubUserId) {
    throw new BadRequestError('Invalid token payload: missing hub_user_id or id')
  }

  // 2. Find user by hub_user_id, not by internal CRM ID
  let user
  try {
    user = $app.findFirstRecordByData('users', 'hub_user_id', hubUserId)
  } catch (_) {
    throw new NotFoundError('Usuário não encontrado ou não vinculado ao CRM.')
  }

  // 3. Validate company active status
  const companyId = user.get('company_id')
  if (!companyId) {
    throw new ForbiddenError('Usuário sem empresa vinculada.')
  }

  let company
  try {
    company = $app.findRecordById('companies', companyId)
  } catch (_) {
    throw new ForbiddenError('Empresa não encontrada.')
  }

  if (company.get('status') !== 'active') {
    throw new ForbiddenError('A assinatura da sua empresa está inativa.')
  }

  // 4. Return standard auth response for the matched CRM user
  return $apis.recordAuthResponse($app, e, user)
})
