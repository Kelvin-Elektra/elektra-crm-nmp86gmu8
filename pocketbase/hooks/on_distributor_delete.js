onRecordAfterDeleteSuccess((e) => {
  const distributorId = e.record.id

  const modules = $app.findRecordsByFilter('pv_modules', 'distributor_id = {:id}', '', 0, 0, {
    id: distributorId,
  })
  for (const m of modules) {
    try {
      $app.delete(m)
    } catch (_) {}
  }

  const inverters = $app.findRecordsByFilter('pv_inverters', 'distributor_id = {:id}', '', 0, 0, {
    id: distributorId,
  })
  for (const i of inverters) {
    try {
      $app.delete(i)
    } catch (_) {}
  }

  const supplies = $app.findRecordsByFilter('pv_supplies', 'distributor_id = {:id}', '', 0, 0, {
    id: distributorId,
  })
  for (const s of supplies) {
    try {
      $app.delete(s)
    } catch (_) {}
  }

  return e.next()
}, 'pv_distributors')
