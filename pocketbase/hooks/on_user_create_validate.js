onRecordCreateRequest((e) => {
  const companyId = e.record.get('company_id')
  if (companyId) {
    const company = $app.findRecordById('companies', companyId)
    const maxUsers = company.getInt('max_users') || 5
    const users = $app.findRecordsByFilter('users', `company_id = '${companyId}'`, '', 1000, 0)
    if (users.length >= maxUsers) {
      throw new BadRequestError('Limite de usuários atingido para esta empresa.')
    }
  }
  e.next()
}, 'users')
