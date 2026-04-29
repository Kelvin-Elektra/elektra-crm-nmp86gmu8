routerAdd('GET', '/backend/v1/public/system-settings', (e) => {
  try {
    const records = $app.findRecordsByFilter('system_settings', '1=1', 'created', 1, 0)
    if (records.length > 0) {
      const rec = records[0]
      const logo = rec.getString('logo')
      let logoUrl = ''
      if (logo) {
        logoUrl = `/api/files/${rec.collection().id}/${rec.id}/${logo}`
      }
      return e.json(200, {
        system_name: rec.getString('system_name'),
        logoUrl: logoUrl,
      })
    }
    return e.json(200, { system_name: 'Elektra CRM', logoUrl: '' })
  } catch (err) {
    return e.json(200, { system_name: 'Elektra CRM', logoUrl: '' })
  }
})
