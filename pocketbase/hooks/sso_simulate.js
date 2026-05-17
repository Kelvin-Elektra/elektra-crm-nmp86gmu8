routerAdd('POST', '/backend/v1/sso/simulate', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const userId = body.user_id
    if (!userId) return e.badRequestError('user_id is required')

    const secret = $secrets.get('SSO_SECRET')
    if (!secret) return e.badRequestError('SSO_SECRET is not configured on the server.')

    const user = $app.findRecordById('users', userId)
    let companyId = user.getString('company_id')
    let hubCompanyId = companyId

    if (companyId) {
      try {
        const company = $app.findRecordById('companies', companyId)
        hubCompanyId = company.getString('hub_company_id') || company.id
      } catch (_) {}
    }

    if (!hubCompanyId) {
      hubCompanyId = 'simulated_hub_company_id'
    }

    const payload = {
      id: user.getString('hub_user_id') || user.id,
      hub_user_id: user.getString('hub_user_id') || user.id,
      email: user.getString('email'),
      company_id: hubCompanyId,
      hub_company_id: hubCompanyId,
      name: user.getString('name'),
      role: user.getString('role'),
      role_company: user.getString('role_company'),
    }

    const token = $security.createJWT(payload, secret, 3600)

    return e.json(200, { sso_token: token })
  } catch (err) {
    return e.badRequestError('Simulation failed: ' + err.message)
  }
})
