onRecordUpdateRequest((e) => {
  var oldSnapshot = e.record.original().get('snapshot_data')
  var newSnapshot = e.record.get('snapshot_data')
  var oldJson = JSON.stringify(oldSnapshot || {})
  var newJson = JSON.stringify(newSnapshot || {})
  var oldPrice = e.record.original().get('total_value')
  var newPrice = e.record.get('total_value')
  var oldDiscount = e.record.original().get('discount_amount')
  var newDiscount = e.record.get('discount_amount')
  var oldStatus = e.record.original().get('status')
  var newStatus = e.record.get('status')
  var oldPayment = e.record.original().get('payment_terms')
  var newPayment = e.record.get('payment_terms')

  var significant =
    oldJson !== newJson ||
    oldPrice !== newPrice ||
    oldDiscount !== newDiscount ||
    oldStatus !== newStatus ||
    oldPayment !== newPayment

  e.next()

  if (!significant) return

  var authId = e.auth ? e.auth.id : ''
  if (!authId) return

  try {
    var proposal = $app.findRecordById('proposals', e.record.id)
    var historyCol = $app.findCollectionByNameOrId('proposal_history')
    var record = new Record(historyCol)
    record.set('proposal_id', proposal.id)
    record.set('snapshot_data', proposal.get('snapshot_data') || {})
    record.set('changed_by', authId)
    $app.save(record)
  } catch (err) {
    console.log('Failed to create proposal history on update:', err.message)
  }
}, 'proposals')
