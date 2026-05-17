routerAdd('GET', '/backend/v1/sso/dev-users', (e) => {
  try {
    const records = $app
      .db()
      .newQuery(
        'SELECT id, name, email, role, role_company, company_id FROM users ORDER BY created DESC LIMIT 200',
      )
      .all()
    return e.json(200, { users: records })
  } catch (err) {
    return e.internalServerError('Failed to fetch dev users: ' + err.message)
  }
})
