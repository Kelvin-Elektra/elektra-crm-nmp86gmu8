onRecordUpdateRequest((e) => {
  const companyId = e.record.get('company_id')
  const newStatus = e.record.get('status')
  const oldStatus = e.record.original().getString('status')

  if (companyId && newStatus === 'active' && oldStatus !== 'active') {
    const company = $app.findRecordById('companies', companyId)
    const maxUsers = company.getInt('max_users') || 5
    const users = $app.findRecordsByFilter(
      'users',
      `company_id = '${companyId}' && status = 'active'`,
      '',
      1000,
      0,
    )
    if (users.length >= maxUsers) {
      throw new BadRequestError(
        `Limite de usuários ativos atingido (${maxUsers}) para esta empresa.`,
      )
    }
  }
  e.next()
}, 'users')
