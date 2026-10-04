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

  $app
    .logger()
    .info(
      'hub-sync payload received',
      'body',
      JSON.stringify(body),
      'headers_x_secret_present',
      !!provided,
    )

  const hubUserId = body.hub_user_id
  const hubCompanyId = body.hub_company_id
  const hubUser = body.user || {}
  const hubCompany = body.company || {}

  if (!hubUserId || !hubCompanyId) {
    return e.badRequestError('Missing hub_user_id or hub_company_id in payload')
  }

  try {
    let company
    let companyChanged = false
    try {
      company = $app.findFirstRecordByData('companies', 'hub_company_id', hubCompanyId)
    } catch (_) {
      const compCol = $app.findCollectionByNameOrId('companies')
      company = new Record(compCol)
      company.set('hub_company_id', hubCompanyId)
      companyChanged = true
    }

    const newCompanyName = hubCompany.name || hubCompany.company_name
    if (newCompanyName && company.getString('name') !== newCompanyName) {
      company.set('name', newCompanyName)
      companyChanged = true
    } else if (company.isNew() && !company.getString('name')) {
      company.set('name', 'Empresa via Hub')
      companyChanged = true
    }

    if (hubCompany.status && company.getString('status') !== hubCompany.status) {
      company.set('status', hubCompany.status)
      companyChanged = true
    } else if (company.isNew() && !company.getString('status')) {
      company.set('status', 'active')
      companyChanged = true
    }

    if (hubCompany.tax_id && company.getString('tax_id') !== hubCompany.tax_id) {
      company.set('tax_id', hubCompany.tax_id)
      companyChanged = true
    }

    if (company.isNew() || companyChanged) {
      $app.saveNoValidate(company)
    }

    let user
    let userChanged = false
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
        userChanged = true
      }
    }

    if (user.getString('hub_user_id') !== hubUserId) {
      user.set('hub_user_id', hubUserId)
      userChanged = true
    }

    if (hubUser.email && user.email() !== hubUser.email) {
      user.setEmail(hubUser.email)
      userChanged = true
    }

    if (!user.verified()) {
      user.setVerified(true)
      userChanged = true
    }

    if (hubUser.name && user.getString('name') !== hubUser.name) {
      user.set('name', hubUser.name)
      userChanged = true
    }

    if (hubUser.phone && user.getString('phone') !== hubUser.phone) {
      user.set('phone', hubUser.phone)
      userChanged = true
    }

    if (hubUser.role && user.getString('role') !== hubUser.role) {
      user.set('role', hubUser.role)
      userChanged = true
    } else if (user.isNew() && !user.getString('role')) {
      user.set('role', 'User_employee')
      userChanged = true
    }

    if (hubUser.role_company && user.getString('role_company') !== hubUser.role_company) {
      user.set('role_company', hubUser.role_company)
      userChanged = true
    } else if (user.isNew() && !user.getString('role_company')) {
      user.set('role_company', 'user')
      userChanged = true
    }

    if (hubUser.avatar && hubUser.avatar.startsWith('http')) {
      try {
        user.set('avatar', $filesystem.fileFromURL(hubUser.avatar, 15))
        userChanged = true
      } catch (err) {
        $app.logger().warn('Failed to download avatar', 'error', err.message)
      }
    }

    let desiredStatus = null
    if (typeof hubUser.active === 'boolean') {
      desiredStatus = hubUser.active ? 'active' : 'inactive'
    } else if (hubUser.status) {
      desiredStatus = hubUser.status
    } else if (user.isNew()) {
      desiredStatus = 'active'
    }

    if (desiredStatus && user.getString('status') !== desiredStatus) {
      user.set('status', desiredStatus)
      userChanged = true
    }

    if (user.getString('company_id') !== company.id) {
      user.set('company_id', company.id)
      userChanged = true
    }

    if (user.isNew() || userChanged) {
      $app.saveNoValidate(user)
    }

    return e.json(200, { success: true, company_id: company.id, user_id: user.id })
  } catch (err) {
    $app.logger().error('Hub sync failed', 'error', err.message, 'payload', body)
    return e.internalServerError('Failed to synchronize data')
  }
})
