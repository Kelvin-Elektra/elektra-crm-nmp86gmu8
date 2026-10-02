/**
 * Parser e gerador de CSV robusto compatível com Excel e caracteres especiais (UTF-8 com BOM).
 * Suporta separadores vírgula (,) e ponto-e-vírgula (;).
 */

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Remove BOM se presente
  let cleanText = text
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1)
  }

  // Detecta quebra de linha (\r\n ou \n)
  const rawLines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (rawLines.length === 0) {
    return { headers: [], rows: [] }
  }

  // Detecta delimitador (, ou ;)
  const firstLine = rawLines[0]
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const delimiter = semicolonCount >= commaCount ? ';' : ','

  function splitLine(line: string): string[] {
    const result: string[] = []
    let cur = ''
    let insideQuotes = false

    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          insideQuotes = !insideQuotes
        }
      } else if (c === delimiter && !insideQuotes) {
        result.push(cur.trim())
        cur = ''
      } else {
        cur += c
      }
    }
    result.push(cur.trim())
    return result
  }

  const rawHeaders = splitLine(rawLines[0])
  const headers = rawHeaders.map((h) => h.replace(/^["']|["']$/g, '').trim())

  const rows: Record<string, string>[] = []
  for (let i = 1; i < rawLines.length; i++) {
    const cols = splitLine(rawLines[i])
    if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue

    const rowObj: Record<string, string> = {}
    headers.forEach((hdr, idx) => {
      let val = cols[idx] !== undefined ? cols[idx] : ''
      val = val.replace(/^["']|["']$/g, '').trim()
      rowObj[hdr] = val
    })
    rows.push(rowObj)
  }

  return { headers, rows }
}

export function generateCsv(headers: string[], rows: (string | number)[][]): string {
  const delimiter = ';' // Padrão Excel pt-BR
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return ''
    const s = String(val)
    if (s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const headerLine = headers.map(escapeCell).join(delimiter)
  const bodyLines = rows.map((r) => r.map(escapeCell).join(delimiter))

  // Inclui UTF-8 BOM (\uFEFF) para o Excel abrir sem problemas de acentuação
  return '\uFEFF' + [headerLine, ...bodyLines].join('\r\n')
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
