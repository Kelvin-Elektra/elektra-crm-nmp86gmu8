onRecordAuthRequest((e) => {
  const user = e.record

  if (user.getString('status') === 'inactive') {
    throw new ForbiddenError('Usuário inativo. Entre em contato com o suporte.')
  }

  const companyId = user.getString('company_id')
  if (companyId) {
    try {
      const company = $app.findRecordById('companies', companyId)
      if (company.getString('status') !== 'active') {
        throw new ForbiddenError('A assinatura da sua empresa está inativa ou bloqueada.')
      }
    } catch (_) {}
  }

  const email = user.getString('email')
  if (!user.getBool('verified') && email !== 'elektraengenhariasolucoes@gmail.com') {
    throw new ForbiddenError(
      'Email não verificado. Verifique sua caixa de entrada para validar seu acesso.',
    )
  }

  e.next()
}, 'users')
