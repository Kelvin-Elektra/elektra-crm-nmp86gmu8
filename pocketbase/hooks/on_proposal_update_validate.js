onRecordUpdateRequest((e) => {
  const newDiscount = Number(e.record.get('discount_amount')) || 0
  const oldDiscount = Number(e.record.original().get('discount_amount')) || 0
  const authId = e.auth ? e.auth.id : ''

  if (newDiscount !== oldDiscount && newDiscount > 0 && authId) {
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
      if (newDiscount > maxDiscount + 0.01) {
        throw new BadRequestError(
          'Desconto (' +
            newDiscount.toFixed(2) +
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
