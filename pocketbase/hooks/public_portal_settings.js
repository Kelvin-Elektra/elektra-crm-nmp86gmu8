routerAdd('GET', '/backend/v1/portal-settings', (e) => {
  try {
    const records = $app.findRecordsByFilter('system_settings', "id != ''", '', 1, 0)
    if (records.length > 0) {
      const record = records[0]
      const logo = record.getString('logo')
      const bg = record.getString('login_background')

      return e.json(200, {
        system_name: record.getString('system_name'),
        logo: logo ? `/api/files/system_settings/${record.id}/${logo}` : null,
        login_background: bg ? `/api/files/system_settings/${record.id}/${bg}` : null,
      })
    }
    return e.json(200, { system_name: 'Elektra CRM', logo: null, login_background: null })
  } catch (err) {
    $app.logger().error('Error fetching portal settings', 'error', err.message)
    return e.json(200, { system_name: 'Elektra CRM', logo: null, login_background: null })
  }
})
