onRecordUpdateRequest((e) => {
  const newDiscount = e.record.get('discount_amount') || 0
  const oldDiscount = e.record.original().get('discount_amount') || 0
  const authId = e.auth ? e.auth.id : ''

  if (newDiscount !== oldDiscount && newDiscount > 0 && authId) {
    try {
      const user = $app.findRecordById('users', authId)
      const role = user.getString('role') || ''
      if (role === 'User_elektra') {
        e.next()
        return
      }
      const maxDiscount = user.get('max_discount') || 0
      if (newDiscount > maxDiscount) {
        throw new BadRequestError(
          'Desconto (' +
            newDiscount +
            '%) excede o limite maximo permitido (' +
            maxDiscount +
            '%).',
        )
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err
    }
  }

  e.next()
}, 'proposals')
