routerAdd('POST', '/backend/v1/auth/check-email', (e) => {
  const body = e.requestInfo().body || {}
  const email = body.email

  if (!email) {
    return e.badRequestError('E-mail é obrigatório.')
  }

  try {
    const record = $app.findAuthRecordByEmail('users', email)
    return e.json(200, {
      exists: true,
      verified: record.getBool('verified'),
    })
  } catch (_) {
    return e.json(200, {
      exists: false,
      verified: false,
    })
  }
})
