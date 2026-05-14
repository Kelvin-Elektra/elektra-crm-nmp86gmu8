routerAdd('POST', '/backend/v1/sso/login', (e) => {
  const body = e.requestInfo().body || {}
  const ssoToken = body.sso_token

  if (!ssoToken) {
    return e.json(400, { error: 'sso_token is required', payload: null })
  }

  const secret = $secrets.get('SSO_SECRET')
  if (!secret) {
    return e.json(500, { error: 'SSO is not configured', payload: null })
  }

  let payload
  try {
    payload = $security.parseJWT(ssoToken, secret)
  } catch (err) {
    let unverified = {}
    try {
      unverified = $security.parseUnverifiedJWT(ssoToken)
    } catch (e) {}
    return e.json(401, { error: 'Token inválido ou expirado.', payload: unverified })
  }

  const hubUserId = payload.hub_user_id || payload.id
  if (!hubUserId) {
    return e.json(400, { error: 'Invalid token payload: missing hub_user_id or id', payload })
  }

  const hubCompanyId = payload.company_id || payload.hub_company_id
  if (!hubCompanyId) {
    return e.json(400, {
      error: 'Invalid token payload: missing company_id or hub_company_id',
      payload,
    })
  }

  let company
  try {
    company = $app.findFirstRecordByData('companies', 'hub_company_id', hubCompanyId)
  } catch (_) {
    return e.json(403, {
      error: 'Empresa vinculada não encontrada no CRM (hub_company_id não existe).',
      payload,
    })
  }

  if (company.get('status') !== 'active') {
    return e.json(403, { error: 'A assinatura da sua empresa está inativa.', payload })
  }

  const email = payload.email

  let user
  // Match 1: By hub_user_id
  try {
    user = $app.findFirstRecordByData('users', 'hub_user_id', hubUserId)
  } catch (_) {
    // Match 2: By email
    if (email) {
      try {
        user = $app.findAuthRecordByEmail('users', email)
        user.set('hub_user_id', hubUserId)
        $app.saveNoValidate(user)
      } catch (_) {
        // Provisioning: Create new user
        try {
          const usersCol = $app.findCollectionByNameOrId('users')
          user = new Record(usersCol)
          user.set('hub_user_id', hubUserId)
          user.setEmail(email)
          user.setPassword($security.randomString(20))
          user.setVerified(true)
          user.set('name', payload.name || '')
          user.set('role', payload.role || 'user')
          user.set('company_id', company.id)
          $app.save(user)
        } catch (createErr) {
          return e.json(500, {
            error: 'Erro ao provisionar novo usuário: ' + createErr.message,
            payload,
          })
        }
      }
    } else {
      return e.json(403, {
        error: 'Usuário não encontrado e o token não contém email para provisionamento.',
        payload,
      })
    }
  }

  if (user && user.get('company_id') !== company.id) {
    try {
      user.set('company_id', company.id)
      $app.saveNoValidate(user)
    } catch (updateErr) {
      return e.json(500, { error: 'Erro ao atualizar empresa do usuário.', payload })
    }
  }

  // Crash Prevention Check
  if (!user || user.collection().type !== 'auth') {
    return e.json(500, { error: 'Usuário não é do tipo auth ou é inválido.', payload })
  }

  return $apis.recordAuthResponse($app, e, user)
})
