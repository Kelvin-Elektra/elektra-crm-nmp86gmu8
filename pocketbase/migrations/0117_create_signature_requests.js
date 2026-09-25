migrate(
  (app) => {
    // 1. Adicionar campo signature_policy na coleção companies se ainda não existir
    // Configura quem assina por padrão:
    // 'client_only' (só cliente) | 'client_rep' (representante + cliente) | 'client_rep_owner' (representante + cliente + dono) | 'client_owner' (cliente + dono)
    const companiesCol = app.findCollectionByNameOrId('companies')
    if (!companiesCol.fields.getByName('signature_policy')) {
      companiesCol.fields.add(
        new SelectField({
          name: 'signature_policy',
          values: ['client_only', 'client_rep', 'client_rep_owner', 'client_owner'],
          maxSelect: 1,
        }),
      )
    }
    if (!companiesCol.fields.getByName('signature_owner_name')) {
      companiesCol.fields.add(new TextField({ name: 'signature_owner_name' }))
    }
    if (!companiesCol.fields.getByName('signature_owner_email')) {
      companiesCol.fields.add(new TextField({ name: 'signature_owner_email' }))
    }
    app.save(companiesCol)

    // 2. Criar coleção signature_requests
    const negotiationsCol = app.findCollectionByNameOrId('negotiations')
    const proposalsCol = app.findCollectionByNameOrId('proposals')

    const sigReqCol = new Collection({
      name: 'signature_requests',
      type: 'base',
      listRule: "@request.auth.id != '' && company_id = @request.auth.company_id",
      viewRule: "@request.auth.id != '' && company_id = @request.auth.company_id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && company_id = @request.auth.company_id",
      deleteRule: "@request.auth.id != '' && company_id = @request.auth.company_id",
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
          collectionId: negotiationsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'proposal_id',
          type: 'relation',
          required: false,
          collectionId: proposalsCol.id,
          maxSelect: 1,
        },
        {
          name: 'source',
          type: 'select',
          required: true,
          values: ['proposal', 'upload'],
          maxSelect: 1,
        },
        {
          name: 'document_name',
          type: 'text',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['enviado', 'aguardando', 'assinado', 'recusado', 'cancelado'],
          maxSelect: 1,
        },
        {
          name: 'signers',
          type: 'json',
          required: true,
        },
        {
          name: 'assinafy_document_id',
          type: 'text',
          required: false,
        },
        {
          name: 'assinafy_signer_ids',
          type: 'json',
          required: false,
        },
        {
          name: 'signed_pdf',
          type: 'file',
          maxSelect: 1,
          maxSize: 31457280, // 30MB
          mimeTypes: ['application/pdf'],
        },
        {
          name: 'sent_at',
          type: 'date',
          required: false,
        },
        {
          name: 'signed_at',
          type: 'date',
          required: false,
        },
        {
          name: 'signing_url',
          type: 'url',
          required: false,
        },
        {
          name: 'error_message',
          type: 'text',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_sig_req_neg ON signature_requests (negotiation_id)',
        'CREATE INDEX idx_sig_req_company ON signature_requests (company_id)',
        'CREATE INDEX idx_sig_req_assinafy_doc ON signature_requests (assinafy_document_id)',
      ],
    })
    app.save(sigReqCol)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('signature_requests')
      app.delete(col)
    } catch (_) {}

    try {
      const companiesCol = app.findCollectionByNameOrId('companies')
      if (companiesCol.fields.getByName('signature_policy')) {
        companiesCol.fields.removeByName('signature_policy')
      }
      if (companiesCol.fields.getByName('signature_owner_name')) {
        companiesCol.fields.removeByName('signature_owner_name')
      }
      if (companiesCol.fields.getByName('signature_owner_email')) {
        companiesCol.fields.removeByName('signature_owner_email')
      }
      app.save(companiesCol)
    } catch (_) {}
  },
)
