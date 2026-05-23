onRecordUpdateRequest((e) => {
  const companyId = e.record.get('company_id')
  if (
    companyId &&
    e.record.getString('status') === 'active' &&
    e.record.original().getString('status') !== 'active'
  ) {
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
        `Limite de usuários ativos atingido (${maxUsers}) para esta empresa. Mude de plano para adicionar mais.`,
      )
    }
  }
  e.next()
}, 'users')
