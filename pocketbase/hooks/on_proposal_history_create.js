onRecordCreateRequest((e) => {
  e.next()

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
    console.log('Failed to create proposal history on create:', err.message)
  }
}, 'proposals')
