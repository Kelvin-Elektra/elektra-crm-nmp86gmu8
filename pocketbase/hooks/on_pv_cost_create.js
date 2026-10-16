onRecordCreate((e) => {
  const method = e.record.getString('calc_method')

  e.record.set('is_real_margin', method === 'margin')

  if (method === 'margin' || method === 'kit_percent') {
    const companyId = e.record.getString('company_id')
    if (companyId) {
      // Bloqueia apenas misturar tipos de margem incompatíveis (não misturar margem real com margem fake)
      const oppositeMethod = method === 'margin' ? 'kit_percent' : 'margin'
      const incompatible = $app.findRecordsByFilter(
        'pv_costs',
        "company_id = '" + companyId + "' && calc_method = '" + oppositeMethod + "'",
        '',
        1,
        0,
      )
      if (incompatible.length > 0) {
        const opposingLabel = oppositeMethod === 'margin' ? 'Margem Real' : 'Margem Fake'
        throw new BadRequestError(
          'A empresa já possui custos configurados com ' +
            opposingLabel +
            '. Escolha um único tipo de margem (Real ou Fake) para todas as faixas da empresa.',
        )
      }
    }
  }

  e.next()
}, 'pv_costs')
