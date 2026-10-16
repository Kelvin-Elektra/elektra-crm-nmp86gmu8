/**
 * Utilitário de geração e leitura de planilhas XLSX reais (.xlsx) em JavaScript puro.
 * Constrói e lê arquivos OpenXML SpreadsheetML compactados em ZIP em conformidade
 * com a especificação ECMA-376 / Microsoft Excel, sem dependências externas.
 */

// Tabela CRC32 pré-calculada para integridade dos arquivos no arquivo ZIP
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c
}

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

export interface ZipFileEntry {
  path: string
  data: Uint8Array
}

/**
 * Cria um arquivo ZIP (PKZip 2.0 padrão, método Store / 0) contendo a lista de arquivos informados.
 * Totalmente suportado por Excel, LibreOffice, Google Sheets e Numbers.
 */
export function createZipArchive(files: ZipFileEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const fileRecords = files.map((f) => {
    const nameBytes = encoder.encode(f.path)
    const crc = crc32(f.data)
    return {
      path: f.path,
      nameBytes,
      data: f.data,
      crc,
      uncompressedSize: f.data.length,
      compressedSize: f.data.length,
      localHeaderOffset: 0,
    }
  })

  // Calcula tamanho total do arquivo ZIP
  let localHeadersTotal = 0
  for (const r of fileRecords) {
    localHeadersTotal += 30 + r.nameBytes.length + r.data.length
  }
  let centralDirTotal = 0
  for (const r of fileRecords) {
    centralDirTotal += 46 + r.nameBytes.length
  }
  const eocdTotal = 22
  const totalSize = localHeadersTotal + centralDirTotal + eocdTotal

  const out = new Uint8Array(totalSize)
  const view = new DataView(out.buffer)
  let offset = 0

  // 1. Grava Local File Headers e dados dos arquivos
  for (const r of fileRecords) {
    r.localHeaderOffset = offset

    // Assinatura 0x04034b50
    view.setUint32(offset, 0x04034b50, true)
    view.setUint16(offset + 4, 20, true) // version needed: 2.0
    view.setUint16(offset + 6, 0x0800, true) // general flag: UTF-8 bit
    view.setUint16(offset + 8, 0, true) // compression: 0 (Store)
    view.setUint16(offset + 10, 0x6000, true) // time: 12:00:00
    view.setUint16(offset + 12, 0x5821, true) // date: 2024-01-01
    view.setUint32(offset + 14, r.crc, true)
    view.setUint32(offset + 18, r.compressedSize, true)
    view.setUint32(offset + 22, r.uncompressedSize, true)
    view.setUint16(offset + 26, r.nameBytes.length, true)
    view.setUint16(offset + 28, 0, true) // extra field length
    offset += 30

    out.set(r.nameBytes, offset)
    offset += r.nameBytes.length

    out.set(r.data, offset)
    offset += r.data.length
  }

  const centralDirStart = offset

  // 2. Grava Central Directory Headers
  for (const r of fileRecords) {
    // Assinatura 0x02014b50
    view.setUint32(offset, 0x02014b50, true)
    view.setUint16(offset + 4, 20, true) // version made by
    view.setUint16(offset + 6, 20, true) // version needed
    view.setUint16(offset + 8, 0x0800, true) // UTF-8
    view.setUint16(offset + 10, 0, true) // store
    view.setUint16(offset + 12, 0x6000, true) // time
    view.setUint16(offset + 14, 0x5821, true) // date
    view.setUint32(offset + 16, r.crc, true)
    view.setUint32(offset + 20, r.compressedSize, true)
    view.setUint32(offset + 24, r.uncompressedSize, true)
    view.setUint16(offset + 28, r.nameBytes.length, true)
    view.setUint16(offset + 30, 0, true) // extra length
    view.setUint16(offset + 32, 0, true) // comment length
    view.setUint16(offset + 34, 0, true) // disk start
    view.setUint16(offset + 36, 0, true) // internal attr
    view.setUint32(offset + 38, 0, true) // external attr
    view.setUint32(offset + 42, r.localHeaderOffset, true)
    offset += 46

    out.set(r.nameBytes, offset)
    offset += r.nameBytes.length
  }

  const centralDirSize = offset - centralDirStart

  // 3. Grava End of Central Directory Record (EOCD)
  view.setUint32(offset, 0x06054b50, true)
  view.setUint16(offset + 4, 0, true) // disk number
  view.setUint16(offset + 6, 0, true) // disk start
  view.setUint16(offset + 8, fileRecords.length, true) // entries this disk
  view.setUint16(offset + 10, fileRecords.length, true) // total entries
  view.setUint32(offset + 12, centralDirSize, true)
  view.setUint32(offset + 16, centralDirStart, true)
  view.setUint16(offset + 20, 0, true) // comment length

  return out
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function colName(index: number): string {
  let name = ''
  let num = index
  while (num >= 0) {
    name = String.fromCharCode((num % 26) + 65) + name
    num = Math.floor(num / 26) - 1
  }
  return name
}

/**
 * Gera os bytes de uma planilha XLSX (.xlsx) com cabeçalhos e linhas informados.
 */
export function generateXlsx(
  headers: string[],
  rows: (string | number)[][],
  sheetName: string = 'Modelo',
): Uint8Array {
  const encoder = new TextEncoder()

  // Constrói XML da planilha sheet1.xml
  let rowsXml = ''

  // Linha 1: Cabeçalhos
  rowsXml += '<row r="1">'
  headers.forEach((hdr, colIdx) => {
    const cellRef = `${colName(colIdx)}1`
    rowsXml += `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(String(hdr ?? ''))}</t></is></c>`
  })
  rowsXml += '</row>'

  // Linhas seguintes: Dados de exemplo
  rows.forEach((row, rowIdx) => {
    const rowNum = rowIdx + 2
    rowsXml += `<row r="${rowNum}">`
    row.forEach((cellVal, colIdx) => {
      const cellRef = `${colName(colIdx)}${rowNum}`
      if (cellVal === null || cellVal === undefined || cellVal === '') {
        rowsXml += `<c r="${cellRef}"/>`
      } else if (typeof cellVal === 'number') {
        rowsXml += `<c r="${cellRef}"><v>${cellVal}</v></c>`
      } else {
        rowsXml += `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(String(cellVal))}</t></is></c>`
      }
    })
    rowsXml += '</row>'
  })

  const sheet1Xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n` +
    `  <sheetData>\n` +
    `    ${rowsXml}\n` +
    `  </sheetData>\n` +
    `</worksheet>`

  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n` +
    `  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n` +
    `  <Default Extension="xml" ContentType="application/xml"/>\n` +
    `  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n` +
    `  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n` +
    `  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>\n` +
    `</Types>`

  const relsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n` +
    `  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n` +
    `</Relationships>`

  const workbookRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n` +
    `  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>\n` +
    `  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>\n` +
    `</Relationships>`

  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n` +
    `  <sheets>\n` +
    `    <sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/>\n` +
    `  </sheets>\n` +
    `</workbook>`

  const stylesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n` +
    `  <fonts count="1"><font><name val="Calibri"/><sz val="11"/></font></fonts>\n` +
    `  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>\n` +
    `  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>\n` +
    `  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>\n` +
    `  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>\n` +
    `</styleSheet>`

  const files: ZipFileEntry[] = [
    { path: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { path: '_rels/.rels', data: encoder.encode(relsXml) },
    { path: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRelsXml) },
    { path: 'xl/workbook.xml', data: encoder.encode(workbookXml) },
    { path: 'xl/styles.xml', data: encoder.encode(stylesXml) },
    { path: 'xl/worksheets/sheet1.xml', data: encoder.encode(sheet1Xml) },
  ]

  return createZipArchive(files)
}

/**
 * Dispara o download de um arquivo .xlsx real no navegador do usuário.
 */
export function downloadXlsx(filename: string, content: Uint8Array | Blob) {
  const finalFilename = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content as any], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = finalFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Descompacta dados em formato Raw Deflate (RFC 1951) utilizando a API nativa DecompressionStream.
 */
async function decompressRaw(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('deflate-raw')
    const writer = ds.writable.getWriter()
    writer.write(compressed as any)
    writer.close()
    const reader = ds.readable.getReader()
    const chunks: Uint8Array[] = []
    let totalLen = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        totalLen += value.length
      }
    }
    const result = new Uint8Array(totalLen)
    let off = 0
    for (const chunk of chunks) {
      result.set(chunk, off)
      off += chunk.length
    }
    return result
  }
  throw new Error('DecompressionStream não suportado neste navegador.')
}

function colLetterToIndex(col: string): number {
  let idx = 0
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64)
  }
  return idx - 1
}

/**
 * Lê e extrai headers e rows de um arquivo .xlsx enviado pelo usuário (ArrayBuffer).
 */
export async function parseXlsx(
  buffer: ArrayBufferLike,
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)

  // Localiza o End of Central Directory Record (EOCD) procurando 0x06054b50 a partir do final
  let eocdOffset = -1
  const searchLimit = Math.max(0, bytes.length - 65557)
  for (let i = bytes.length - 22; i >= searchLimit; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i
      break
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Arquivo XLSX inválido ou corrompido (EOCD não encontrado).')
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true)
  const centralDirStart = view.getUint32(eocdOffset + 16, true)

  const decoder = new TextDecoder()
  const zipFiles: Map<string, Uint8Array> = new Map()

  let cdOffset = centralDirStart
  for (let e = 0; e < totalEntries; e++) {
    if (view.getUint32(cdOffset, true) !== 0x02014b50) break

    const method = view.getUint16(cdOffset + 10, true)
    const compSize = view.getUint32(cdOffset + 20, true)
    const nameLen = view.getUint16(cdOffset + 28, true)
    const extraLen = view.getUint16(cdOffset + 30, true)
    const commentLen = view.getUint16(cdOffset + 32, true)
    const localHeaderOffset = view.getUint32(cdOffset + 42, true)

    const nameBytes = bytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen)
    const path = decoder.decode(nameBytes)

    // Lê local file header para saber tamanho de extra field local
    const localNameLen = view.getUint16(localHeaderOffset + 26, true)
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true)
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen

    const rawData = bytes.subarray(dataStart, dataStart + compSize)

    // Descompacta se necessário (apenas se for o sheet1 ou sharedStrings para performance)
    if (path.includes('sheet1.xml') || path.includes('sharedStrings.xml')) {
      if (method === 0) {
        zipFiles.set(path, rawData)
      } else if (method === 8) {
        try {
          const decompressed = await decompressRaw(rawData)
          zipFiles.set(path, decompressed)
        } catch {
          // ignora se falhar
        }
      }
    }

    cdOffset += 46 + nameLen + extraLen + commentLen
  }

  // 1. Extrai shared strings se existirem
  const sharedStrings: string[] = []
  for (const [p, data] of zipFiles.entries()) {
    if (p.endsWith('sharedStrings.xml')) {
      const xml = decoder.decode(data)
      const siMatches = xml.match(/<si\b[^>]*>[\s\S]*?<\/si>/gi) || []
      for (const si of siMatches) {
        const tMatches = si.match(/<t\b[^>]*>([\s\S]*?)<\/t>/gi) || []
        const text = tMatches
          .map((t) => t.replace(/<[^>]+>/g, ''))
          .join('')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
        sharedStrings.push(text)
      }
      break
    }
  }

  // 2. Extrai células da worksheet sheet1
  let sheetXml = ''
  for (const [p, data] of zipFiles.entries()) {
    if (p.endsWith('sheet1.xml')) {
      sheetXml = decoder.decode(data)
      break
    }
  }

  if (!sheetXml) {
    throw new Error('Não foi possível encontrar a aba principal na planilha XLSX.')
  }

  // Mapeia linhas e colunas
  const rawRows: Record<number, Record<number, string>> = {}
  const rowMatches = sheetXml.match(/<row\b[^>]*r="(\d+)"[^>]*>[\s\S]*?<\/row>/gi) || []

  for (const rowTag of rowMatches) {
    const rowNumMatch = rowTag.match(/r="(\d+)"/i)
    if (!rowNumMatch) continue
    const rowNum = parseInt(rowNumMatch[1], 10)
    rawRows[rowNum] = {}

    const cellMatches = rowTag.match(/<c\b[^>]*r="([A-Z]+)\d+"[^>]*>[\s\S]*?<\/c>/gi) || []
    for (const cellTag of cellMatches) {
      const colMatch = cellTag.match(/r="([A-Z]+)\d+"/i)
      if (!colMatch) continue
      const colIdx = colLetterToIndex(colMatch[1].toUpperCase())

      const isShared = /t="s"/i.test(cellTag)
      const isInline = /t="inlineStr"/i.test(cellTag)

      let val = ''
      if (isShared) {
        const vMatch = cellTag.match(/<v>(\d+)<\/v>/i)
        if (vMatch) {
          const idx = parseInt(vMatch[1], 10)
          val = sharedStrings[idx] ?? ''
        }
      } else if (isInline) {
        const tMatch = cellTag.match(/<t\b[^>]*>([\s\S]*?)<\/t>/i)
        if (tMatch) {
          val = tMatch[1]
        }
      } else {
        const vMatch = cellTag.match(/<v>([\s\S]*?)<\/v>/i)
        if (vMatch) {
          val = vMatch[1]
        }
      }

      val = val
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim()

      rawRows[rowNum][colIdx] = val
    }
  }

  // Linha 1 = Cabeçalhos
  const headerRow = rawRows[1] || {}
  const maxCol = Math.max(-1, ...Object.keys(headerRow).map((k) => parseInt(k, 10)))
  if (maxCol === -1) {
    return { headers: [], rows: [] }
  }

  const headers: string[] = []
  for (let c = 0; c <= maxCol; c++) {
    headers.push(headerRow[c] || `Coluna_${c + 1}`)
  }

  // Linhas 2+ = Dados
  const sortedRowNums = Object.keys(rawRows)
    .map((n) => parseInt(n, 10))
    .filter((n) => n > 1)
    .sort((a, b) => a - b)

  const rows: Record<string, string>[] = []
  for (const rNum of sortedRowNums) {
    const rowData = rawRows[rNum]
    const rowObj: Record<string, string> = {}
    let hasAnyData = false

    headers.forEach((hdr, cIdx) => {
      const val = rowData[cIdx] !== undefined ? rowData[cIdx] : ''
      if (val) hasAnyData = true
      rowObj[hdr] = val
    })

    if (hasAnyData) {
      rows.push(rowObj)
    }
  }

  return { headers, rows }
}
