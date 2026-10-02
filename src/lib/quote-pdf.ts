import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface QuotePdfOptions {
  company: {
    name?: string
    cnpj?: string
    phone?: string
    email?: string
    logoUrl?: string
  }
  client: {
    name?: string
    document?: string
    phone?: string
    email?: string
    address?: string
    city?: string
    state?: string
  }
  negotiationTitle: string
  quoteCode?: string
  items: Array<{
    name: string
    item_type: 'produto' | 'servico' | string
    unit?: string
    unit_price: number
    quantity: number
    total_price: number
    description?: string
  }>
  totalAmount: number
  notes?: string
}

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export async function generateQuote1PagePdf(options: QuotePdfOptions): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  // Top header bar com cor primária Elektra (âmbar/laranja escuro solar ou azul escuro)
  doc.setFillColor(30, 41, 59) // slate-800
  doc.rect(0, 0, pageWidth, 24, 'F')

  // Faixa de destaque solar
  doc.setFillColor(245, 158, 11) // amber-500
  doc.rect(0, 24, pageWidth, 2, 'F')

  // Cabeçalho da Empresa
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  const compName = options.company.name || 'ELEKTRA ENGENHARIA & SOLUÇÕES'
  doc.text(compName.toUpperCase(), margin, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const compContact = [
    options.company.cnpj ? `CNPJ: ${options.company.cnpj}` : '',
    options.company.phone ? `Tel: ${options.company.phone}` : '',
    options.company.email ? `Email: ${options.company.email}` : '',
  ]
    .filter(Boolean)
    .join('  |  ')
  doc.text(compContact || 'Soluções em Energia e Engenharia', margin, 18)

  // Título do documento no topo direito
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('ORÇAMENTO COMERCIAL', pageWidth - margin, 12, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const dateStr = new Date().toLocaleDateString('pt-BR')
  doc.text(`Data: ${dateStr}`, pageWidth - margin, 18, { align: 'right' })

  let currentY = 32

  // Box com Dados do Cliente e da Negociação
  doc.setFillColor(248, 250, 252) // slate-50
  doc.setDrawColor(226, 232, 240) // slate-200
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 24, 2, 2, 'FD')

  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DADOS DO CLIENTE & PROJETO', margin + 4, currentY + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)

  const clientLine1 = [
    `Cliente: ${options.client.name || 'Cliente'}`,
    options.client.document ? `CPF/CNPJ: ${options.client.document}` : '',
    options.client.phone ? `Tel: ${options.client.phone}` : '',
  ]
    .filter(Boolean)
    .join('   |   ')
  doc.text(clientLine1, margin + 4, currentY + 11)

  const addr = [options.client.address, options.client.city, options.client.state]
    .filter(Boolean)
    .join(', ')
  if (addr) {
    doc.text(`Local: ${addr}`, margin + 4, currentY + 16)
  }

  doc.setFont('helvetica', 'bold')
  doc.text(`Referência: ${options.negotiationTitle}`, margin + 4, currentY + 21)

  currentY += 28

  // Tabela de Itens (autoTable)
  const tableRows = options.items.map((item, idx) => {
    const typeLabel = item.item_type === 'servico' ? 'Serviço' : 'Produto'
    const nameFormatted = item.description ? `${item.name}\n${item.description}` : item.name

    return [
      String(idx + 1).padStart(2, '0'),
      nameFormatted,
      typeLabel,
      item.unit || 'un',
      String(item.quantity),
      BRL(item.unit_price),
      BRL(item.total_price),
    ]
  })

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Item / Descrição', 'Tipo', 'Unid.', 'Qtd.', 'Valor Unit.', 'Total']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [51, 65, 85], // slate-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 26, halign: 'right' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      currentY = data.cursor?.y || currentY
    },
  })

  currentY += 4

  // Linha de Total Geral
  const totalBoxWidth = 80
  const totalBoxX = pageWidth - margin - totalBoxWidth
  doc.setFillColor(241, 245, 249) // slate-100
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(totalBoxX, currentY, totalBoxWidth, 14, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text('VALOR TOTAL DO ORÇAMENTO:', totalBoxX + 4, currentY + 6)

  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text(BRL(options.totalAmount), totalBoxX + totalBoxWidth - 4, currentY + 11, {
    align: 'right',
  })

  currentY += 18

  // Condições e Observações
  if (options.notes) {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 20, 2, 2, 'D')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(30, 41, 59)
    doc.text('CONDIÇÕES & OBSERVAÇÕES:', margin + 4, currentY + 5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    const splitNotes = doc.splitTextToSize(options.notes, pageWidth - margin * 2 - 8)
    doc.text(splitNotes, margin + 4, currentY + 10)

    currentY += 24
  }

  // Rodapé da página (1 página garantida)
  const footerY = pageHeight - 12
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text(
    'Este orçamento possui validade de 10 dias corridos. Preços e condições sujeitos a alteração.',
    margin,
    footerY + 2,
  )
  doc.text('Página 1 de 1', pageWidth - margin, footerY + 2, { align: 'right' })

  return doc.output('blob')
}
