migrate(
  (app) => {
    const companiesCol = app.findCollectionByNameOrId('companies')
    const negCol = app.findCollectionByNameOrId('negotiations')

    // 1. Coleção 'financing_partners' (Bancos e parceiros de financiamento)
    let finPartnersCol
    try {
      finPartnersCol = app.findCollectionByNameOrId('financing_partners')
    } catch (_) {
      finPartnersCol = new Collection({
        name: 'financing_partners',
        type: 'base',
        listRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        viewRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        createRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        updateRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        deleteRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))",
        fields: [
          {
            name: 'company_id',
            type: 'relation',
            required: true,
            collectionId: companiesCol.id,
            maxSelect: 1,
          },
          {
            name: 'name',
            type: 'text',
            required: true,
          },
          {
            name: 'partner_type',
            type: 'text',
            required: false, // ex: Banco, Cooperativa, Fintech, Outro
          },
          {
            name: 'notes',
            type: 'text',
            required: false,
          },
          {
            name: 'active',
            type: 'bool',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_fin_partner_comp ON financing_partners (company_id)',
          'CREATE INDEX idx_fin_partner_active ON financing_partners (active)',
        ],
      })
      app.save(finPartnersCol)
    }

    // 2. Coleção 'financing_credit_lines' (Linhas / produtos de crédito por parceiro)
    let finLinesCol
    try {
      finLinesCol = app.findCollectionByNameOrId('financing_credit_lines')
    } catch (_) {
      finLinesCol = new Collection({
        name: 'financing_credit_lines',
        type: 'base',
        listRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        viewRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        createRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        updateRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        deleteRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))",
        fields: [
          {
            name: 'company_id',
            type: 'relation',
            required: true,
            collectionId: companiesCol.id,
            maxSelect: 1,
          },
          {
            name: 'partner_id',
            type: 'relation',
            required: true,
            collectionId: finPartnersCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'name',
            type: 'text',
            required: true,
          },
          {
            name: 'interest_rate_annual',
            type: 'number',
            required: true, // taxa a.a. %
          },
          {
            name: 'max_installments',
            type: 'number',
            required: true, // prazo máximo em meses
          },
          {
            name: 'min_down_payment_percent',
            type: 'number',
            required: false, // % de entrada mínima
          },
          {
            name: 'notes',
            type: 'text',
            required: false,
          },
          {
            name: 'active',
            type: 'bool',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_fin_line_comp ON financing_credit_lines (company_id)',
          'CREATE INDEX idx_fin_line_partner ON financing_credit_lines (partner_id)',
        ],
      })
      app.save(finLinesCol)
    }

    // 3. Coleção 'financing_simulations' (Vínculo de negociação com banco e linha + status de análise)
    let finSimCol
    try {
      finSimCol = app.findCollectionByNameOrId('financing_simulations')
    } catch (_) {
      finSimCol = new Collection({
        name: 'financing_simulations',
        type: 'base',
        listRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        viewRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        createRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        updateRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        deleteRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))",
        fields: [
          {
            name: 'company_id',
            type: 'relation',
            required: true,
            collectionId: companiesCol.id,
            maxSelect: 1,
          },
          {
            name: 'negotiation_id',
            type: 'relation',
            required: true,
            collectionId: negCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'partner_id',
            type: 'relation',
            required: true,
            collectionId: finPartnersCol.id,
            maxSelect: 1,
          },
          {
            name: 'credit_line_id',
            type: 'relation',
            required: false,
            collectionId: finLinesCol.id,
            maxSelect: 1,
          },
          {
            name: 'total_negotiation_value',
            type: 'number',
            required: false,
          },
          {
            name: 'down_payment',
            type: 'number',
            required: false,
          },
          {
            name: 'financed_amount',
            type: 'number',
            required: true,
          },
          {
            name: 'interest_rate_annual',
            type: 'number',
            required: true,
          },
          {
            name: 'installments',
            type: 'number',
            required: true,
          },
          {
            name: 'monthly_payment',
            type: 'number',
            required: false,
          },
          {
            name: 'total_paid',
            type: 'number',
            required: false,
          },
          {
            name: 'total_interest',
            type: 'number',
            required: false,
          },
          {
            name: 'status',
            type: 'text', // 'Em análise' | 'Aprovado' | 'Recusado'
            required: false,
          },
          {
            name: 'notes',
            type: 'text',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_fin_sim_comp ON financing_simulations (company_id)',
          'CREATE INDEX idx_fin_sim_neg ON financing_simulations (negotiation_id)',
          'CREATE INDEX idx_fin_sim_partner ON financing_simulations (partner_id)',
        ],
      })
      app.save(finSimCol)
    }

    // 4. Coleção 'catalog_items' (Catálogo de produtos e serviços da companhia)
    let catalogCol
    try {
      catalogCol = app.findCollectionByNameOrId('catalog_items')
    } catch (_) {
      catalogCol = new Collection({
        name: 'catalog_items',
        type: 'base',
        listRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        viewRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        createRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        updateRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        deleteRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))",
        fields: [
          {
            name: 'company_id',
            type: 'relation',
            required: true,
            collectionId: companiesCol.id,
            maxSelect: 1,
          },
          {
            name: 'name',
            type: 'text',
            required: true,
          },
          {
            name: 'description',
            type: 'text',
            required: false,
          },
          {
            name: 'item_type',
            type: 'select',
            required: true,
            values: ['produto', 'servico'],
          },
          {
            name: 'price',
            type: 'number',
            required: true,
          },
          {
            name: 'unit',
            type: 'text',
            required: false, // un, m, hora, serviço, etc.
          },
          {
            name: 'active',
            type: 'bool',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_catalog_items_comp ON catalog_items (company_id)',
          'CREATE INDEX idx_catalog_items_active ON catalog_items (active)',
        ],
      })
      app.save(catalogCol)
    }

    // 5. Coleção 'negotiation_quote_items' (Itens do orçamento vinculado à negociação)
    let quoteItemsCol
    try {
      quoteItemsCol = app.findCollectionByNameOrId('negotiation_quote_items')
    } catch (_) {
      quoteItemsCol = new Collection({
        name: 'negotiation_quote_items',
        type: 'base',
        listRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        viewRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        createRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        updateRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        deleteRule:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        fields: [
          {
            name: 'company_id',
            type: 'relation',
            required: true,
            collectionId: companiesCol.id,
            maxSelect: 1,
          },
          {
            name: 'negotiation_id',
            type: 'relation',
            required: true,
            collectionId: negCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'catalog_item_id',
            type: 'relation',
            required: false,
            collectionId: catalogCol.id,
            maxSelect: 1,
          },
          {
            name: 'name',
            type: 'text',
            required: true,
          },
          {
            name: 'description',
            type: 'text',
            required: false,
          },
          {
            name: 'item_type',
            type: 'select',
            required: true,
            values: ['produto', 'servico'],
          },
          {
            name: 'unit',
            type: 'text',
            required: false,
          },
          {
            name: 'unit_price',
            type: 'number',
            required: true,
          },
          {
            name: 'quantity',
            type: 'number',
            required: true,
          },
          {
            name: 'total_price',
            type: 'number',
            required: true,
          },
          {
            name: 'notes',
            type: 'text',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_quote_items_comp ON negotiation_quote_items (company_id)',
          'CREATE INDEX idx_quote_items_neg ON negotiation_quote_items (negotiation_id)',
        ],
      })
      app.save(quoteItemsCol)
    }

    // 6. Campos opcionais em negotiations para dados consolidados do orçamento (observações/condições do orçamento)
    if (!negCol.fields.getByName('quote_notes')) {
      negCol.fields.add(
        new TextField({
          name: 'quote_notes',
          required: false,
        }),
      )
      app.save(negCol)
    }
  },
  (app) => {
    try {
      const q = app.findCollectionByNameOrId('negotiation_quote_items')
      app.delete(q)
    } catch (_) {}
    try {
      const c = app.findCollectionByNameOrId('catalog_items')
      app.delete(c)
    } catch (_) {}
    try {
      const s = app.findCollectionByNameOrId('financing_simulations')
      app.delete(s)
    } catch (_) {}
    try {
      const l = app.findCollectionByNameOrId('financing_credit_lines')
      app.delete(l)
    } catch (_) {}
    try {
      const p = app.findCollectionByNameOrId('financing_partners')
      app.delete(p)
    } catch (_) {}
    try {
      const negCol = app.findCollectionByNameOrId('negotiations')
      if (negCol.fields.getByName('quote_notes')) {
        negCol.fields.removeByName('quote_notes')
        app.save(negCol)
      }
    } catch (_) {}
  },
)
