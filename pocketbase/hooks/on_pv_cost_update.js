onRecordUpdate((e) => {
  const method = e.record.getString('calc_method')
  const prevMethod = e.record.original().getString('calc_method')

  e.record.set('is_real_margin', method === 'margin')

  if ((method === 'margin' || method === 'kit_percent') && method !== prevMethod) {
    const companyId = e.record.getString('company_id')
    const recordId = e.record.id
    if (companyId) {
      const existing = $app.findRecordsByFilter(
        'pv_costs',
        "company_id = '" +
          companyId +
          "' && (calc_method = 'margin' || calc_method = 'kit_percent') && id != '" +
          recordId +
          "'",
        '',
        1,
        0,
      )
      if (existing.length > 0) {
        throw new BadRequestError(
          'Ja existe um custo do tipo Margem para esta empresa. Apenas um tipo de margem pode estar ativo por empresa.',
        )
      }
    }
  }

  e.next()
}, 'pv_costs')
