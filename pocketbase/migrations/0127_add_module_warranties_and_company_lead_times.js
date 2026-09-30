migrate(
  (app) => {
    // 1. Campos de garantia nos módulos: garantia_fabricacao e garantia_linear
    const modulesCol = app.findCollectionByNameOrId('pv_modules')
    if (!modulesCol.fields.getByName('warranty_manufacturing')) {
      modulesCol.fields.add(new TextField({ name: 'warranty_manufacturing' }))
    }
    if (!modulesCol.fields.getByName('warranty_linear')) {
      modulesCol.fields.add(new TextField({ name: 'warranty_linear' }))
    }
    app.save(modulesCol)

    // 2. Migrar dados existentes da coluna 'warranty' antiga para 'warranty_manufacturing'
    try {
      app
        .db()
        .newQuery(`
        UPDATE pv_modules
        SET warranty_manufacturing = warranty
        WHERE (warranty_manufacturing IS NULL OR warranty_manufacturing = '')
          AND warranty IS NOT NULL AND warranty != ''
      `)
        .execute()
    } catch (e) {
      console.log('Aviso ao migrar warranty antiga de pv_modules:', e)
    }

    // 3. Campo installation_lead_times (JSON) na tabela companies para múltiplos prazos
    const companiesCol = app.findCollectionByNameOrId('companies')
    if (!companiesCol.fields.getByName('installation_lead_times')) {
      companiesCol.fields.add(new JSONField({ name: 'installation_lead_times' }))
    }
    app.save(companiesCol)

    // 4. Migrar dado existente de installation_lead_time da empresa para a lista como item padrão
    try {
      const companies = app.findRecordsByFilter(
        'companies',
        "installation_lead_time != ''",
        '',
        500,
        0,
      )
      for (const comp of companies) {
        const singleTime = comp.getString('installation_lead_time')
        const currentList = comp.get('installation_lead_times')
        if (
          singleTime &&
          (!currentList || !Array.isArray(currentList) || currentList.length === 0)
        ) {
          const initialList = [
            {
              id: 'lead-time-1',
              label: singleTime,
              is_default: true,
            },
          ]
          comp.set('installation_lead_times', initialList)
          app.save(comp)
        }
      }
    } catch (e) {
      console.log('Aviso ao migrar installation_lead_time para companies:', e)
    }
  },
  (app) => {
    const modulesCol = app.findCollectionByNameOrId('pv_modules')
    if (modulesCol.fields.getByName('warranty_manufacturing')) {
      modulesCol.fields.removeByName('warranty_manufacturing')
    }
    if (modulesCol.fields.getByName('warranty_linear')) {
      modulesCol.fields.removeByName('warranty_linear')
    }
    app.save(modulesCol)

    const companiesCol = app.findCollectionByNameOrId('companies')
    if (companiesCol.fields.getByName('installation_lead_times')) {
      companiesCol.fields.removeByName('installation_lead_times')
    }
    app.save(companiesCol)
  },
)
