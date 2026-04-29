routerAdd('GET', '/backend/v1/public/system-settings', (e) => {
  try {
    const record = $app.findFirstRecordByFilter('system_settings', '1=1')
    const logoName = record.getString('logo')
    const logoUrl = logoName ? `/api/files/system_settings/${record.id}/${logoName}` : ''
    return e.json(200, {
      system_name: record.getString('system_name') || 'Elektra CRM',
      logoUrl: logoUrl,
    })
  } catch (err) {
    return e.json(200, { system_name: 'Elektra CRM', logoUrl: '' })
  }
})
