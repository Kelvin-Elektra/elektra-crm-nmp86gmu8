onRecordAfterDeleteSuccess((e) => {
  const distributorId = e.record.id

  const modules = $app.findRecordsByFilter('pv_modules', `distributor_id = {:id}`, '', 0, 0, {
    id: distributorId,
  })
  for (const m of modules) {
    $app.delete(m)
  }

  const inverters = $app.findRecordsByFilter('pv_inverters', `distributor_id = {:id}`, '', 0, 0, {
    id: distributorId,
  })
  for (const i of inverters) {
    $app.delete(i)
  }

  const supplies = $app.findRecordsByFilter('pv_supplies', `distributor_id = {:id}`, '', 0, 0, {
    id: distributorId,
  })
  for (const s of supplies) {
    $app.delete(s)
  }

  e.next()
}, 'pv_distributors')
