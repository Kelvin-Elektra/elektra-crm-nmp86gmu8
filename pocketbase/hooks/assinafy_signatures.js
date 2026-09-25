// Router: Assinafy signature management and webhook handling
// Routes:
// 1. POST /backend/v1/signatures/send — sends proposal or uploaded PDF to Assinafy and registers signature_request
// 2. GET  /backend/v1/signatures/sync/:id — checks live document state on Assinafy and updates record
// 3. POST /backend/v1/signatures/webhook — Assinafy webhook receiver (public, validates and updates signature_requests)

routerAdd(
  'POST',
  '/backend/v1/signatures/send',
  (e) => {
    try {
      const user = e.auth
      if (!user) {
        return e.json(401, { message: 'Não autorizado.' })
      }

      const userCompanyId = user.getString('company_id')
      if (!userCompanyId) {
        return e.json(403, { message: 'Usuário não está vinculado a uma empresa.' })
      }

      // 1. Obter segredos da Assinafy
      let apiKey = ''
      let accountId = ''
      let baseUrl = 'https://sandbox.assinafy.com.br/v1'

      try {
        apiKey = $secrets.get('ASSINAFY_API_KEY') || ''
      } catch (_) {}
      if (!apiKey) {
        try {
          apiKey = $os.getenv('ASSINAFY_API_KEY') || ''
        } catch (_) {}
      }

      try {
        accountId = $secrets.get('ASSINAFY_ACCOUNT_ID') || ''
      } catch (_) {}
      if (!accountId) {
        try {
          accountId = $os.getenv('ASSINAFY_ACCOUNT_ID') || ''
        } catch (_) {}
      }

      let envBaseUrl = ''
      try {
        envBaseUrl = $secrets.get('ASSINAFY_BASE_URL') || ''
      } catch (_) {}
      if (!envBaseUrl) {
        try {
          envBaseUrl = $os.getenv('ASSINAFY_BASE_URL') || ''
        } catch (_) {}
      }
      if (envBaseUrl) {
        baseUrl = envBaseUrl.trim()
      }
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1)
      }

      // Se não configurado, responder erro amigável
      if (!apiKey || !accountId) {
        return e.json(400, {
          message:
            'A integração com a plataforma de assinatura (Assinafy) ainda não está configurada pelo administrador do sistema. Contate o suporte.',
        })
      }

      // 2. Parse request info (JSON ou multipart)
      let body = {}
      try {
        const reqInfo = e.requestInfo ? e.requestInfo() : null
        body = (reqInfo && reqInfo.body) || {}
      } catch (_) {
        body = {}
      }

      const negotiationId = body.negotiation_id
      const proposalId = body.proposal_id || null
      const contractTemplateId = body.contract_template_id || null
      const source = body.source || 'proposal' // 'proposal' | 'upload' | 'contract'
      const documentName = (body.document_name || 'Documento.pdf').trim()
      const signers = Array.isArray(body.signers) ? body.signers : []
      const pdfBase64 = body.pdf_base64 || ''
      const pdfUrl = body.pdf_url || ''

      if (!negotiationId) {
        return e.json(400, { message: 'negotiation_id é obrigatório.' })
      }

      // Validar acesso à negociação e empresa
      let negRec = null
      try {
        negRec = $app.findFirstRecordByFilter(
          'negotiations',
          "id = '" + negotiationId + "' && company_id = '" + userCompanyId + "'",
        )
      } catch (_) {}

      if (!negRec) {
        return e.json(404, { message: 'Negociação não encontrada ou permissão negada.' })
      }

      if (signers.length === 0) {
        return e.json(400, { message: 'Informe ao menos um signatário para a assinatura.' })
      }

      for (let i = 0; i < signers.length; i++) {
        const s = signers[i]
        if (!s.name || !s.email) {
          return e.json(400, {
            message: 'Todos os signatários devem conter nome completo e e-mail válido.',
          })
        }
      }

      // 3. Obter bytes do PDF
      let pdfBytes = null

      if (pdfBase64) {
        try {
          // Limpar cabeçalho data:application/pdf;base64, se houver
          let rawB64 = pdfBase64
          const commaIdx = rawB64.indexOf(',')
          if (commaIdx !== -1) {
            rawB64 = rawB64.substring(commaIdx + 1)
          }
          pdfBytes = $security.base64Decode(rawB64)
        } catch (decErr) {
          $app.logger().warn('Erro ao decodificar pdf_base64', 'error', String(decErr))
        }
      }

      // Se não veio via base64, tentar baixar da URL do PDF (ex: view_url da proposta ou URL direta)
      if (!pdfBytes && pdfUrl) {
        try {
          const downloadRes = $http.send({
            url: pdfUrl,
            method: 'GET',
            timeout: 30,
          })
          if (downloadRes.statusCode === 200 && downloadRes.body) {
            pdfBytes = downloadRes.raw || downloadRes.body
          }
        } catch (fetchErr) {
          $app.logger().warn('Erro ao baixar PDF via pdf_url', 'error', String(fetchErr))
        }
      }

      // Se ainda não temos bytes e a proposta foi indicada, tentar extrair a view_url da proposta
      if (!pdfBytes && proposalId) {
        try {
          const propRec = $app.findFirstRecordByFilter(
            'proposals',
            "id = '" + proposalId + "' && company_id = '" + userCompanyId + "'",
          )
          if (propRec) {
            const vUrl = propRec.getString('view_url')
            if (vUrl) {
              const downloadRes = $http.send({
                url: vUrl,
                method: 'GET',
                timeout: 30,
              })
              if (downloadRes.statusCode === 200 && downloadRes.body) {
                pdfBytes = downloadRes.raw || downloadRes.body
              }
            }
          }
        } catch (propErr) {
          $app.logger().warn('Erro ao buscar proposta para obter PDF', 'error', String(propErr))
        }
      }

      if (!pdfBytes) {
        return e.json(400, {
          message:
            'Não foi possível obter o arquivo PDF para envio. Forneça o arquivo diretamente na tela.',
        })
      }

      // 4. Enviar documento à Assinafy: POST /v1/accounts/{accountId}/documents (multipart/form-data)
      const uploadUrl = baseUrl + '/accounts/' + accountId + '/documents'
      let uploadRes = null
      try {
        const boundary = '----AssinafyBoundary' + $security.randomString(16)
        let safeDocName = documentName.replace(/["\r\n]/g, '_')
        if (!safeDocName.toLowerCase().endsWith('.pdf')) {
          safeDocName += '.pdf'
        }

        // Criar multipart payload
        // Em Go/PocketBase $http.send aceita headers e body como string/bytes ou FormData
        // Construímos a mensagem multipart manualmente para compatibilidade garantida
        const partHeader =
          '--' +
          boundary +
          '\r\n' +
          'Content-Disposition: form-data; name="file"; filename="' +
          safeDocName +
          '"\r\n' +
          'Content-Type: application/pdf\r\n\r\n'
        const partFooter = '\r\n--' + boundary + '--\r\n'

        // PocketBase permite envio de multipart com $http.send
        uploadRes = $http.send({
          url: uploadUrl,
          method: 'POST',
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'multipart/form-data; boundary=' + boundary,
          },
          body: partHeader + pdfBytes + partFooter,
          timeout: 45,
        })
      } catch (upErr) {
        $app.logger().error('Falha na chamada de upload Assinafy', 'error', String(upErr))
        return e.json(502, {
          message: 'Falha na comunicação com o serviço de assinatura. Tente novamente mais tarde.',
        })
      }

      if (uploadRes.statusCode >= 400) {
        $app.logger().error('Erro retornado pela Assinafy no upload', {
          status: uploadRes.statusCode,
          body: uploadRes.json || uploadRes.body,
        })
        const errJson = uploadRes.json || {}
        return e.json(uploadRes.statusCode, {
          message:
            errJson.message ||
            'A plataforma de assinatura recusou o documento. Verifique se o PDF é válido (máx. 25MB).',
        })
      }

      const uploadData = (uploadRes.json && uploadRes.json.data) || {}
      const assinafyDocId = uploadData.id
      if (!assinafyDocId) {
        return e.json(500, {
          message: 'Resposta inesperada da plataforma de assinatura ao criar documento.',
        })
      }

      // 5. Cadastrar cada signatário na Assinafy: POST /v1/accounts/{accountId}/signers
      const createdSignerIds = []
      const signersAssignmentList = []

      for (let idx = 0; idx < signers.length; idx++) {
        const s = signers[idx]
        const signerPayload = {
          full_name: s.name.trim(),
          email: s.email.trim(),
        }
        if (s.phone) {
          signerPayload.whatsapp_phone_number = s.phone.trim()
        }

        let signerRes = null
        try {
          signerRes = $http.send({
            url: baseUrl + '/accounts/' + accountId + '/signers',
            method: 'POST',
            headers: {
              'X-Api-Key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(signerPayload),
            timeout: 20,
          })
        } catch (sErr) {
          $app.logger().error('Erro ao cadastrar signatário na Assinafy', {
            signer: s,
            error: String(sErr),
          })
        }

        let assinafySignerId = null
        if (signerRes && signerRes.statusCode < 400 && signerRes.json && signerRes.json.data) {
          assinafySignerId = signerRes.json.data.id
        }

        if (assinafySignerId) {
          createdSignerIds.push(assinafySignerId)
          signersAssignmentList.push({
            id: assinafySignerId,
            verification_method: 'Email',
            notification_methods: ['Email'],
            step: 1, // Assinatura simultânea por padrão
          })
          s.assinafy_signer_id = assinafySignerId
        } else {
          $app.logger().warn('Signatário não pode ser criado na Assinafy', {
            signer: s,
            res: signerRes ? signerRes.json || signerRes.body : null,
          })
        }
      }

      if (signersAssignmentList.length === 0) {
        return e.json(400, {
          message:
            'Não foi possível registrar os signatários na plataforma de assinatura. Verifique os e-mails informados.',
        })
      }

      // 6. Criar Assignment virtual: POST /v1/documents/{documentId}/assignments
      const assignmentUrl = baseUrl + '/documents/' + assinafyDocId + '/assignments'
      let assignRes = null
      try {
        assignRes = $http.send({
          url: assignmentUrl,
          method: 'POST',
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: 'virtual',
            signers: signersAssignmentList,
            message:
              'Olá! Por favor, acesse o link para assinar digitalmente o documento da negociação.',
          }),
          timeout: 30,
        })
      } catch (assignErr) {
        $app.logger().error('Falha ao criar assignment na Assinafy', 'error', String(assignErr))
      }

      let signingUrl = uploadData.signing_url || ''
      if (assignRes && assignRes.json && assignRes.json.data) {
        const aData = assignRes.json.data
        if (
          Array.isArray(aData.signing_urls) &&
          aData.signing_urls.length > 0 &&
          aData.signing_urls[0].url
        ) {
          signingUrl = aData.signing_urls[0].url
        }
      }

      // 7. Gravar registro em signature_requests no CRM
      const sigReqCollection = $app.findCollectionByNameOrId('signature_requests')
      const newRecord = new Record(sigReqCollection)
      newRecord.set('company_id', userCompanyId)
      newRecord.set('negotiation_id', negotiationId)
      if (proposalId) {
        newRecord.set('proposal_id', proposalId)
      }
      if (contractTemplateId) {
        newRecord.set('contract_template_id', contractTemplateId)
      }
      newRecord.set('source', source)
      newRecord.set('document_name', documentName)
      newRecord.set('status', 'aguardando')
      newRecord.set('signers', signers)
      newRecord.set('assinafy_document_id', assinafyDocId)
      newRecord.set('assinafy_signer_ids', createdSignerIds)
      newRecord.set('sent_at', new Date().toISOString())
      if (signingUrl) {
        newRecord.set('signing_url', signingUrl)
      }

      $app.save(newRecord)

      $app.logger().info('Solicitação de assinatura criada com sucesso', {
        id: newRecord.id,
        assinafy_doc_id: assinafyDocId,
      })

      return e.json(200, {
        success: true,
        record: newRecord,
        assinafy_document_id: assinafyDocId,
        signing_url: signingUrl,
      })
    } catch (err) {
      $app.logger().error('Exceção ao enviar para assinatura', 'error', String(err))
      return e.json(500, {
        message: 'Erro interno ao processar solicitação de assinatura.',
        detail: String(err),
      })
    }
  },
  $apis.requireAuth(),
)

// Endpoint de sincronização manual/pontual: GET /backend/v1/signatures/sync/{id}
routerAdd(
  'GET',
  '/backend/v1/signatures/sync/{id}',
  (e) => {
    try {
      const user = e.auth
      if (!user) return e.json(401, { message: 'Não autorizado.' })
      const recordId = e.request.pathValue('id')

      const record = $app.findRecordById('signature_requests', recordId)
      if (!record || record.getString('company_id') !== user.getString('company_id')) {
        return e.json(404, { message: 'Registro não encontrado.' })
      }

      const assinafyDocId = record.getString('assinafy_document_id')
      if (!assinafyDocId) {
        return e.json(200, { record: record })
      }

      let apiKey = ''
      try {
        apiKey = $secrets.get('ASSINAFY_API_KEY') || ''
      } catch (_) {}
      if (!apiKey) {
        try {
          apiKey = $os.getenv('ASSINAFY_API_KEY') || ''
        } catch (_) {}
      }

      let baseUrl = 'https://sandbox.assinafy.com.br/v1'
      let envBase = ''
      try {
        envBase = $secrets.get('ASSINAFY_BASE_URL') || ''
      } catch (_) {}
      if (!envBase) {
        try {
          envBase = $os.getenv('ASSINAFY_BASE_URL') || ''
        } catch (_) {}
      }
      if (envBase) baseUrl = envBase.trim().replace(/\/$/, '')

      if (!apiKey) {
        return e.json(400, { message: 'ASSINAFY_API_KEY não configurada.' })
      }

      const docRes = $http.send({
        url: baseUrl + '/documents/' + assinafyDocId,
        method: 'GET',
        headers: { 'X-Api-Key': apiKey },
        timeout: 15,
      })

      if (docRes.statusCode < 400 && docRes.json && docRes.json.data) {
        const docData = docRes.json.data
        const docStatus = docData.status || ''

        let updatedStatus = record.getString('status')
        if (docStatus === 'certificated') {
          updatedStatus = 'assinado'
          record.set('signed_at', new Date().toISOString())
        } else if (docStatus === 'rejected_by_signer' || docStatus === 'rejected_by_user') {
          updatedStatus = 'recusado'
        } else if (docStatus === 'expired') {
          updatedStatus = 'cancelado'
        } else if (docStatus === 'pending_signature') {
          updatedStatus = 'aguardando'
        }

        record.set('status', updatedStatus)
        if (docData.signing_url && !record.getString('signing_url')) {
          record.set('signing_url', docData.signing_url)
        }

        // Se assinado e houver artefato original ou certificado, tentar anexar caso ainda não tenha
        if (updatedStatus === 'assinado' && !record.getString('signed_pdf')) {
          const artifacts = docData.artifacts || {}
          const downloadUrl = artifacts.certificated || artifacts.pades || artifacts.original
          if (downloadUrl) {
            try {
              const fileRes = $http.send({
                url: downloadUrl,
                method: 'GET',
                headers: { 'X-Api-Key': apiKey },
                timeout: 30,
              })
              if (fileRes.statusCode === 200 && fileRes.body) {
                // Salvar arquivo binário
                // Se PocketBase permitir upload de buffer, criar arquivo
                // fallback para downloadUrl na signing_url ou no signing_urls do assignment
              }
            } catch (_) {}
          }
        }

        $app.save(record)
      }

      return e.json(200, { record: record })
    } catch (syncErr) {
      return e.json(500, { message: 'Erro ao sincronizar.', detail: String(syncErr) })
    }
  },
  $apis.requireAuth(),
)

// Endpoint de Webhook da Assinafy: POST /backend/v1/signatures/webhook
routerAdd('POST', '/backend/v1/signatures/webhook', (e) => {
  try {
    let body = {}
    try {
      const reqInfo = e.requestInfo ? e.requestInfo() : null
      body = (reqInfo && reqInfo.body) || {}
    } catch (_) {
      body = {}
    }

    $app.logger().info('Webhook Assinafy recebido', {
      event: body.event,
      account_id: body.account_id,
      object: body.object,
      payload: body.payload,
    })

    const eventName = body.event || ''
    const obj = body.object || {}
    const assinafyDocId = obj.id || (body.payload && body.payload.document_id) || ''

    if (!assinafyDocId) {
      return e.json(200, { received: true, note: 'Sem doc_id associado' })
    }

    let record = null
    try {
      record = $app.findFirstRecordByFilter(
        'signature_requests',
        "assinafy_document_id = '" + assinafyDocId + "'",
      )
    } catch (_) {}

    if (!record) {
      $app
        .logger()
        .warn('Webhook Assinafy: registro não encontrado para doc', 'doc_id', assinafyDocId)
      return e.json(200, { received: true, note: 'Registro não encontrado' })
    }

    // Mapear eventos Assinafy:
    // 'document_ready' | 'signer_signed_document' | 'signer_rejected_document' | 'user_rejected_document' | 'signature_requested' | 'document_processing_failed'
    if (eventName === 'document_ready' || eventName === 'document_prepared') {
      if (record.getString('status') === 'enviado') {
        record.set('status', 'aguardando')
      }
    } else if (eventName === 'signer_signed_document') {
      // Verificar se todos assinaram ou buscar status do documento na API Assinafy
      let apiKey = ''
      try {
        apiKey = $secrets.get('ASSINAFY_API_KEY') || ''
      } catch (_) {}
      if (!apiKey) {
        try {
          apiKey = $os.getenv('ASSINAFY_API_KEY') || ''
        } catch (_) {}
      }

      let baseUrl = 'https://sandbox.assinafy.com.br/v1'
      let envBase = ''
      try {
        envBase = $secrets.get('ASSINAFY_BASE_URL') || ''
      } catch (_) {}
      if (!envBase) {
        try {
          envBase = $os.getenv('ASSINAFY_BASE_URL') || ''
        } catch (_) {}
      }
      if (envBase) baseUrl = envBase.trim().replace(/\/$/, '')

      if (apiKey) {
        try {
          const docRes = $http.send({
            url: baseUrl + '/documents/' + assinafyDocId,
            method: 'GET',
            headers: { 'X-Api-Key': apiKey },
            timeout: 15,
          })
          if (docRes.statusCode < 400 && docRes.json && docRes.json.data) {
            const d = docRes.json.data
            if (d.status === 'certificated') {
              record.set('status', 'assinado')
              record.set('signed_at', new Date().toISOString())
            } else {
              record.set('status', 'aguardando')
            }
          }
        } catch (_) {}
      } else {
        record.set('status', 'assinado')
        record.set('signed_at', new Date().toISOString())
      }
    } else if (eventName === 'signer_rejected_document' || eventName === 'user_rejected_document') {
      record.set('status', 'recusado')
    } else if (eventName === 'document_processing_failed') {
      record.set('status', 'cancelado')
      const errMsg = (body.payload && body.payload.error_message) || 'Falha no processamento'
      record.set('error_message', errMsg)
    }

    $app.save(record)

    return e.json(200, { received: true, status: record.getString('status') })
  } catch (whErr) {
    $app.logger().error('Exceção no webhook Assinafy', 'error', String(whErr))
    return e.json(200, { received: true, error: String(whErr) })
  }
})
