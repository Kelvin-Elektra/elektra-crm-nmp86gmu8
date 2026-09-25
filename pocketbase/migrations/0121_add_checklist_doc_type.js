migrate(
  (app) => {
    // 1. Expandir contract_templates.type para permitir ['contract', 'power_of_attorney', 'checklist']
    const templatesCol = app.findCollectionByNameOrId('contract_templates')
    const typeField = templatesCol.fields.getByName('type')
    if (typeField) {
      typeField.values = ['contract', 'power_of_attorney', 'checklist']
      app.save(templatesCol)
    }

    // 2. Expandir signature_requests.source para permitir 'checklist'
    const sigReqCol = app.findCollectionByNameOrId('signature_requests')
    const sourceField = sigReqCol.fields.getByName('source')
    if (sourceField) {
      sourceField.values = ['proposal', 'upload', 'contract', 'power_of_attorney', 'checklist']
      app.save(sigReqCol)
    }

    // 3. Conteúdo padrão do Checklist Técnico
    const defaultChecklistContent = `# CHECKLIST TÉCNICO DE VISTORIA E INSTALAÇÃO SOLAR FOTOVOLTAICA

**DOCUMENTO DE ENGENHARIA E VISTORIA EM CAMPO**
Empresa Responsável: **{{empresa_nome}}** | CNPJ: {{empresa_cnpj}} | Contato: {{empresa_telefone}} - {{empresa_email}}
Responsável Técnico / Consultor: **{{consultor_nome}}** | Data de Emissão: **{{data_proposta}}** | Proposta Ref.: **{{codigo_proposta}}**

---

### 1. DADOS DO CLIENTE E CONTRATANTE
- **Nome / Razão Social:** {{cliente_nome}}
- **CPF / CNPJ:** {{cliente_documento}}
- **Telefone / WhatsApp:** {{cliente_telefone}}
- **E-mail:** {{cliente_email}}
- **Endereço do Cliente:** {{cliente_endereco}}, nº {{cliente_numero}}, Bairro {{cliente_bairro}}, CEP {{cliente_cep}}
- **Cidade / UF:** {{cliente_cidade}} / {{cliente_uf}}

---

### 2. UNIDADE GERADORA E BENEFICIÁRIA (LOCAL DE INSTALAÇÃO)
- **Unidade Consumidora (UC):** {{unidade_consumidora}}
- **Concessionária Distribuidora:** {{concessionaria}}
- **Endereço da Instalação:** {{endereco_instalacao}}, nº {{cliente_numero}}, CEP {{cliente_cep}}
- **Cidade / Estado da Instalação:** {{cidade_instalacao}} / {{uf_instalacao}}
- **Tipo de Conexão / Rede:** {{tipo_rede}}
- **Tensão de Atendimento:** {{tensao_rede}}
- **Categoria de Consumo:** {{categoria_consumo}}

---

### 3. RESUMO CONSOLIDADO DO KIT E EQUIPAMENTOS
- **Potência Total do Sistema:** {{potencia_kit}} kWp
- **Consumo Médio Mensal:** {{consumo_medio}} kWh/mês
- **Geração Mensal Estimada:** {{geracao_estimada}} kWh/mês
- **Cobertura Estimada de Consumo:** {{cobertura_consumo}}%
- **Quantidade de Módulos Fotovoltaicos:** {{qtd_modulos}} painéis
- **Modelo / Fabricante dos Módulos:** {{modelo_painel}}
- **Modelo / Fabricante do Inversor:** {{modelo_inversor}}
- **Área Total Ocupada Estimada:** {{area_ocupada}} m²

---

### 4. ESTRUTURA DO TELHADO E CONDIÇÕES FÍSICAS DO LOCAL
- **Tipo de Estrutura / Cobertura:** {{tipo_telhado}}
- **Orientação e Inclinação:** Orientação predominante compatível com dimensionamento.

**Verificações de Campo e Vistoria Prévia (Marcar durante inspeção técnica):**
- [ ] Telhas e Cobertura: Estrutura em boas condições, sem trincas ou necessidade de reforço
- [ ] Quadro Geral de Distribuição (QGD): Espaço disponível para instalação dos disjuntores de proteção (DPS/Disjuntor CA)
- [ ] Malha de Aterramento: Sistema de aterramento existente atende às normas técnicas (NBR 5410)
- [ ] Trajeto dos Eletrodutos / Cabeamento CC e CA: Rota desobstruída e viável até o inversor e quadro
- [ ] Padrão de Entrada: Padrão homologado conforme exigências normativas da concessionária {{concessionaria}}
- [ ] Acesso ao Telhado: Acesso seguro disponível para a equipe de instalação

---

### 5. OBSERVAÇÕES E APONTAMENTOS DE CAMPO
{{observacoes}}

**Anotações adicionais da vistoria técnica:**
__________________________________________________________________________________________
__________________________________________________________________________________________
__________________________________________________________________________________________

---

### 6. VALIDAÇÃO TÉCNICA E DECLARAÇÃO
Declaro que as informações técnicas acima descritas foram verificadas e conferidas em conformidade com o projeto e condições reais do local de instalação.

**Técnico / Consultor Responsável:** {{consultor_nome}}
**Cliente / Titular da UC:** {{cliente_nome}}

Local e Data da Vistoria: {{cidade_instalacao}} - {{uf_instalacao}}, {{data_proposta}}.`

    const defaultChecklistPlaceholders = [
      'empresa_nome',
      'empresa_cnpj',
      'empresa_telefone',
      'empresa_email',
      'consultor_nome',
      'data_proposta',
      'codigo_proposta',
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
      'unidade_consumidora',
      'concessionaria',
      'endereco_instalacao',
      'cidade_instalacao',
      'uf_instalacao',
      'tipo_rede',
      'tensao_rede',
      'categoria_consumo',
      'potencia_kit',
      'consumo_medio',
      'geracao_estimada',
      'cobertura_consumo',
      'qtd_modulos',
      'modelo_painel',
      'modelo_inversor',
      'area_ocupada',
      'tipo_telhado',
      'observacoes',
    ]

    // 4. Seed do modelo padrão de Checklist para cada empresa existente (idempotente)
    try {
      const companies = app.findRecordsByFilter('companies', '', '', 500, 0)
      for (let i = 0; i < companies.length; i++) {
        const comp = companies[i]
        let existing = []
        try {
          existing = app.findRecordsByFilter(
            'contract_templates',
            "company_id = '" + comp.id + "' && type = 'checklist'",
            '',
            1,
            0,
          )
        } catch (_) {}

        if (existing.length === 0) {
          const rec = new Record(templatesCol)
          rec.set('company_id', comp.id)
          rec.set('type', 'checklist')
          rec.set('name', 'Checklist Técnico — Sistema FV')
          rec.set(
            'description',
            'Checklist de vistoria técnica com dados do cliente, unidade geradora, kit consolidado, estrutura do telhado e observações.',
          )
          rec.set('content', defaultChecklistContent)
          rec.set('placeholders', defaultChecklistPlaceholders)
          rec.set('active', true)
          app.save(rec)
        }
      }
    } catch (seedErr) {
      console.log('Aviso no seed de checklist técnico:', seedErr)
    }
  },
  (app) => {
    try {
      const sigReqCol = app.findCollectionByNameOrId('signature_requests')
      const sourceField = sigReqCol.fields.getByName('source')
      if (sourceField) {
        sourceField.values = ['proposal', 'upload', 'contract', 'power_of_attorney']
        app.save(sigReqCol)
      }
    } catch (_) {}

    try {
      const templatesCol = app.findCollectionByNameOrId('contract_templates')
      const typeField = templatesCol.fields.getByName('type')
      if (typeField) {
        typeField.values = ['contract', 'power_of_attorney']
        app.save(templatesCol)
      }
    } catch (_) {}
  },
)
