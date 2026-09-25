migrate(
  (app) => {
    // 1. Criar coleção contract_templates
    const companiesCol = app.findCollectionByNameOrId('companies')

    const contractTemplatesCol = new Collection({
      name: 'contract_templates',
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
          name: 'content',
          type: 'text',
          required: true,
        },
        {
          name: 'placeholders',
          type: 'json',
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
        'CREATE INDEX idx_contract_tpl_company ON contract_templates (company_id)',
        'CREATE INDEX idx_contract_tpl_active ON contract_templates (active)',
      ],
    })
    app.save(contractTemplatesCol)

    // 2. Expandir signature_requests com campos opcionais para contratos
    const sigReqCol = app.findCollectionByNameOrId('signature_requests')
    if (!sigReqCol.fields.getByName('contract_template_id')) {
      sigReqCol.fields.add(
        new RelationField({
          name: 'contract_template_id',
          collectionId: contractTemplatesCol.id,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    // 3. Atualizar values do campo source em signature_requests para permitir 'contract'
    const sourceField = sigReqCol.fields.getByName('source')
    if (sourceField) {
      sourceField.values = ['proposal', 'upload', 'contract']
    }

    app.save(sigReqCol)

    // 4. Seed de um modelo de contrato padrão inicial para as empresas existentes
    try {
      const defaultTemplateContent = `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS E FORNECIMENTO DE SISTEMA FOTOVOLTAICO

Pelo presente instrumento particular, de um lado:

**CONTRATADA:** {{empresa_nome}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{empresa_cnpj}}, com sede e contato pelo telefone {{empresa_telefone}} e e-mail {{empresa_email}};

**CONTRATANTE:** {{cliente_nome}}, inscrito no CPF/CNPJ sob o nº {{cliente_documento}}, residente e domiciliado em {{cliente_endereco}}, nº {{cliente_numero}}, Bairro {{cliente_bairro}}, CEP {{cliente_cep}}, na cidade de {{cliente_cidade}}/{{cliente_uf}}, telefone {{cliente_telefone}}, e-mail {{cliente_email}};

As partes acima qualificadas têm, entre si, justo e acordado o presente Contrato de Prestação de Serviços de Engenharia e Instalação de Sistema de Geração Solar Fotovoltaica, que se regerá pelas seguintes cláusulas e condições:

---

### CLÁUSULA PRIMEIRA - DO OBJETO DO CONTRATO
O presente contrato tem como objeto a prestação de serviços técnicos especializados de projeto, homologação junto à concessionária **{{concessionaria}}**, fornecimento e instalação de um sistema solar fotovoltaico de **{{potencia_kit}} kWp**, dimensionado para suprir uma média de consumo mensal estimada em **{{consumo_medio}} kWh/mês**, com estimativa de geração média mensal de **{{geracao_estimada}} kWh/mês**.

O local da instalação do gerador fotovoltaico será:
Endereço: {{endereco_instalacao}}, Cidade: {{cidade_instalacao}}/{{uf_instalacao}}.
Tipo de Estrutura / Telhado: {{tipo_telhado}}.

---

### CLÁUSULA SEGUNDA - DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO
Pela prestação dos serviços e fornecimento do sistema descrito na Cláusula Primeira, o(a) CONTRATANTE pagará à CONTRATADA o valor total de **{{valor_total}}** (investimento total).

**Condições Comerciais Acordadas:**
- Forma de Pagamento: {{forma_pagamento}}
- Condições de Pagamento: {{condicoes_pagamento}}
- Prazo de Execução e Instalação: {{prazo_instalacao}} dias a contar da aprovação e entrega dos equipamentos.
- Validade da Proposta Referência: {{validade_dias}} dias (Código da Proposta: {{codigo_proposta}}).

---

### CLÁUSULA TERCEIRA - DA GARANTIA E HOMOLOGAÇÃO
A CONTRATADA compromete-se a protocolar todo o processo de homologação técnica junto à concessionária de distribuição de energia **{{concessionaria}}** até a vistoria e troca do medidor bidirecional.
Os equipamentos gozam das garantias expressas pelos fabricantes contra defeitos de fabricação, e os serviços de montagem e fixação possuem garantia contratual padrão.

---

### CLÁUSULA QUARTA - DO FORO E ASSINATURA DIGITAL
Para dirimir quaisquer dúvidas decorrentes do presente contrato, as partes elegem o foro da Comarca do domicílio do CONTRATANTE, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

Por estarem justos e contratados, assinam eletronicamente o presente instrumento por meio de plataforma de assinatura digital idônea, nos termos da Lei nº 14.063/2020 e da MP 2.200-2/2001, conferindo plena validade jurídica e executiva ao documento.

{{cidade_instalacao}}, {{data_proposta}}.`

      const companies = app.findRecordsByFilter('companies', '', '', 100, 0)
      for (let i = 0; i < companies.length; i++) {
        const comp = companies[i]
        const rec = new Record(contractTemplatesCol)
        rec.set('company_id', comp.id)
        rec.set('name', 'Contrato Padrão de Instalação Solar FV')
        rec.set(
          'description',
          'Modelo contratual padrão com qualificação completa, objeto, preço, prazos e assinatura digital.',
        )
        rec.set('content', defaultTemplateContent)
        rec.set('placeholders', [
          'empresa_nome',
          'empresa_cnpj',
          'empresa_telefone',
          'empresa_email',
          'cliente_nome',
          'cliente_documento',
          'cliente_endereco',
          'cliente_numero',
          'cliente_bairro',
          'cliente_cep',
          'cliente_cidade',
          'cliente_uf',
          'cliente_telefone',
          'cliente_email',
          'concessionaria',
          'potencia_kit',
          'consumo_medio',
          'geracao_estimada',
          'endereco_instalacao',
          'cidade_instalacao',
          'uf_instalacao',
          'tipo_telhado',
          'valor_total',
          'forma_pagamento',
          'condicoes_pagamento',
          'prazo_instalacao',
          'validade_dias',
          'codigo_proposta',
          'data_proposta',
        ])
        rec.set('active', true)
        app.save(rec)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const sigReqCol = app.findCollectionByNameOrId('signature_requests')
      if (sigReqCol.fields.getByName('contract_template_id')) {
        sigReqCol.fields.removeByName('contract_template_id')
      }
      const sourceField = sigReqCol.fields.getByName('source')
      if (sourceField) {
        sourceField.values = ['proposal', 'upload']
      }
      app.save(sigReqCol)
    } catch (_) {}

    try {
      const col = app.findCollectionByNameOrId('contract_templates')
      app.delete(col)
    } catch (_) {}
  },
)
