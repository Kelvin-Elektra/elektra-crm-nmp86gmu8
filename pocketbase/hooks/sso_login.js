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
    } catch (e) {}
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

  const hubCompanyId = payload.company_id || payload.hub_company_id
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
  } catch (_) {
    try {
      const companiesCol = $app.findCollectionByNameOrId('companies')
      company = new Record(companiesCol)
      company.set('hub_company_id', hubCompanyId)
      company.set('name', payload.company_name || 'Empresa via Hub')
      company.set('status', 'active')
      $app.save(company)
    } catch (createErr) {
      return e.json(422, {
        error: 'Erro ao criar nova empresa vinculada: ' + createErr.message,
        payload,
        status: 422,
      })
    }
  }

  if (company.get('status') !== 'active') {
    return e.json(403, { error: 'A assinatura da sua empresa está inativa.', payload, status: 403 })
  }

  const email = payload.email

  let user
  let userId
  // Match 1: By hub_user_id
  try {
    user = $app.findFirstRecordByData('users', 'hub_user_id', hubUserId)
    userId = user.id

    // Check if the user's company needs an update
    if (user.get('company_id') !== company.id) {
      try {
        user.set('company_id', company.id)
        $app.saveNoValidate(user)
      } catch (updateErr) {
        return e.json(422, {
          error: 'Erro ao atualizar a empresa do usuário.',
          payload,
          status: 422,
        })
      }
    }
  } catch (_) {
    // Match 2: By email
    if (email) {
      try {
        user = $app.findAuthRecordByEmail('users', email)
        userId = user.id

        user.set('hub_user_id', hubUserId)
        if (user.get('company_id') !== company.id) {
          user.set('company_id', company.id)
        }

        try {
          $app.saveNoValidate(user)
        } catch (updateErr) {
          return e.json(422, {
            error: 'Erro ao atualizar usuário existente com dados do Hub.',
            payload,
            status: 422,
          })
        }
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
          user.set('role', payload.role ? payload.role.toLowerCase() : 'user')
          user.set('status', 'active')
          user.set('company_id', company.id)
          $app.save(user)
          userId = user.id
        } catch (createErr) {
          return e.json(422, {
            error: 'Erro ao provisionar novo usuário: ' + createErr.message,
            payload,
            status: 422,
          })
        }
      }
    } else {
      return e.json(400, {
        error: 'Usuário não encontrado e o token não contém email para provisionamento automático.',
        payload,
        status: 400,
      })
    }
  }

  // Integrity Re-fetch (Anti-Panic)
  // Re-fetch the user record using findRecordById to ensure it's fully initialized and linked
  try {
    user = $app.findRecordById('users', userId)
  } catch (err) {
    return e.json(422, {
      error: 'Erro ao recarregar dados do usuário (Integrity Re-fetch).',
      payload,
      status: 422,
    })
  }

  // Crash Prevention Check
  if (!user || user.collection().type !== 'auth') {
    return e.json(422, { error: 'Usuário não é do tipo auth ou é inválido.', payload, status: 422 })
  }

  try {
    return $apis.recordAuthResponse($app, e, user)
  } catch (err) {
    return e.json(422, {
      error: 'Erro interno ao gerar resposta de autenticação.',
      details: err.message,
      status: 422,
    })
  }
})
