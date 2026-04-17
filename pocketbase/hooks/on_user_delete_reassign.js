onRecordDelete((e) => {
  const companyId = e.record.getString('company_id')
  if (!companyId) return e.next()

  try {
    const admin = $app.findFirstRecordByFilter(
      'users',
      "company_id = {:companyId} && role = 'admin_company'",
      { companyId: companyId },
    )
    if (admin) {
      $app
        .db()
        .newQuery('UPDATE negotiations SET owner_id = {:adminId} WHERE owner_id = {:userId}')
        .bind({ adminId: admin.id, userId: e.record.id })
        .execute()

      if ($app.hasTable('leads')) {
        $app
          .db()
          .newQuery('UPDATE leads SET owner_id = {:adminId} WHERE owner_id = {:userId}')
          .bind({ adminId: admin.id, userId: e.record.id })
          .execute()
      }
    }
  } catch (err) {
    console.log('Could not reassign records for user ' + e.record.id, err)
  }

  return e.next()
}, 'users')
