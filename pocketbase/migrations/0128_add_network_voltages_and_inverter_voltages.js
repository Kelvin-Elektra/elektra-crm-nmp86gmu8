migrate(
  (app) => {
    // 1. pv_utilities: adiciona campo json 'network_voltages'
    // Mapeia cada tipo de rede -> { phase: '127' | '220' | ..., line: '220' | '380' | ... }
    const utilCol = app.findCollectionByNameOrId('pv_utilities')
    if (!utilCol.fields.getByName('network_voltages')) {
      utilCol.fields.add(
        new JSONField({
          name: 'network_voltages',
          required: false,
        }),
      )
      app.save(utilCol)
    }

    // 2. pv_inverters: adiciona campo json 'voltages' (multi-select de tensões nominais)
    const invCol = app.findCollectionByNameOrId('pv_inverters')
    if (!invCol.fields.getByName('voltages')) {
      invCol.fields.add(
        new JSONField({
          name: 'voltages',
          required: false,
        }),
      )
      app.save(invCol)
    }

    // 3. Backfill/migração legada de pv_inverters:
    // Se o inversor tem 'voltage' textual (ex: "220V", "380V", "220"), migra para array JSON em 'voltages'
    try {
      const records = app.findRecordsByFilter('pv_inverters', "voltage != ''", '', 0, 0)
      for (const rec of records) {
        const existingVoltages = rec.get('voltages')
        if (
          !existingVoltages ||
          (Array.isArray(existingVoltages) && existingVoltages.length === 0)
        ) {
          const rawVolt = String(rec.getString('voltage') || '')
          const clean = rawVolt.replace(/[^0-9]/g, '')
          if (clean) {
            rec.set('voltages', [clean])
            app.save(rec)
          }
        }
      }
    } catch (err) {
      console.log('Aviso ao migrar tensões legadas de inversores:', err)
    }
  },
  (app) => {
    try {
      const utilCol = app.findCollectionByNameOrId('pv_utilities')
      if (utilCol.fields.getByName('network_voltages')) {
        utilCol.fields.removeByName('network_voltages')
        app.save(utilCol)
      }
    } catch (_) {}

    try {
      const invCol = app.findCollectionByNameOrId('pv_inverters')
      if (invCol.fields.getByName('voltages')) {
        invCol.fields.removeByName('voltages')
        app.save(invCol)
      }
    } catch (_) {}
  },
)
