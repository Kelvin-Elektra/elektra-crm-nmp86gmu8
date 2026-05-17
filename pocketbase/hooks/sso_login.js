routerAdd('GET', '/backend/v1/sso', (e) => {
  const ssoToken = e.request.url.query().get('sso_token')

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
  const email = payload.email

  if (!hubUserId && !email) {
    return e.json(400, {
      error: 'Invalid token payload: missing hub_user_id, id or email',
      payload,
      status: 400,
    })
  }

  // 1. Identify User First
  let user
  try {
    if (hubUserId) {
      user = $app.findFirstRecordByData('users', 'hub_user_id', hubUserId)
    }
  } catch (_) {}

  if (!user && email) {
    try {
      user = $app.findFirstRecordByData('users', 'email', email)
    } catch (_) {}
  }

  if (!user) {
    return e.json(404, {
      error: 'Usuário não registrado no CRM.',
      message: 'O usuário do Hub não foi encontrado ou provisionado neste sistema.',
      payload,
      status: 404,
    })
  }

  let userId = user.id
  let internalCompanyId = user.getString('company_id')

  // 2. Hub ID Mapping
  const hubCompanyId = payload.hub_company_id || payload.company_hub_id || payload.company_id
  let company

  if (hubCompanyId) {
    try {
      company = $app.findFirstRecordByData('companies', 'hub_company_id', hubCompanyId)
    } catch (_) {
      try {
        company = $app.findRecordById('companies', hubCompanyId)
      } catch (_) {}
    }

    if (company) {
      if (internalCompanyId !== company.id) {
        internalCompanyId = company.id
      }

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
    } else {
      try {
        const companiesCol = $app.findCollectionByNameOrId('companies')
        company = new Record(companiesCol)
        company.set('hub_company_id', hubCompanyId)
        company.set('name', payload.company_name || 'Empresa via Hub')
        company.set('status', payload.company_status || 'active')
        $app.saveNoValidate(company)
        internalCompanyId = company.id
      } catch (createErr) {
        return e.json(422, {
          error: 'Erro ao criar nova empresa vinculada: ' + createErr.message,
          payload,
          status: 422,
        })
      }
    }
  } else if (internalCompanyId) {
    try {
      company = $app.findRecordById('companies', internalCompanyId)
    } catch (_) {}
  }

  if (company && company.getString('status') !== 'active') {
    return e.json(403, { error: 'A assinatura da sua empresa está inativa.', payload, status: 403 })
  }

  // Update User if needed
  let needsUpdate = false
  if (internalCompanyId && user.getString('company_id') !== internalCompanyId) {
    user.set('company_id', internalCompanyId)
    needsUpdate = true
  }
  if (hubUserId && user.getString('hub_user_id') !== hubUserId) {
    user.set('hub_user_id', hubUserId)
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

  // Ensure we reload the user record fresh from DB
  try {
    user = $app.findRecordById('users', userId)
  } catch (err) {
    return e.json(422, { error: 'Erro ao recarregar dados do usuário.', payload, status: 422 })
  }

  try {
    const payload = {
      id: user.id,
      type: 'auth',
      collectionId: user.collection().id,
      tokenKey: user.getString('tokenKey'),
      company_id: user.getString('company_id'),
      role: user.getString('role'),
      role_company: user.getString('role_company'),
    }

    let tokenSecret = ''
    const collection = user.collection()
    try {
      if (collection.authToken && collection.authToken.secret) {
        tokenSecret = collection.authToken.secret
      } else if (collection.authOptions) {
        const opts =
          typeof collection.authOptions === 'function'
            ? collection.authOptions()
            : collection.authOptions
        if (opts && opts.authToken && opts.authToken.secret) {
          tokenSecret = opts.authToken.secret
        }
      }
    } catch (_) {}

    if (!tokenSecret) {
      tokenSecret = $app.settings().recordAuthToken?.secret || ''
    }

    const token = $security.createJWT(payload, tokenSecret, 1209600)

    return e.json(200, {
      token: token,
      record: user,
    })
  } catch (err) {
    $app.logger().error('SSO Token Gen Failed', 'error', err.message)
    return e.json(422, {
      error: 'Erro interno ao gerar token de autenticação.',
      details: err.message,
      status: 422,
    })
  }
})
