routerAdd(
  'POST',
  '/backend/v1/documents/extract-text',
  (e) => {
    try {
      if (!e.auth) {
        return e.json(401, { message: 'Não autorizado.' })
      }

      // Lê arquivo enviado via multipart/form-data
      const files = e.findUploadedFiles('file')
      if (!files || files.length === 0) {
        return e.json(400, { message: 'Nenhum arquivo enviado.' })
      }

      const file = files[0]
      const originalName = (file.name || '').toLowerCase()

      if (originalName.endsWith('.doc') && !originalName.endsWith('.docx')) {
        return e.json(400, {
          format: 'doc_legacy',
          message:
            'Arquivos no formato antigo .doc não suportam extração direta de texto. Por favor, salve o arquivo como .docx no Word/Google Docs ou copie e cole o texto diretamente no editor.',
        })
      }

      if (!originalName.endsWith('.docx')) {
        return e.json(400, {
          message: 'Formato não suportado. Por favor envie um documento Word (.docx).',
        })
      }

      try {
        // Uso da API nativa do Skip Cloud para extração fiel de documento para Markdown
        const docResult = $documents.toMarkdown(file)
        const markdown = docResult && docResult.markdown ? docResult.markdown : ''
        return e.json(200, {
          markdown: markdown,
          name: file.name,
        })
      } catch (docErr) {
        return e.json(500, {
          message: 'Falha ao processar o documento .docx: ' + String(docErr),
        })
      }
    } catch (err) {
      return e.json(500, { message: 'Erro interno ao extrair documento: ' + String(err) })
    }
  },
  $apis.activityLogger($app),
)
