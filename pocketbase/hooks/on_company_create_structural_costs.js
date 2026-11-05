onRecordAfterCreateSuccess((e) => {
  const companyId = e.record.id
  if (!companyId) return e.next()

  try {
    const costCol = $app.findCollectionByNameOrId('pv_costs')

    // 1. Grupo Imposto
    const existingTax = $app.findRecordsByFilter(
      'pv_costs',
      "company_id = '" + companyId + "' && calc_method = 'tax'",
      '',
      1,
    )
    if (existingTax.length === 0) {
      const taxRec = new Record(costCol)
      taxRec.set('company_id', companyId)
      taxRec.set('name', 'Imposto')
      taxRec.set('calc_method', 'tax')
      taxRec.set('range_type', 'none')
      taxRec.set('value', 0)
      taxRec.set('calc_base', 'fixed')
      taxRec.set('multiplier', 0)
      taxRec.set('tax_weight', 100)
      taxRec.set('is_structural', true)
      $app.save(taxRec)
    }

    // 2. Grupo Comissão
    const existingComm = $app.findRecordsByFilter(
      'pv_costs',
      "company_id = '" + companyId + "' && calc_method = 'commission'",
      '',
      1,
    )
    if (existingComm.length === 0) {
      const commRec = new Record(costCol)
      commRec.set('company_id', companyId)
      commRec.set('name', 'Comissão')
      commRec.set('calc_method', 'commission')
      commRec.set('range_type', 'none')
      commRec.set('value', 0)
      commRec.set('calc_base', 'fixed')
      commRec.set('multiplier', 0)
      commRec.set('tax_weight', 0)
      commRec.set('is_structural', true)
      $app.save(commRec)
    }

    // 3. Grupo Margem
    const existingMargin = $app.findRecordsByFilter(
      'pv_costs',
      "company_id = '" + companyId + "' && (calc_method = 'margin' || calc_method = 'kit_percent')",
      '',
      1,
    )
    if (existingMargin.length === 0) {
      const marginRec = new Record(costCol)
      marginRec.set('company_id', companyId)
      marginRec.set('name', 'Margem')
      marginRec.set('calc_method', 'margin')
      marginRec.set('range_type', 'none')
      marginRec.set('value', 20)
      marginRec.set('calc_base', 'fixed')
      marginRec.set('multiplier', 0)
      marginRec.set('tax_weight', 0)
      marginRec.set('is_real_margin', true)
      marginRec.set('is_structural', true)
      $app.save(marginRec)
    }
  } catch (err) {
    console.error('Erro ao provisionar grupos estruturais de pv_costs para nova empresa:', err)
  }

  return e.next()
}, 'companies')
