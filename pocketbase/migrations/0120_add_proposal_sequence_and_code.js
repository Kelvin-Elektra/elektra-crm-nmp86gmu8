migrate(
  (app) => {
    // 1. Adicionar campo proposal_seq (number) e proposal_code (text) na coleção proposals
    const proposalsCol = app.findCollectionByNameOrId('proposals')

    if (!proposalsCol.fields.getByName('proposal_seq')) {
      proposalsCol.fields.add(
        new NumberField({
          name: 'proposal_seq',
          onlyInt: true,
          min: 1,
          required: false,
        }),
      )
    }

    if (!proposalsCol.fields.getByName('proposal_code')) {
      proposalsCol.fields.add(
        new TextField({
          name: 'proposal_code',
          required: false,
        }),
      )
    }

    app.save(proposalsCol)

    // 2. Adicionar proposal_counter nas companies para garantir sequência contínua por empresa
    const companiesCol = app.findCollectionByNameOrId('companies')
    if (!companiesCol.fields.getByName('proposal_counter')) {
      companiesCol.fields.add(
        new NumberField({
          name: 'proposal_counter',
          onlyInt: true,
          min: 0,
          required: false,
        }),
      )
      app.save(companiesCol)
    }

    // 3. Backfill das propostas existentes por empresa ordenadas por created asc
    try {
      const companies = app.findRecordsByFilter('companies', '', '', 500, 0)
      for (let i = 0; i < companies.length; i++) {
        const comp = companies[i]
        const compProposals = app.findRecordsByFilter(
          'proposals',
          "company_id = '" + comp.id + "'",
          'created',
          2000,
          0,
        )

        let currentSeq = 0
        for (let j = 0; j < compProposals.length; j++) {
          const prop = compProposals[j]
          currentSeq = j + 1
          const formattedCode = '#' + String(currentSeq).padStart(4, '0')

          prop.set('proposal_seq', currentSeq)
          prop.set('proposal_code', formattedCode)
          app.save(prop)
        }

        comp.set('proposal_counter', currentSeq)
        app.save(comp)
      }
    } catch (err) {
      console.log('Erro no backfill de proposal_seq:', err)
    }
  },
  (app) => {
    try {
      const proposalsCol = app.findCollectionByNameOrId('proposals')
      if (proposalsCol.fields.getByName('proposal_seq')) {
        proposalsCol.fields.removeByName('proposal_seq')
      }
      if (proposalsCol.fields.getByName('proposal_code')) {
        proposalsCol.fields.removeByName('proposal_code')
      }
      app.save(proposalsCol)
    } catch (_) {}

    try {
      const companiesCol = app.findCollectionByNameOrId('companies')
      if (companiesCol.fields.getByName('proposal_counter')) {
        companiesCol.fields.removeByName('proposal_counter')
        app.save(companiesCol)
      }
    } catch (_) {}
  },
)
