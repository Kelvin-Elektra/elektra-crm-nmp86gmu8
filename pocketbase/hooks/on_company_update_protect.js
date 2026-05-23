onRecordUpdateRequest((e) => {
  if (e.hasSuperuserAuth()) return e.next()

  if (e.auth && e.auth.getString('role') !== 'User_elektra') {
    const newMaxUsers = e.record.getInt('max_users')
    const oldMaxUsers = e.record.original().getInt('max_users')

    if (newMaxUsers !== oldMaxUsers) {
      throw new ForbiddenError(
        'Apenas administradores do sistema podem alterar o limite de usuários.',
      )
    }
  }

  return e.next()
}, 'companies')
