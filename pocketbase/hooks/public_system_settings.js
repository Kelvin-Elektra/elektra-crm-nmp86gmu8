routerAdd('GET', '/backend/v1/public/system-settings', (e) => {
  try {
    const record = $app.findFirstRecordByFilter('system_settings', "id != ''")
    return e.json(200, {
      system_name: record.getString('system_name'),
      logoUrl: record.getString('logo')
        ? `/api/files/system_settings/${record.id}/${record.getString('logo')}`
        : '',
    })
  } catch (_) {
    return e.json(200, { system_name: 'Elektra CRM', logoUrl: '' })
  }
})
