onRecordAfterDeleteSuccess((e) => {
  const utilityId = e.record.id
  const rules = $app.findRecordsByFilter('pv_tariff_rules', `utility_id = {:id}`, '', 0, 0, {
    id: utilityId,
  })
  for (const rule of rules) {
    $app.delete(rule)
  }
  e.next()
}, 'pv_utilities')
