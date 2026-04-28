routerAdd('GET', '/backend/v1/public/company', (e) => {
  const domain = e.request.url.query().get('domain') || ''
  let company

  try {
    if (domain) {
      try {
        company = $app.findFirstRecordByFilter(
          'companies',
          "domain = {:domain} && status = 'active'",
          { domain: domain },
        )
      } catch (_) {
        company = $app.findFirstRecordByFilter('companies', "status = 'active'")
      }
    } else {
      company = $app.findFirstRecordByFilter('companies', "status = 'active'")
    }
  } catch (_) {
    return e.notFoundError('Company not found')
  }

  const logo = company.getString('logo')
  let logoUrl = ''
  if (logo) {
    logoUrl = `/api/files/${company.collection().id}/${company.id}/${logo}`
  }

  return e.json(200, {
    id: company.id,
    name: company.getString('name'),
    logoUrl: logoUrl,
  })
})
