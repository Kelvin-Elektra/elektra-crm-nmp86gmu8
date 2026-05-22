routerAdd('POST', '/backend/v1/auth/pre-check', (e) => {
  const body = e.requestInfo().body || {}
  const email = body.email

  if (!email) {
    return e.json(200, { exists: false })
  }

  try {
    const user = $app.findAuthRecordByEmail('users', email)
    const hasPassword = !!user.getString('passwordHash')

    if (user.getString('status') === 'inactive') {
      return e.json(200, { exists: true, error: true, message: 'Usuário inativo' })
    }

    return e.json(200, { exists: true, hasPassword })
  } catch (err) {
    return e.json(200, { exists: false })
  }
})
