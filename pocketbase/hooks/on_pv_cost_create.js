onRecordCreate((e) => {
  const method = e.record.getString('calc_method')

  e.record.set('is_real_margin', method === 'margin')

  if (method === 'margin') {
    const companyId = e.record.getString('company_id')
    if (companyId) {
      const existing = $app.findRecordsByFilter(
        'pv_costs',
        "company_id = '" + companyId + "' && calc_method = 'margin'",
        '',
        1,
        0,
      )
      if (existing.length > 0) {
        throw new BadRequestError(
          'Ja existe um custo do tipo Margem para esta empresa. Substitua o existente.',
        )
      }
    }
  }

  e.next()
}, 'pv_costs')
