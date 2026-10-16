routerAdd('POST', '/backend/v1/hub-sync', (e) => {
  const secret = $secrets.get('HUB_SECRET')

  let provided =
    e.request.header.get('X-Secret') ||
    e.requestInfo().headers['x_secret'] ||
    e.requestInfo().headers['x-secret']

  if (!provided) {
    const authHeader =
      e.request.header.get('Authorization') || e.requestInfo().headers['authorization'] || ''

    if (authHeader.startsWith('Bearer ')) {
      provided = authHeader.substring(7)
    } else if (authHeader) {
      provided = authHeader
    }
  }

  if (!secret || provided !== secret) {
    return e.json(401, { data: {}, message: 'Invalid or missing secret.', status: 401 })
  }

  const body = e.requestInfo().body || {}

  console.log('[hub-sync] payload:', JSON.stringify(body))

  $app
    .logger()
    .info(
      'hub-sync payload received',
      'body',
      JSON.stringify(body),
      'headers_x_secret_present',
      !!provided,
    )

  const hubUserId =
    body.hub_user_id !== undefined && body.hub_user_id !== null
      ? String(body.hub_user_id).trim()
      : ''
  const hubCompanyId =
    body.hub_company_id !== undefined && body.hub_company_id !== null
      ? String(body.hub_company_id).trim()
      : ''

  // Fallback de email na raiz ou dentro de user
  const hubUser = body.user && typeof body.user === 'object' ? body.user : {}
  const rawEmail =
    body.email !== undefined && body.email !== null && String(body.email).trim() !== ''
      ? String(body.email).trim()
      : hubUser.email !== undefined && hubUser.email !== null
        ? String(hubUser.email).trim()
        : ''
  const hubEmail = rawEmail.toLowerCase()

  const isDeleted = body.deleted === true || body.deleted === 'true'
  const hubCompany = body.company && typeof body.company === 'object' ? body.company : {}

  try {
    // 1. Tratamento de Empresa
    let company = null
    let companyChanged = false

    if (hubCompanyId) {
      try {
        company = $app.findFirstRecordByData('companies', 'hub_company_id', hubCompanyId)
      } catch (_) {
        company = null
      }

      // Se a empresa não existe localmente mas temos dados de empresa para criar/sincronizar
      if (!company && !isDeleted) {
        const compCol = $app.findCollectionByNameOrId('companies')
        company = new Record(compCol)
        company.set('hub_company_id', hubCompanyId)
        company.set('name', hubCompany.name || hubCompany.company_name || 'Empresa via Hub')
        company.set('status', hubCompany.status || 'active')
        if (hubCompany.tax_id) {
          company.set('tax_id', hubCompany.tax_id)
        }
        $app.saveNoValidate(company)
        companyChanged = true
      } else if (company) {
        const newCompanyName = hubCompany.name || hubCompany.company_name
        if (newCompanyName && company.getString('name') !== newCompanyName) {
          company.set('name', newCompanyName)
          companyChanged = true
        }

        if (hubCompany.status && company.getString('status') !== hubCompany.status) {
          company.set('status', hubCompany.status)
          companyChanged = true
        }

        if (hubCompany.tax_id && company.getString('tax_id') !== hubCompany.tax_id) {
          company.set('tax_id', hubCompany.tax_id)
          companyChanged = true
        }

        if (companyChanged) {
          $app.saveNoValidate(company)
        }
      }
    }

    // 2. Revogação / Reativação em massa de empresa
    // Contrato: "company": { "status": "inactive" } -> inativar/bloquear TODOS os usuários daquela hub_company_id.
    // Reativação = mesmo payload com "status": "active".
    let companyUsersAffected = 0
    if (hubCompany && hubCompany.status && hubCompanyId) {
      const targetUserStatus = hubCompany.status === 'active' ? 'active' : 'inactive'
      try {
        let compRecords = []
        if (company) {
          compRecords = [company]
        } else {
          compRecords = $app.findRecordsByFilter(
            'companies',
            "hub_company_id = '" + hubCompanyId + "'",
            '',
            1,
          )
        }

        if (compRecords && compRecords.length > 0) {
          const compRecordId = compRecords[0].id
          const companyUsers = $app.findRecordsByFilter(
            'users',
            "company_id = '" + compRecordId + "'",
            '',
            500,
          )

          for (let i = 0; i < companyUsers.length; i++) {
            const u = companyUsers[i]
            if (u.getString('status') !== targetUserStatus) {
              u.set('status', targetUserStatus)
              $app.saveNoValidate(u)
              companyUsersAffected++
            }
          }
        }
      } catch (errCompanyUsers) {
        $app
          .logger()
          .warn('Erro ao atualizar usuários por hub_company_id', 'error', errCompanyUsers.message)
      }
    }

    // 3. Resolução do usuário
    // Ordem obrigatória:
    // - Chave primária: localizar pelo campo hub_user_id
    // - Fallback: se não encontrar por hub_user_id, buscar por email
    // - Auto-correção: se localizar pelo email e hub_user_id vazio ou diferente, atualizar
    let user = null
    let resolvedBy = 'none'

    if (hubUserId) {
      try {
        user = $app.findFirstRecordByData('users', 'hub_user_id', hubUserId)
        resolvedBy = 'hub_user_id'
      } catch (_) {
        user = null
      }
    }

    if (!user && hubEmail) {
      try {
        user = $app.findAuthRecordByEmail('users', hubEmail)
        resolvedBy = 'email'
      } catch (_) {
        try {
          user = $app.findFirstRecordByData('users', 'email', hubEmail)
          resolvedBy = 'email'
        } catch (_) {
          user = null
        }
      }
    }

    // 4. Cenário: Exclusão definitiva (payload contém "deleted": true)
    if (isDeleted) {
      if (!user) {
        // Idempotência: Se o usuário não for encontrado numa ação de exclusão, responder 2xx e ignorar
        console.log(
          '[hub-sync] resultado (delete ignored - user not found):',
          JSON.stringify({
            hubCompanyId,
            hubUserId,
            hubEmail,
            deleted: true,
            companyUsersAffected,
          }),
        )
        return e.json(200, {
          success: true,
          action: 'delete_ignored',
          message: 'Usuário não encontrado para exclusão (idempotente).',
          company_id: company ? company.id : null,
          user_id: null,
        })
      }

      const deletedUserId = user.id
      $app.delete(user)

      console.log(
        '[hub-sync] resultado (deleted):',
        JSON.stringify({
          hubCompanyId,
          hubUserId,
          hubEmail,
          deletedUserId,
          deleted: true,
          companyUsersAffected,
        }),
      )

      return e.json(200, {
        success: true,
        action: 'deleted',
        message: 'Usuário removido com sucesso.',
        company_id: company ? company.id : null,
        user_id: deletedUserId,
      })
    }

    // 5. Cenário: Usuário não encontrado e não é payload de exclusão
    // Se não encontrou o usuário:
    // Se veio user.active === false (revogação de usuário inexistente), responder 200 de forma idempotente sem criar.
    const hasExplicitUserActive = typeof hubUser.active === 'boolean'
    if (!user && hasExplicitUserActive && hubUser.active === false) {
      console.log(
        '[hub-sync] resultado (inactive ignored - user not found):',
        JSON.stringify({
          hubCompanyId,
          hubUserId,
          hubEmail,
          userActive: false,
          companyUsersAffected,
        }),
      )
      return e.json(200, {
        success: true,
        action: 'inactivation_ignored',
        message: 'Usuário não encontrado para inativação (idempotente).',
        company_id: company ? company.id : null,
        user_id: null,
      })
    }

    let userChanged = false

    if (!user) {
      // Criação de novo usuário
      if (!hubUserId && !hubEmail) {
        return e.badRequestError('Missing hub_user_id and email in payload')
      }

      const userCol = $app.findCollectionByNameOrId('users')
      user = new Record(userCol)
      // NUNCA popular o campo id com valor do HUB — o id é gerado pelo schema local
      user.setPassword($security.randomString(20))
      user.setVerified(true)

      if (hubUserId) {
        user.set('hub_user_id', hubUserId)
      }
      if (hubEmail) {
        user.setEmail(hubEmail)
      }
      if (company) {
        user.set('company_id', company.id)
      }

      user.set('role', hubUser.role || 'User_employee')
      user.set('role_company', hubUser.role_company || 'user')
      user.set(
        'status',
        typeof hubUser.active === 'boolean'
          ? hubUser.active
            ? 'active'
            : 'inactive'
          : hubUser.status || 'active',
      )

      if (hubUser.name) {
        user.set('name', hubUser.name)
      }
      if (hubUser.phone) {
        user.set('phone', hubUser.phone)
      }

      userChanged = true
    } else {
      // Usuário existente - aplicar Auto-correção e atualizações estritas (apenas campos explicitamente enviados)
      if (resolvedBy === 'email' && hubUserId && user.getString('hub_user_id') !== hubUserId) {
        user.set('hub_user_id', hubUserId)
        userChanged = true
      } else if (hubUserId && !user.getString('hub_user_id')) {
        user.set('hub_user_id', hubUserId)
        userChanged = true
      }

      if (hubEmail && user.email() !== hubEmail) {
        user.setEmail(hubEmail)
        userChanged = true
      }

      if (!user.verified()) {
        user.setVerified(true)
        userChanged = true
      }

      if (company && user.getString('company_id') !== company.id) {
        user.set('company_id', company.id)
        userChanged = true
      }

      // Regra geral: só aplique a mudança do campo que vier explicitamente no payload; ausência do campo = não mexer.
      if (typeof hubUser.active === 'boolean') {
        const targetStatus = hubUser.active ? 'active' : 'inactive'
        if (user.getString('status') !== targetStatus) {
          user.set('status', targetStatus)
          userChanged = true
        }
      } else if (hubUser.status && (hubUser.status === 'active' || hubUser.status === 'inactive')) {
        if (user.getString('status') !== hubUser.status) {
          user.set('status', hubUser.status)
          userChanged = true
        }
      }

      if (
        hubUser.name !== undefined &&
        hubUser.name !== null &&
        user.getString('name') !== hubUser.name
      ) {
        user.set('name', hubUser.name)
        userChanged = true
      }

      if (
        hubUser.phone !== undefined &&
        hubUser.phone !== null &&
        user.getString('phone') !== hubUser.phone
      ) {
        user.set('phone', hubUser.phone)
        userChanged = true
      }

      if (
        hubUser.role !== undefined &&
        hubUser.role !== null &&
        user.getString('role') !== hubUser.role
      ) {
        user.set('role', hubUser.role)
        userChanged = true
      }

      if (
        hubUser.role_company !== undefined &&
        hubUser.role_company !== null &&
        user.getString('role_company') !== hubUser.role_company
      ) {
        user.set('role_company', hubUser.role_company)
        userChanged = true
      }
    }

    if (hubUser.avatar && typeof hubUser.avatar === 'string' && hubUser.avatar.startsWith('http')) {
      try {
        user.set('avatar', $filesystem.fileFromURL(hubUser.avatar, 15))
        userChanged = true
      } catch (err) {
        $app.logger().warn('Failed to download avatar', 'error', err.message)
      }
    }

    if (user.isNew() || userChanged) {
      $app.saveNoValidate(user)
    }

    console.log(
      '[hub-sync] resultado:',
      JSON.stringify({
        hubCompanyId,
        hubUserId,
        resolvedBy,
        companyStatus: company ? company.getString('status') : null,
        userStatus: user.getString('status'),
        companyChanged,
        userChanged,
        companyUsersAffected,
      }),
    )

    return e.json(200, {
      success: true,
      company_id: company ? company.id : null,
      user_id: user.id,
    })
  } catch (err) {
    $app.logger().error('Hub sync failed', 'error', err.message, 'payload', body)
    return e.internalServerError('Failed to synchronize data')
  }
})
