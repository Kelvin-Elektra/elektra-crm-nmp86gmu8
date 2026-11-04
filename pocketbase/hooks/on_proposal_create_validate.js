onRecordCreateRequest((e) => {
  // Atribuição automática de número sequencial (proposal_seq) e código amigável (proposal_code ex: #0012)
  try {
    const existingCode = e.record.getString('proposal_code')
    if (!existingCode) {
      let companyId = e.record.getString('company_id')
      if (!companyId && e.auth) {
        companyId = e.auth.getString('company_id') || ''
        if (companyId) e.record.set('company_id', companyId)
      }

      if (companyId) {
        let company = null
        try {
          company = $app.findRecordById('companies', companyId)
        } catch (_) {}

        if (company) {
          const nextSeq = (company.getInt('proposal_counter') || 0) + 1
          company.set('proposal_counter', nextSeq)
          $app.save(company)

          e.record.set('proposal_seq', nextSeq)
          e.record.set('proposal_code', '#' + String(nextSeq).padStart(4, '0'))
        } else {
          const count = $app.countRecords(
            'proposals',
            $dbx.exp('company_id = {:cid}', { cid: companyId }),
          )
          const nextSeq = count + 1
          e.record.set('proposal_seq', nextSeq)
          e.record.set('proposal_code', '#' + String(nextSeq).padStart(4, '0'))
        }
      }
    }
  } catch (seqErr) {
    try {
      $app.logger().warn('Erro ao gerar proposal_code na proposta', 'error', String(seqErr))
    } catch (_) {}
  }

  const discount = Number(e.record.get('discount_amount')) || 0
  const authId = e.auth ? e.auth.id : ''

  if (discount > 0 && authId) {
    try {
      const user = $app.findRecordById('users', authId)
      const role = user.getString('role') || ''
      const roleCompany = user.getString('role_company') || ''
      if (role === 'User_elektra' || roleCompany === 'admin' || role === 'User_owner') {
        e.next()
        return
      }
      const maxDiscount = Number(user.get('max_discount')) || 0
      // Tolerância de 0.01 para arredondamentos em ponto flutuante
      if (discount > maxDiscount + 0.01) {
        throw new BadRequestError(
          'Desconto (' +
            discount.toFixed(2) +
            '%) excede o limite máximo permitido (' +
            maxDiscount.toFixed(2) +
            '%).',
        )
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err
    }
  }

  e.next()
}, 'proposals')
