onRecordDeleteRequest((e) => {
  if (e.record.getBool('is_owner')) {
    throw new BadRequestError('Não é possível remover o dono da empresa.')
  }
  return e.next()
}, 'users')
