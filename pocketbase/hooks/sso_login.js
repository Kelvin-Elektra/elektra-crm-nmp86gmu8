routerAdd('POST', '/backend/v1/sso/login', (e) => {
  const body = e.requestInfo().body || {}
  const ssoToken = body.sso_token

  if (!ssoToken) {
    return e.json(400, { error: 'sso_token is required', payload: null, status: 400 })
  }

  const secret = $secrets.get('SSO_SECRET')
  if (!secret) {
    return e.json(422, { error: 'SSO is not configured no servidor.', payload: null, status: 422 })
  }

  let payload
  try {
    payload = $security.parseJWT(ssoToken, secret)
  } catch (err) {
    let unverified = {}
    try {
      unverified = $security.parseUnverifiedJWT(ssoToken)
    } catch (_) {}
    $app.logger().error('SSO Token falhou na verificação', 'error', err.message)
    return e.json(401, { error: 'Token inválido ou expirado.', payload: unverified, status: 401 })
  }

  const hubUserId = payload.hub_user_id || payload.id
  if (!hubUserId) {
    return e.json(400, {
      error: 'Invalid token payload: missing hub_user_id or id',
      payload,
      status: 400,
    })
  }

  const hubCompanyId = payload.hub_company_id || payload.company_hub_id || payload.company_id
  if (!hubCompanyId) {
    return e.json(400, {
      error: 'Invalid token payload: missing company_id or hub_company_id',
      payload,
      status: 400,
    })
  }

  let company
  try {
    company = $app.findFirstRecordByData('companies', 'hub_company_id', hubCompanyId)
    let needsCompanyUpdate = false

    if (payload.company_name && company.getString('name') !== payload.company_name) {
      company.set('name', payload.company_name)
      needsCompanyUpdate = true
    }

    if (payload.company_status && company.getString('status') !== payload.company_status) {
      company.set('status', payload.company_status)
      needsCompanyUpdate = true
    }

    if (needsCompanyUpdate) {
      $app.saveNoValidate(company)
    }
  } catch (_) {
    try {
      const companiesCol = $app.findCollectionByNameOrId('companies')
      company = new Record(companiesCol)
      company.set('hub_company_id', hubCompanyId)
      company.set('name', payload.company_name || 'Empresa via Hub')
      company.set('status', payload.company_status || 'active')
      $app.saveNoValidate(company)
    } catch (createErr) {
      return e.json(422, {
        error: 'Erro ao criar nova empresa vinculada: ' + createErr.message,
        payload,
        status: 422,
      })
    }
  }

  if (company.getString('status') !== 'active') {
    return e.json(403, { error: 'A assinatura da sua empresa está inativa.', payload, status: 403 })
  }

  const email = payload.email

  let user
  let userId
  try {
    user = $app.findFirstRecordByData('users', 'hub_user_id', hubUserId)
    userId = user.id

    let needsUpdate = false
    if (user.getString('company_id') !== company.id) {
      user.set('company_id', company.id)
      needsUpdate = true
    }
    if (payload.role && user.getString('role') !== payload.role) {
      user.set('role', payload.role)
      needsUpdate = true
    }
    if (payload.role_company && user.getString('role_company') !== payload.role_company) {
      user.set('role_company', payload.role_company)
      needsUpdate = true
    }
    if (payload.name && user.getString('name') !== payload.name) {
      user.set('name', payload.name)
      needsUpdate = true
    }
    if (payload.phone && user.getString('phone') !== payload.phone) {
      user.set('phone', payload.phone)
      needsUpdate = true
    }
    if (email && user.getString('email') !== email) {
      user.setEmail(email)
      needsUpdate = true
    }

    if (needsUpdate) {
      $app.saveNoValidate(user)
    }
  } catch (_) {
    try {
      const usersCol = $app.findCollectionByNameOrId('users')
      user = new Record(usersCol)
      user.set('hub_user_id', hubUserId)
      if (email) {
        user.setEmail(email)
      } else {
        user.setEmail(`user_${hubUserId}@elektrahub.local`)
      }
      user.setPassword($security.randomString(20))
      user.setVerified(true)
      user.set('name', payload.name || '')
      user.set('role', payload.role || 'User_employee')
      user.set('role_company', payload.role_company || 'user')
      if (payload.phone) user.set('phone', payload.phone)
      user.set('status', 'active')
      user.set('company_id', company.id)
      $app.saveNoValidate(user)
      userId = user.id
    } catch (createErr) {
      return e.json(422, {
        error: 'Erro ao provisionar novo usuário: ' + createErr.message,
        payload,
        status: 422,
      })
    }
  }

  // Ensure we reload the user record fresh from DB
  try {
    user = $app.findRecordById('users', userId)
  } catch (err) {
    return e.json(422, { error: 'Erro ao recarregar dados do usuário.', payload, status: 422 })
  }

  try {
    return $apis.recordAuthResponse($app, e, user)
  } catch (err) {
    $app.logger().error('SSO Token Gen Failed', 'error', err.message)
    return e.json(422, {
      error: 'Erro interno ao gerar token de autenticação.',
      details: err.message,
      status: 422,
    })
  }
})
