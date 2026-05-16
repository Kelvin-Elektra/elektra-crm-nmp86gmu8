routerAdd('POST', '/backend/v1/hub-sync', (e) => {
  const secret = $secrets.get('HUB_SECRET')
  const provided =
    e.request.header.get('X-Hub-Secret') ||
    e.requestInfo().headers['x_hub_secret'] ||
    e.requestInfo().headers['x-hub-secret']

  if (!secret || provided !== secret) {
    return e.unauthorizedError('Invalid or missing secret')
  }

  const body = e.requestInfo().body || {}

  if (body.action === 'sync') {
    const hubUser = body.user
    const hubCompany = body.company
    const roleCompany = body.role_company || 'user'
    const sub = body.subscription

    if (!hubUser || !hubCompany) {
      return e.badRequestError('Missing user or company data in payload')
    }

    try {
      let company
      try {
        company = $app.findFirstRecordByData('companies', 'hub_company_id', hubCompany.id)
      } catch (_) {
        const compCol = $app.findCollectionByNameOrId('companies')
        company = new Record(compCol)
        company.set('hub_company_id', hubCompany.id)
      }
      company.set('name', hubCompany.name || hubCompany.company_name)
      company.set('status', hubCompany.status || (sub && sub.status) || 'active')
      $app.saveNoValidate(company)

      let user
      try {
        user = $app.findFirstRecordByData('users', 'hub_user_id', hubUser.id)
      } catch (_) {
        try {
          user = $app.findAuthRecordByEmail('users', hubUser.email)
        } catch (_) {
          const userCol = $app.findCollectionByNameOrId('users')
          user = new Record(userCol)
          user.setPassword($security.randomString(20))
        }
      }
      user.set('hub_user_id', hubUser.id)
      user.setEmail(hubUser.email)
      user.setVerified(true)
      user.set('name', hubUser.name)
      user.set('role', hubUser.role || 'User_employee')
      user.set('role_company', roleCompany)
      user.set('status', hubUser.active === false ? 'inactive' : 'active')
      user.set('company_id', company.id)

      $app.saveNoValidate(user)

      return e.json(200, { success: true, company_id: company.id, user_id: user.id })
    } catch (err) {
      $app.logger().error('Hub sync failed', 'error', err.message, 'payload', body)
      return e.internalServerError('Failed to synchronize data')
    }
  }

  return e.badRequestError('Invalid action')
})
