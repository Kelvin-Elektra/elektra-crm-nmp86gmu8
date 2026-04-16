onRecordCreateRequest((e) => {
  if (
    e.auth &&
    (e.auth.getString('role') === 'admin_company' || e.auth.getString('role') === 'admin_elektra')
  ) {
    e.record.setVerified(true)
  }
  e.next()
}, 'users')
