routerAdd('GET', '/backend/v1/sso/dev-users', (e) => {
  try {
    const records = $app.findRecordsByFilter('users', '', '-created', 200, 0)
    const users = records.map((r) => ({
      id: r.id,
      name: r.getString('name'),
      email: r.getString('email'),
      role: r.getString('role'),
      role_company: r.getString('role_company'),
      company_id: r.getString('company_id'),
    }))
    return e.json(200, { users })
  } catch (err) {
    return e.internalServerError('Failed to fetch dev users: ' + err.message)
  }
})
