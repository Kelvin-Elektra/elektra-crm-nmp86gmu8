onRecordCreateRequest((e) => {
  const discount = e.record.get('discount_amount') || 0
  const authId = e.auth ? e.auth.id : ''

  if (discount > 0 && authId) {
    try {
      const user = $app.findRecordById('users', authId)
      const role = user.getString('role') || ''
      if (role === 'User_elektra') {
        e.next()
        return
      }
      const maxDiscount = user.get('max_discount') || 0
      if (discount > maxDiscount) {
        throw new BadRequestError(
          'Desconto (' + discount + '%) excede o limite maximo permitido (' + maxDiscount + '%).',
        )
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err
    }
  }

  e.next()
}, 'proposals')
