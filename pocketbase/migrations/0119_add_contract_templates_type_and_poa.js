migrate(
  (app) => {
    const templatesCol = app.findCollectionByNameOrId('contract_templates')

    // 1. Adicionar campo 'type' (contrato | procuracao) para diferenciar contratos de procurações
    if (!templatesCol.fields.getByName('type')) {
      templatesCol.fields.add(
        new SelectField({
          name: 'type',
          values: ['contract', 'power_of_attorney'],
          maxSelect: 1,
          required: false,
        }),
      )
    }

    // 2. Atualizar regras de acesso para garantir que só o admin/owner da companhia possa gerenciar (create, update, delete)
    // listRule e viewRule continuam liberados para qualquer usuário autenticado da mesma empresa poder usar na negociação
    templatesCol.listRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    templatesCol.viewRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    templatesCol.createRule =
      "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin'))"
    templatesCol.updateRule =
      "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin'))"
    templatesCol.deleteRule =
      "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin'))"

    app.save(templatesCol)

    // 3. Atualizar modelos existentes marcando-os como type = 'contract'
    try {
      app
        .db()
        .newQuery("UPDATE contract_templates SET type = 'contract' WHERE type IS NULL OR type = ''")
        .execute()
    } catch (_) {}

    // 4. Expandir signature_requests source para aceitar 'power_of_attorney'
    const sigReqCol = app.findCollectionByNameOrId('signature_requests')
    const sourceField = sigReqCol.fields.getByName('source')
    if (sourceField) {
      sourceField.values = ['proposal', 'upload', 'contract', 'power_of_attorney']
      app.save(sigReqCol)
    }

    // 5. Seed do modelo padrão de Procuração para cada empresa existente
    const defaultPowerOfAttorneyContent = `# INSTRUMENTO PARTICULAR DE PROCURAÇÃO PARA HOMOLOGAÇÃO DE ACESSO

**OUTORGANTE (TITULAR DA UNIDADE CONSUMIDORA):**
**Nome / Razão Social:** {{cliente_nome}}
**CPF / CNPJ:** {{cliente_documento}}
**Telefone:** {{cliente_telefone}} | **E-mail:** {{cliente_email}}
**Endereço:** {{cliente_endereco}}, nº {{cliente_numero}}, Bairro {{cliente_bairro}}, CEP {{cliente_cep}}
**Cidade / UF:** {{cliente_cidade}} - {{cliente_uf}}

**OUTORGADA (INTEGRADORA / PROJETISTA):**
**Nome da Empresa:** {{empresa_nome}}
**CNPJ:** {{empresa_cnpj}}
**Contato:** {{empresa_telefone}} | {{empresa_email}}
**Responsável Técnico / Representante:** {{consultor_nome}}

---

### PODERES E FINALIDADE ESPECÍFICA
Pelo presente instrumento particular de procuração, o(a) **OUTORGANTE** nomeia e constitui sua bastante procuradora a empresa **OUTORGADA**, concedendo-lhe amplos e especiais poderes exclusivos para, perante a concessionária de distribuição de energia elétrica **{{concessionaria}}**, representá-lo(a) em todos os atos necessários à solicitação de acesso, análise técnica, vistoria e homologação do sistema de Microgeração ou Minigeração Distribuída Fotovoltaica com potência instalada de **{{potencia_kit}} kWp**, relativo à Unidade Consumidora (UC) nº **{{unidade_consumidora}}**, instalada no endereço:
{{endereco_instalacao}}, {{cidade_instalacao}} - {{uf_instalacao}}.

### ATOS AUTORIZADOS
Para a estrita e fiel execução do mandato acima especificado, a **OUTORGADA** poderá:
1. Dar entrada e assinar formulários de solicitação de acesso e memoriais descritivos;
2. Apresentar ART/TRT (Anotação ou Termo de Responsabilidade Técnica);
3. Solicitar e acompanhar vistorias técnicas no padrão de entrada de energia;
4. Requerer a troca ou aferição do medidor bidirecional;
5. Cumprir e responder a exigências técnicas emitidas pela distribuidora **{{concessionaria}}**;
6. Praticar, enfim, todos os atos estritamente vinculados à homologação da usina solar fotovoltaica.

### VALIDADE E ASSINATURA ELETRÔNICA
A presente procuração tem validade de 12 (doze) meses a contar desta data, finda a qual cessarão os efeitos do mandato.

As partes reconhecem a plena validade jurídica, autenticidade e integridade deste instrumento assinado por meio eletrônico, em conformidade com a MP nº 2.200-2/2001 e a Lei Federal nº 14.063/2020.

{{cidade_instalacao}}, {{data_proposta}}.`

    try {
      const companies = app.findRecordsByFilter('companies', '', '', 200, 0)
      for (let i = 0; i < companies.length; i++) {
        const comp = companies[i]
        // Checar se já existe procuração padrão para esta empresa
        let existing = []
        try {
          existing = app.findRecordsByFilter(
            'contract_templates',
            "company_id = '" + comp.id + "' && type = 'power_of_attorney'",
            '',
            1,
            0,
          )
        } catch (_) {}

        if (existing.length === 0) {
          const rec = new Record(templatesCol)
          rec.set('company_id', comp.id)
          rec.set('type', 'power_of_attorney')
          rec.set('name', 'Procuração para Homologação junto à Concessionária')
          rec.set(
            'description',
            'Modelo padrão outorgando poderes à integradora para homologação, vistoria e troca de medidor.',
          )
          rec.set('content', defaultPowerOfAttorneyContent)
          rec.set('placeholders', [
            'cliente_nome',
            'cliente_documento',
            'cliente_telefone',
            'cliente_email',
            'cliente_endereco',
            'cliente_numero',
            'cliente_bairro',
            'cliente_cep',
            'cliente_cidade',
            'cliente_uf',
            'empresa_nome',
            'empresa_cnpj',
            'empresa_telefone',
            'empresa_email',
            'consultor_nome',
            'concessionaria',
            'potencia_kit',
            'unidade_consumidora',
            'endereco_instalacao',
            'cidade_instalacao',
            'uf_instalacao',
            'data_proposta',
          ])
          rec.set('active', true)
          app.save(rec)
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const templatesCol = app.findCollectionByNameOrId('contract_templates')
      if (templatesCol.fields.getByName('type')) {
        templatesCol.fields.removeByName('type')
      }
      app.save(templatesCol)
    } catch (_) {}
  },
)
