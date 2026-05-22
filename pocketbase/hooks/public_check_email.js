routerAdd('POST', '/backend/v1/auth/check-email', (e) => {
  let body = e.requestInfo().body || {}
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (_) {}
  }
  const email = body.email
  if (!email) return e.json(200, { exists: false })

  try {
    $app.findAuthRecordByEmail('users', email)
    return e.json(200, { exists: true })
  } catch (_) {
    return e.json(200, { exists: false })
  }
})
