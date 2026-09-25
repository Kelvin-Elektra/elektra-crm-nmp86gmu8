import { describe, it, expect } from 'vitest'
import { generateContractPDF, pdfBlobToBase64 } from '../contract-pdf'

describe('contract-pdf generator', () => {
  it('gera um Blob de PDF válido com tamanho maior que zero e tipo application/pdf', () => {
    const pdfBlob = generateContractPDF({
      title: 'Contrato de Teste',
      content:
        '# Cláusula 1\nTexto do contrato com dados do cliente.\n\n# Cláusula 2\nPreço e condições.',
      companyName: 'Elektra Engenharia',
      clientName: 'Cliente Teste',
      documentDate: '23/02/2025',
    })

    expect(pdfBlob).toBeInstanceOf(Blob)
    expect(pdfBlob.type).toBe('application/pdf')
    expect(pdfBlob.size).toBeGreaterThan(500)
  })

  it('converte blob para base64 limpa pronta para a Assinafy', async () => {
    const pdfBlob = generateContractPDF({
      title: 'Contrato Curto',
      content: 'Contrato simples para teste.',
    })

    const b64 = await pdfBlobToBase64(pdfBlob)
    expect(typeof b64).toBe('string')
    expect(b64.length).toBeGreaterThan(100)
    // Base64 válida não contém espaços ou quebras
    expect(b64).not.toMatch(/\s/)
  })
})
