routerAdd('POST', '/backend/v1/sso/debug', (e) => {
  const body = e.requestInfo().body || {}
  const ssoToken = body.sso_token

  if (!ssoToken) {
    return e.json(400, {
      success: false,
      step: 'init',
      error: 'sso_token is required',
      payload: null,
    })
  }

  const secret = $secrets.get('SSO_SECRET')
  if (!secret) {
    return e.json(422, {
      success: false,
      step: 'secret_check',
      error: 'SSO_SECRET is not configured',
      payload: null,
    })
  }

  let payload
  let unverified = {}
  try {
    unverified = $security.parseUnverifiedJWT(ssoToken)
  } catch (err) {}

  try {
    payload = $security.parseJWT(ssoToken, secret)
  } catch (err) {
    return e.json(401, {
      success: false,
      step: 'decode',
      error: 'Token inválido ou expirado. ' + err.message,
      payload: unverified,
    })
  }

  const hubUserId = payload.hub_user_id || payload.id
  if (!hubUserId) {
    return e.json(400, {
      success: false,
      step: 'validate_payload',
      error: 'Invalid token payload: missing hub_user_id or id',
      payload,
    })
  }

  const hubCompanyId = payload.company_id || payload.hub_company_id
  if (!hubCompanyId) {
    return e.json(400, {
      success: false,
      step: 'validate_payload',
      error: 'Invalid token payload: missing company_id or hub_company_id',
      payload,
    })
  }

  let company
  let companyStatus = 'not_found'
  try {
    company = $app.findFirstRecordByData('companies', 'hub_company_id', hubCompanyId)
    companyStatus = 'found'
  } catch (_) {
    companyStatus = 'will_create'
  }

  const email = payload.email
  let userStatus = 'not_found'
  let user

  try {
    user = $app.findFirstRecordByData('users', 'hub_user_id', hubUserId)
    userStatus = 'found_by_hub_id'
  } catch (_) {
    if (email) {
      try {
        user = $app.findAuthRecordByEmail('users', email)
        userStatus = 'found_by_email'
      } catch (_) {
        userStatus = 'will_provision'
      }
    } else {
      userStatus = 'missing_email_cannot_provision'
    }
  }

  return e.json(200, {
    success: true,
    step: 'completed',
    payload: payload,
    user_status: userStatus,
    company_status: companyStatus,
    error: null,
  })
})
