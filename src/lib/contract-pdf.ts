import { simpleMarkdownToHtml } from './contract-resolver'

export interface GenerateContractPdfOptions {
  title: string
  content: string
  companyName?: string
  clientName?: string
  documentDate?: string
}

/**
 * Quebra texto em linhas ajustadas para a largura útil do PDF (Word wrap)
 */
function wrapText(text: string, maxCharsPerLine: number = 88): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const w of words) {
    if (!currentLine) {
      currentLine = w
    } else if (currentLine.length + 1 + w.length <= maxCharsPerLine) {
      currentLine += ' ' + w
    } else {
      lines.push(currentLine)
      currentLine = w
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

/**
 * Sanitiza texto para PDF Helvetica 8-bit padrão
 */
function sanitizePdfString(str: string): string {
  if (str == null) return ''
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos para fonte Helvetica padrão
    .replace(/[^\x20-\x7E\n]/g, '') // mantém caracteres ASCII imprimíveis
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

/**
 * Gera um PDF nativo compatível com PDF 1.7 em formato A4, com paginação automática,
 * cabeçalho, rodapé e estrutura formal jurídica para envio à Assinafy.
 */
export function generateContractPDF(options: GenerateContractPdfOptions): Blob {
  const {
    title,
    content,
    companyName = 'Elektra CRM',
    clientName = '',
    documentDate = '',
  } = options

  // Normalizar quebras de linha e processar blocos
  const cleanContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const paragraphs = cleanContent.split(/\n\n+/)

  // Estrutura de linhas formatadas por página
  interface FormattedLine {
    text: string
    isBold: boolean
    size: number
    spacingAfter: number
    isHeader?: boolean
  }

  const allLines: FormattedLine[] = []

  // Título principal do contrato
  allLines.push({
    text: title.toUpperCase(),
    isBold: true,
    size: 14,
    spacingAfter: 16,
    isHeader: true,
  })

  if (documentDate || clientName) {
    const metaParts: string[] = []
    if (clientName) metaParts.push(`Contratante: ${clientName}`)
    if (documentDate) metaParts.push(`Data: ${documentDate}`)
    allLines.push({
      text: metaParts.join('  |  '),
      isBold: false,
      size: 9,
      spacingAfter: 18,
    })
  }

  // Processar parágrafos
  for (const p of paragraphs) {
    const trimmed = p.trim()
    if (!trimmed) continue

    if (trimmed === '---') {
      allLines.push({
        text: '________________________________________________________________________________',
        isBold: false,
        size: 8,
        spacingAfter: 14,
      })
      continue
    }

    // Seção h1 / h2 / h3 markdown
    if (trimmed.startsWith('#')) {
      const headingText = trimmed.replace(/^#+\s*/, '')
      allLines.push({
        text: headingText.toUpperCase(),
        isBold: true,
        size: 11,
        spacingAfter: 12,
        isHeader: true,
      })
      continue
    }

    // Itens de lista
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems = trimmed.split('\n')
      for (const item of listItems) {
        const itemText = item.replace(/^[-*]\s*/, '').replace(/\*\*/g, '')
        const wrapped = wrapText(`*  ${itemText}`, 80)
        wrapped.forEach((wLine, idx) => {
          allLines.push({
            text: wLine,
            isBold: false,
            size: 9.5,
            spacingAfter: idx === wrapped.length - 1 ? 8 : 4,
          })
        })
      }
      continue
    }

    // Parágrafo regular (remover marcas de negrito para cálculo limpo)
    const cleanParagraph = trimmed.replace(/\*\*/g, '').replace(/\*/g, '')
    const wrappedLines = wrapText(cleanParagraph, 84)

    wrappedLines.forEach((wLine, idx) => {
      allLines.push({
        text: wLine,
        isBold: false,
        size: 9.5,
        spacingAfter: idx === wrappedLines.length - 1 ? 12 : 4,
      })
    })
  }

  // Distribuir linhas em páginas A4 (Altura: 841.89 pt, Margem superior: 50, inferior: 50 -> Área útil ~740 pt)
  const pageHeight = 841.89
  const pageWidth = 595.28
  const marginTop = 55
  const marginBottom = 55
  const marginLeft = 50

  const pagesOfLines: FormattedLine[][] = []
  let currentPage: FormattedLine[] = []
  let currentY = pageHeight - marginTop

  for (const line of allLines) {
    const lineHeight = line.size + line.spacingAfter
    if (currentY - lineHeight < marginBottom) {
      // Nova página
      if (currentPage.length > 0) {
        pagesOfLines.push(currentPage)
      }
      currentPage = [line]
      currentY = pageHeight - marginTop - lineHeight
    } else {
      currentPage.push(line)
      currentY -= lineHeight
    }
  }

  if (currentPage.length > 0) {
    pagesOfLines.push(currentPage)
  }

  if (pagesOfLines.length === 0) {
    pagesOfLines.push([
      {
        text: title,
        isBold: true,
        size: 12,
        spacingAfter: 10,
      },
    ])
  }

  const totalPages = pagesOfLines.length

  // Construir PDF objects
  const objects: string[] = []
  const addObj = (objContent: string) => {
    objects.push(`${objects.length + 1} 0 obj\n${objContent}\nendobj\n`)
  }

  // 1. Catalog
  addObj('<< /Type /Catalog /Pages 2 0 R >>')

  // 2. Pages (placeholder temporário para referências dos filhos)
  // Cada página vai ter seu objeto Page (3, 5, 7, etc.) e Stream de conteúdo (4, 6, 8, etc.)
  // Fontes: Helvetica (F1) e Helvetica-Bold (F2)
  const pageObjIds: number[] = []
  let nextObjId = 3

  for (let p = 0; p < totalPages; p++) {
    pageObjIds.push(nextObjId)
    nextObjId += 2 // 1 para Page, 1 para Content stream
  }

  const fontF1Id = nextObjId++
  const fontF2Id = nextObjId++

  // Atualizar Pages obj
  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ')
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>\nendobj\n`)

  // Construir cada página
  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    const pageNum = pIdx + 1
    const contentObjId = pageObjIds[pIdx] + 1

    // Page object
    addObj(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontF1Id} 0 R /F2 ${fontF2Id} 0 R >> >> /Contents ${contentObjId} 0 R >>`,
    )

    // Stream content da página
    let streamText = 'BT\n'
    let textY = pageHeight - marginTop

    // Cabeçalho discreto
    streamText += `/F1 8 Tf\n1 0 0 1 ${marginLeft} ${pageHeight - 35} Tm\n(${sanitizePdfString(companyName)}) Tj\n`

    // Linhas do contrato nesta página
    const linesInThisPage = pagesOfLines[pIdx]
    for (const line of linesInThisPage) {
      const font = line.isBold ? '/F2' : '/F1'
      const sanitized = sanitizePdfString(line.text)
      streamText += `${font} ${line.size} Tf\n1 0 0 1 ${marginLeft} ${textY} Tm\n(${sanitized}) Tj\n`
      textY -= line.size + line.spacingAfter
    }

    // Rodapé com numeração de página
    const footerText = `Página ${pageNum} de ${totalPages}  -  Contrato de Prestação de Serviços (Assinatura Digital)`
    streamText += `/F1 8 Tf\n1 0 0 1 ${marginLeft} 35 Tm\n(${sanitizePdfString(footerText)}) Tj\n`

    streamText += 'ET'

    addObj(`<< /Length ${streamText.length} >>\nstream\n${streamText}\nendstream`)
  }

  // Objetos de fontes
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  // Montar tabela XREF e Header
  let pdfString = '%PDF-1.7\n'
  const xref: number[] = [0]

  for (let i = 0; i < objects.length; i++) {
    xref.push(pdfString.length)
    pdfString += objects[i]
  }

  const startXref = pdfString.length
  pdfString += `xref\n0 ${objects.length + 1}\n`
  pdfString += '0000000000 65535 f \n'
  for (let i = 1; i < xref.length; i++) {
    pdfString += `${xref[i].toString().padStart(10, '0')} 00000 n \n`
  }

  pdfString += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  pdfString += `startxref\n${startXref}\n%%EOF\n`

  return new Blob([pdfString], { type: 'application/pdf' })
}

/**
 * Converte um Blob de PDF para string Base64 pronta para envio à API do backend
 */
export async function pdfBlobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * Abre janela de impressão ou pré-visualização HTML formatada
 */
export function openContractPrintPreview(
  htmlContent: string,
  title: string = 'Contrato de Prestação',
) {
  const printWindow = window.open('', '_blank', 'width=800,height=900')
  if (!printWindow) return

  const doc = printWindow.document
  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          line-height: 1.6;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 { font-size: 18px; text-align: center; margin-bottom: 24px; text-transform: uppercase; font-weight: 800; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
        h2 { font-size: 15px; margin-top: 20px; margin-bottom: 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        h3 { font-size: 14px; margin-top: 16px; margin-bottom: 8px; font-weight: 700; }
        p { font-size: 12.5px; text-align: justify; margin: 8px 0; }
        hr { border: 0; border-top: 1px solid #cbd5e1; margin: 16px 0; }
        ul { margin: 8px 0 8px 20px; }
        li { font-size: 12.5px; margin-bottom: 4px; }
        .print-btn {
          position: fixed;
          top: 16px;
          right: 16px;
          background: #0284c7;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        @media print {
          .print-btn { display: none; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">Imprimir / Salvar PDF</button>
      <div>${simpleMarkdownToHtml(htmlContent)}</div>
    </body>
    </html>
  `)
  doc.close()
}
