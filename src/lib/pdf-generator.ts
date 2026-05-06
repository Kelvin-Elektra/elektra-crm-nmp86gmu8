export function generateDashboardPDF(data: Record<string, any>): Blob {
  const sanitize = (str: string) => {
    if (str == null) return ''
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^\x20-\x7E]/g, '') // keep only printable ASCII
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
  }

  const objects: string[] = []
  const addObj = (content: string) => {
    objects.push(`${objects.length + 1} 0 obj\n${content}\nendobj\n`)
  }

  addObj('<< /Type /Catalog /Pages 2 0 R >>')
  addObj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  addObj(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
  )
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  let content = 'BT\n'
  let y = 800

  const drawText = (text: string, x: number, isBold: boolean, size: number) => {
    const font = isBold ? '/F2' : '/F1'
    content += `${font} ${size} Tf\n1 0 0 1 ${x} ${y} Tm\n(${sanitize(text)}) Tj\n`
  }

  drawText('Elektra CRM - Relatorio de Desempenho', 50, true, 20)
  y -= 30
  drawText(`Periodo: ${data.period}`, 50, false, 12)
  y -= 20
  drawText(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 50, false, 10)
  y -= 40

  const drawRow = (label: string, value: string) => {
    drawText(label, 50, false, 12)
    drawText(value, 300, true, 12)
    y -= 25
  }

  drawText('Resumo de Metricas', 50, true, 14)
  y -= 25

  drawRow('Vendas Fechadas:', data.vendasFechadas)
  drawRow('Novas Negociacoes:', data.novasNegociacoes)
  drawRow('Novos Leads:', data.novosLeads)
  drawRow('Potencia Vendida:', data.totalKwp)
  drawRow('Taxa de Fechamento:', data.taxaConversao)
  drawRow('Aproveitamento de Leads:', data.aproveitamento)
  drawRow('Propostas / Negociacoes:', data.propNegRatio)
  drawRow('Ticket Medio (Aprovadas):', data.ticketMedioAprovadas)
  drawRow('Ticket Medio (Propostas):', data.ticketMedioFeitas)

  y -= 20
  drawText('Vendas Fechadas no Periodo', 50, true, 14)
  y -= 25

  drawText('Data', 50, true, 10)
  drawText('Negociacao', 120, true, 10)
  drawText('Potencia', 360, true, 10)
  drawText('Valor', 450, true, 10)
  y -= 15

  if (data.sales && data.sales.length > 0) {
    const maxItems = 25
    const items = data.sales.slice(0, maxItems)
    items.forEach((s: any) => {
      drawText(s.date, 50, false, 10)
      drawText(s.title.substring(0, 40), 120, false, 10)
      drawText(s.power, 360, false, 10)
      drawText(s.value, 450, false, 10)
      y -= 15
    })
    if (data.sales.length > maxItems) {
      y -= 5
      drawText(`... e mais ${data.sales.length - maxItems} vendas.`, 50, false, 10)
    }
  } else {
    drawText('Nenhuma venda fechada neste periodo.', 50, false, 10)
  }

  content += 'ET'
  addObj(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)

  let pdfText = '%PDF-1.7\n'
  const xref: number[] = [0]

  for (let i = 0; i < objects.length; i++) {
    xref.push(pdfText.length)
    pdfText += objects[i]
  }

  const startXref = pdfText.length
  pdfText += `xref\n0 ${objects.length + 1}\n`
  pdfText += '0000000000 65535 f \n'
  for (let i = 1; i < xref.length; i++) {
    pdfText += `${xref[i].toString().padStart(10, '0')} 00000 n \n`
  }

  pdfText += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  pdfText += `startxref\n${startXref}\n%%EOF\n`

  return new Blob([pdfText], { type: 'application/pdf' })
}
