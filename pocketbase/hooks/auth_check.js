routerAdd('POST', '/backend/v1/auth-check', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, {
      blocked: true,
      reason: 'unauthorized',
      message: 'Não autenticado.',
    })
  }

  const userId = authRecord.id
  if (!userId) {
    return e.json(401, {
      blocked: true,
      reason: 'unauthorized',
      message: 'Usuário não identificado.',
    })
  }

  // 1. Carrega o usuário diretamente do banco pelo id (não confiar em campos do token)
  let user
  try {
    user = $app.findRecordById('users', userId)
  } catch (_) {
    return e.json(403, {
      blocked: true,
      reason: 'user',
      message: 'Usuário não encontrado.',
    })
  }

  // Verifica users.status: se != 'active', responder 403 com { blocked: true, reason: 'user' }
  const userStatus = user.getString('status')
  if (userStatus !== 'active') {
    return e.json(403, {
      blocked: true,
      reason: 'user',
      message: 'Usuário inativo.',
    })
  }

  // 2. Carrega a empresa via user.company_id e verifica companies.status
  const companyId = user.getString('company_id')
  if (companyId) {
    let company
    try {
      company = $app.findRecordById('companies', companyId)
    } catch (_) {
      return e.json(403, {
        blocked: true,
        reason: 'company',
        message: 'Empresa vinculada não encontrada.',
      })
    }

    const companyStatus = company.getString('status')
    if (companyStatus !== 'active') {
      return e.json(403, {
        blocked: true,
        reason: 'company',
        message: 'Empresa inativa.',
      })
    }
  }

  // Se tudo ok, responder 200 { ok: true }
  return e.json(200, { ok: true })
})
