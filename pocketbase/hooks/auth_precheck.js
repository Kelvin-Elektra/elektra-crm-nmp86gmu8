routerAdd('POST', '/backend/v1/auth/pre-check', (e) => {
  const body = e.requestInfo().body
  const email = body.email

  if (!email) return e.badRequestError('Email obrigatório')

  let user
  try {
    user = $app.findAuthRecordByEmail('users', email)
  } catch (_) {
    return e.json(200, { exists: false })
  }

  if (user.getString('status') === 'inactive') {
    return e.json(200, {
      exists: true,
      error: 'user_inactive',
      message: 'Usuário inativo. Entre em contato com o administrador.',
    })
  }

  const companyId = user.getString('company_id')
  if (companyId) {
    try {
      const company = $app.findRecordById('companies', companyId)
      if (company.getString('status') !== 'active') {
        return e.json(200, {
          exists: true,
          error: 'company_inactive',
          message: 'A assinatura da sua empresa está inativa.',
        })
      }
    } catch (_) {}
  }

  const passwordHash = user.getString('passwordHash')
  if (!passwordHash) {
    return e.json(200, { exists: true, hasPassword: false })
  }

  return e.json(200, { exists: true, hasPassword: true })
})
