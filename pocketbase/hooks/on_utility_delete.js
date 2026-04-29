onRecordAfterDeleteSuccess((e) => {
  const utilityId = e.record.id
  const rules = $app.findRecordsByFilter('pv_tariff_rules', 'utility_id = {:id}', '', 0, 0, {
    id: utilityId,
  })
  for (const rule of rules) {
    try {
      $app.delete(rule)
    } catch (_) {}
  }
  return e.next()
}, 'pv_utilities')
