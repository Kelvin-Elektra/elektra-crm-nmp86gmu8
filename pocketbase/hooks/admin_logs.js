routerAdd(
  'GET',
  '/backend/v1/admin/logs',
  (e) => {
    if (!e.auth || e.auth.getString('role') !== 'User_elektra') {
      return e.forbiddenError('Access denied')
    }

    const limit = Math.min(Number(e.request.url.query().get('limit')) || 50, 200)

    try {
      let result = []
      try {
        result = $app
          .db()
          .newQuery('SELECT * FROM _logs ORDER BY created DESC LIMIT {:limit}')
          .bind({ limit })
          .all()
      } catch (dbErr) {
        if (dbErr.message.includes('no such table')) {
          return e.json(200, { items: [], note: 'Logs unavailable in data.db' })
        }
        throw dbErr
      }

      const parsed = result.map((row) => {
        try {
          if (row.data && typeof row.data === 'string') {
            row.data = JSON.parse(row.data)
          }
        } catch (_) {}
        return row
      })

      return e.json(200, { items: parsed })
    } catch (err) {
      return e.internalServerError('Failed to fetch logs: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
