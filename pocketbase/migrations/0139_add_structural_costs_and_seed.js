migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    if (!col.fields.getByName('is_structural')) {
      col.fields.add(new BoolField({ name: 'is_structural' }))
    }
    app.save(col)

    // Backfill idempotente: marcar ou criar os grupos estruturais para todas as companhias
    const companies = app.findRecordsByFilter('companies', 'id != ""', '', 500)

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i]
      const companyId = company.id

      // 1. Grupo Imposto (calc_method = 'tax')
      const existingTaxes = app.findRecordsByFilter(
        'pv_costs',
        "company_id = '" + companyId + "' && calc_method = 'tax'",
        'created',
        100,
      )
      if (existingTaxes.length > 0) {
        for (let t = 0; t < existingTaxes.length; t++) {
          const rec = existingTaxes[t]
          if (!rec.getBool('is_structural')) {
            rec.set('is_structural', true)
            app.save(rec)
          }
        }
      } else {
        const costCol = app.findCollectionByNameOrId('pv_costs')
        const newTax = new Record(costCol)
        newTax.set('company_id', companyId)
        newTax.set('name', 'Imposto')
        newTax.set('calc_method', 'tax')
        newTax.set('range_type', 'none')
        newTax.set('value', 0)
        newTax.set('calc_base', 'fixed')
        newTax.set('multiplier', 0)
        newTax.set('tax_weight', 100)
        newTax.set('is_structural', true)
        app.save(newTax)
      }

      // 2. Grupo Comissão (calc_method = 'commission')
      const existingCommissions = app.findRecordsByFilter(
        'pv_costs',
        "company_id = '" + companyId + "' && calc_method = 'commission'",
        'created',
        100,
      )
      if (existingCommissions.length > 0) {
        for (let c = 0; c < existingCommissions.length; c++) {
          const rec = existingCommissions[c]
          if (!rec.getBool('is_structural')) {
            rec.set('is_structural', true)
            app.save(rec)
          }
        }
      } else {
        const costCol = app.findCollectionByNameOrId('pv_costs')
        const newComm = new Record(costCol)
        newComm.set('company_id', companyId)
        newComm.set('name', 'Comissão')
        newComm.set('calc_method', 'commission')
        newComm.set('range_type', 'none')
        newComm.set('value', 0)
        newComm.set('calc_base', 'fixed')
        newComm.set('multiplier', 0)
        newComm.set('tax_weight', 0)
        newComm.set('is_structural', true)
        app.save(newComm)
      }

      // 3. Grupo Margem (calc_method = 'margin' ou 'kit_percent')
      const existingMargins = app.findRecordsByFilter(
        'pv_costs',
        "company_id = '" +
          companyId +
          "' && (calc_method = 'margin' || calc_method = 'kit_percent')",
        'created',
        100,
      )
      if (existingMargins.length > 0) {
        for (let m = 0; m < existingMargins.length; m++) {
          const rec = existingMargins[m]
          if (!rec.getBool('is_structural')) {
            rec.set('is_structural', true)
            app.save(rec)
          }
        }
      } else {
        const costCol = app.findCollectionByNameOrId('pv_costs')
        const newMargin = new Record(costCol)
        newMargin.set('company_id', companyId)
        newMargin.set('name', 'Margem')
        newMargin.set('calc_method', 'margin')
        newMargin.set('range_type', 'none')
        newMargin.set('value', 20)
        newMargin.set('calc_base', 'fixed')
        newMargin.set('multiplier', 0)
        newMargin.set('tax_weight', 0)
        newMargin.set('is_real_margin', true)
        newMargin.set('is_structural', true)
        app.save(newMargin)
      }
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    if (col.fields.getByName('is_structural')) {
      col.fields.removeByName('is_structural')
      app.save(col)
    }
  },
)
