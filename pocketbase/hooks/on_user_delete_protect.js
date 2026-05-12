onRecordDeleteRequest((e) => {
  if (e.record.getBool('is_owner')) {
    const isSuperuser = e.hasSuperuserAuth()
    const isAdminElektra = e.auth && e.auth.getString('role') === 'admin_elektra'

    if (!isSuperuser && !isAdminElektra) {
      throw new BadRequestError('Não é possível remover o dono da empresa.')
    }
  }
  return e.next()
}, 'users')
