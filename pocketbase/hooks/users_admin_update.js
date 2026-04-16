routerAdd(
  'PATCH',
  '/backend/v1/users/{id}/admin-update',
  (e) => {
    const id = e.request.pathValue('id')
    const record = $app.findRecordById('users', id)

    const auth = e.auth
    if (!auth) throw new UnauthorizedError('Authentication required')

    // Verify permissions
    if (auth.getString('role') !== 'admin_elektra') {
      if (
        auth.getString('role') !== 'admin_company' ||
        auth.getString('company_id') !== record.getString('company_id')
      ) {
        throw new ForbiddenError('Not allowed to update this user')
      }
    }

    const body = e.requestInfo().body

    if (body.name !== undefined) record.set('name', body.name)
    if (body.role !== undefined) record.set('role', body.role)
    if (body.email !== undefined) {
      record.setEmail(body.email)
      record.setVerified(false)
    }

    if (body.password) {
      if (body.password !== body.passwordConfirm) {
        throw new BadRequestError('Passwords do not match')
      }
      record.setPassword(body.password)
    }

    $app.save(record)

    return e.json(200, record)
  },
  $apis.requireAuth(),
)
