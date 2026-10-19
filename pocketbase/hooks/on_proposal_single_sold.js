// Hook: Garantir apenas UMA proposta vendida por negociação no PocketBase
// Ao marcar uma proposta como status = 'accepted', desmarcar todas as outras da mesma negociação.

onRecordUpdateRequest((e) => {
  const newStatus = (e.record.getString('status') || '').toLowerCase()
  const oldStatus = (e.record.original().getString('status') || '').toLowerCase()

  const isSoldStatus = (st) => {
    return (
      st === 'accepted' ||
      st === 'aprovada' ||
      st === 'ganho' ||
      st === 'vendida' ||
      st === 'vendido'
    )
  }

  if (isSoldStatus(newStatus) && !isSoldStatus(oldStatus)) {
    const negId = e.record.getString('negotiation_id')
    const currentId = e.record.id

    if (negId) {
      try {
        const others = $app.findRecordsByFilter(
          'proposals',
          "negotiation_id = {:negId} && id != {:curId} && (status = 'accepted' || status = 'aprovada' || status = 'ganho' || status = 'vendida' || status = 'vendido')",
          '-created',
          100,
          0,
          { negId: negId, curId: currentId },
        )

        for (let i = 0; i < others.length; i++) {
          const rec = others[i]
          rec.set('status', 'Gerada')
          rec.set('closing_date', '')
          $app.save(rec)
        }
      } catch (err) {
        $app
          .logger()
          .error('Falha ao desmarcar propostas vendidas concorrentes', 'error', String(err))
      }
    }
  }

  e.next()
}, 'proposals')
