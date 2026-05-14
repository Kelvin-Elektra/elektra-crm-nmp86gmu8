routerAdd('GET', '/backend/v1/public/system-settings', (e) => {
  try {
    const record = $app.findFirstRecordByFilter('system_settings', '1=1')
    const logoName = record.getString('logo')
    const logoUrl = logoName ? `/api/files/system_settings/${record.id}/${logoName}` : ''

    const hubLogoName = record.getString('hub_logo')
    const hubLogoUrl = hubLogoName ? `/api/files/system_settings/${record.id}/${hubLogoName}` : ''

    return e.json(200, {
      system_name: record.getString('system_name') || 'Elektra CRM',
      logoUrl: logoUrl,
      hub_logoUrl: hubLogoUrl,
      hub_url: record.getString('hub_url') || 'https://hub.elektrasolucoes.tech/',
      hub_description:
        record.getString('hub_description') ||
        'Acesse o Hub para gerenciar sua conta e produtos Elektra.',
    })
  } catch (err) {
    return e.json(200, {
      system_name: 'Elektra CRM',
      logoUrl: '',
      hub_logoUrl: '',
      hub_url: 'https://hub.elektrasolucoes.tech/',
      hub_description: 'Acesse o Hub para gerenciar sua conta e produtos Elektra.',
    })
  }
})
