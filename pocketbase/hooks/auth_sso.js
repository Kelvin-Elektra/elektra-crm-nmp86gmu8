routerAdd('POST', '/backend/v1/auth/sso', (e) => {
  let body = e.requestInfo().body || {}
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (_) {
      body = {}
    }
  }

  const ssoToken = body.sso_token
  if (!ssoToken) {
    return e.json(400, { message: 'Token SSO ausente.' })
  }

  const secret = $secrets.get('SSO_SECRET')
  if (!secret) {
    $app.logger().error('SSO_SECRET não configurada no backend')
    return e.json(500, { message: 'Configuração de SSO indisponível.' })
  }

  let payload
  try {
    payload = $security.parseJWT(ssoToken, secret)
  } catch (err) {
    return e.json(401, { message: 'Token SSO inválido ou expirado.' })
  }

  const hubUserId = payload.id
  const hubCompanyId = payload.company_id

  if (!hubUserId) {
    return e.json(400, { message: 'Token SSO sem identificação de usuário.' })
  }

  // 1. Busca usuário por hub_user_id — se não encontrar, 404
  let user
  try {
    user = $app.findFirstRecordByData('users', 'hub_user_id', hubUserId)
  } catch (_) {
    return e.json(404, {
      message: 'Usuário não encontrado. Entre em contato com a administração do sistema.',
    })
  }

  // 2. Busca empresa por hub_company_id — se não encontrar, 404
  let company
  if (hubCompanyId) {
    try {
      company = $app.findFirstRecordByData('companies', 'hub_company_id', hubCompanyId)
    } catch (_) {
      return e.json(404, {
        message: 'Empresa não encontrada. Entre em contato com a administração do sistema.',
      })
    }
  } else {
    // Sem company_id no token: tenta pela company_id do usuário
    const userCompanyId = user.getString('company_id')
    if (userCompanyId) {
      try {
        company = $app.findRecordById('companies', userCompanyId)
      } catch (_) {
        return e.json(404, {
          message: 'Empresa não encontrada. Entre em contato com a administração do sistema.',
        })
      }
    }
  }

  // 3. Verifica se usuário e empresa estão ativos
  if (user.getString('status') !== 'active') {
    return e.json(403, {
      message: 'Usuário inativo. Entre em contato com a administração do sistema.',
    })
  }

  if (company && company.getString('status') !== 'active') {
    return e.json(403, {
      message: 'Empresa inativa. Entre em contato com a administração do sistema.',
    })
  }

  // 4. Sincroniza dados básicos do JWT para o registro do usuário (somente se vierem no token)
  let dirty = false
  if (payload.email && payload.email !== user.getString('email')) {
    user.setEmail(payload.email)
    dirty = true
  }
  if (payload.name && payload.name !== user.getString('name')) {
    user.set('name', payload.name)
    dirty = true
  }
  if (payload.phone && payload.phone !== user.getString('phone')) {
    user.set('phone', payload.phone)
    dirty = true
  }
  if (payload.role && payload.role !== user.getString('role')) {
    user.set('role', payload.role)
    dirty = true
  }
  if (payload.role_company && payload.role_company !== user.getString('role_company')) {
    user.set('role_company', payload.role_company)
    dirty = true
  }
  if (company && user.getString('company_id') !== company.id) {
    user.set('company_id', company.id)
    dirty = true
  }
  // Garante verified=true para acesso via Hub
  if (!user.getBool('verified')) {
    user.setVerified(true)
    dirty = true
  }
  if (dirty) {
    $app.saveNoValidate(user)
  }

  // 5. Gera token de autenticação PocketBase para o usuário
  const token = user.newAuthToken()

  // 6. Monta o objeto público do usuário
  const userObj = {
    id: user.id,
    email: user.getString('email'),
    name: user.getString('name'),
    phone: user.getString('phone'),
    role: user.getString('role'),
    role_company: user.getString('role_company'),
    status: user.getString('status'),
    company_id: user.getString('company_id'),
    hub_user_id: user.getString('hub_user_id'),
    verified: user.getBool('verified'),
    created: user.getString('created'),
    updated: user.getString('updated'),
  }

  return e.json(200, {
    token,
    user: userObj,
    record: userObj, // alias para compatibilidade com pb.authStore.save(token, record)
  })
})
