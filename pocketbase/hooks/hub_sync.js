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

  if (body.action === 'update_status') {
    if ((!body.company_id && !body.hub_id) || !body.status) {
      return e.badRequestError('Missing hub_id or company_id, or missing status')
    }

    try {
      let company
      if (body.hub_id) {
        company = $app.findFirstRecordByData('companies', 'hub_id', body.hub_id)
      } else {
        company = $app.findRecordById('companies', body.company_id)
      }

      company.set('status', body.status)
      $app.save(company)
      return e.json(200, {
        success: true,
        company_id: company.id,
        hub_id: company.getString('hub_id'),
        status: company.get('status'),
      })
    } catch (err) {
      return e.notFoundError('Company not found')
    }
  }

  if (body.action === 'provision') {
    if (!body.company_name || !body.admin_email || !body.admin_name || !body.hub_id) {
      return e.badRequestError('Missing company_name, admin_email, admin_name, or hub_id')
    }

    try {
      let newCompanyId = ''
      $app.runInTransaction((txApp) => {
        const compCol = txApp.findCollectionByNameOrId('companies')
        const company = new Record(compCol)
        company.set('name', body.company_name)
        company.set('status', 'active')
        company.set('max_users', 5)
        company.set('hub_id', body.hub_id)
        txApp.save(company)
        newCompanyId = company.id

        const userCol = txApp.findCollectionByNameOrId('users')
        const user = new Record(userCol)
        user.set('name', body.admin_name)
        user.setEmail(body.admin_email)
        user.setVerified(true)
        user.setPassword('Elektra@123')
        user.set('role', 'admin_company')
        user.set('status', 'active')
        user.set('company_id', company.id)
        user.set('is_owner', true)
        txApp.save(user)
      })

      return e.json(200, { success: true, company_id: newCompanyId, hub_id: body.hub_id })
    } catch (err) {
      $app.logger().error('Provisioning failed', 'error', err.message)
      return e.internalServerError('Failed to provision company')
    }
  }

  return e.badRequestError('Invalid action')
})
