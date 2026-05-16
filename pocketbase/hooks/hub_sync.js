routerAdd('POST', '/backend/v1/hub-sync', (e) => {
  const secret = $secrets.get('HUB_SECRET')

  let provided =
    e.request.header.get('X-Secret') ||
    e.requestInfo().headers['x_secret'] ||
    e.requestInfo().headers['x-secret']

  if (!provided) {
    const authHeader =
      e.request.header.get('Authorization') || e.requestInfo().headers['authorization'] || ''

    if (authHeader.startsWith('Bearer ')) {
      provided = authHeader.substring(7)
    } else if (authHeader) {
      provided = authHeader
    }
  }

  if (!secret || provided !== secret) {
    return e.json(401, { data: {}, message: 'Invalid or missing secret.', status: 401 })
  }

  const body = e.requestInfo().body || {}

  const hubUserId = body.hub_user_id
  const hubCompanyId = body.hub_company_id
  const hubUser = body.user || {}
  const hubCompany = body.company || {}

  if (!hubUserId || !hubCompanyId) {
    return e.badRequestError('Missing hub_user_id or hub_company_id in payload')
  }

  try {
    let company
    try {
      company = $app.findFirstRecordByData('companies', 'hub_company_id', hubCompanyId)
    } catch (_) {
      const compCol = $app.findCollectionByNameOrId('companies')
      company = new Record(compCol)
      company.set('hub_company_id', hubCompanyId)
    }

    if (hubCompany.name || hubCompany.company_name) {
      company.set('name', hubCompany.name || hubCompany.company_name)
    } else if (company.isNew()) {
      company.set('name', 'Empresa via Hub')
    }

    if (hubCompany.status) {
      company.set('status', hubCompany.status)
    } else if (company.isNew()) {
      company.set('status', 'active')
    }

    if (hubCompany.tax_id) {
      company.set('tax_id', hubCompany.tax_id)
    }

    $app.saveNoValidate(company)

    let user
    try {
      user = $app.findFirstRecordByData('users', 'hub_user_id', hubUserId)
    } catch (_) {
      try {
        if (hubUser.email) {
          user = $app.findAuthRecordByEmail('users', hubUser.email)
        } else {
          throw new Error('Not found by email')
        }
      } catch (_) {
        const userCol = $app.findCollectionByNameOrId('users')
        user = new Record(userCol)
        user.setPassword($security.randomString(20))
      }
    }

    user.set('hub_user_id', hubUserId)

    if (hubUser.email) {
      user.setEmail(hubUser.email)
    }

    user.setVerified(true)

    if (hubUser.name) {
      user.set('name', hubUser.name)
    }

    if (hubUser.phone) {
      user.set('phone', hubUser.phone)
    }

    if (hubUser.role) {
      user.set('role', hubUser.role)
    } else if (user.isNew()) {
      user.set('role', 'User_employee')
    }

    if (hubUser.role_company) {
      user.set('role_company', hubUser.role_company)
    } else if (user.isNew()) {
      user.set('role_company', 'user')
    }

    if (hubUser.avatar && hubUser.avatar.startsWith('http')) {
      try {
        user.set('avatar', $filesystem.fileFromURL(hubUser.avatar, 15))
      } catch (err) {
        $app.logger().warn('Failed to download avatar', 'error', err.message)
      }
    }

    if (typeof hubUser.active === 'boolean') {
      user.set('status', hubUser.active ? 'active' : 'inactive')
    } else if (hubUser.status) {
      user.set('status', hubUser.status)
    } else if (user.isNew()) {
      user.set('status', 'active')
    }

    user.set('company_id', company.id)

    $app.saveNoValidate(user)

    return e.json(200, { success: true, company_id: company.id, user_id: user.id })
  } catch (err) {
    $app.logger().error('Hub sync failed', 'error', err.message, 'payload', body)
    return e.internalServerError('Failed to synchronize data')
  }
})
