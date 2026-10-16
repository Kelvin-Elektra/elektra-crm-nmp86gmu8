import { describe, it, expect } from 'vitest'
import { generateXlsx, parseXlsx, crc32 } from '../xlsx-helper'

describe('XLSX Helper', () => {
  it('calculates crc32 correctly', () => {
    const encoder = new TextEncoder()
    const data = encoder.encode('123456789')
    expect(crc32(data)).toBe(0xcbf43926)
  })

  it('generates a valid PKZip / XLSX structure with headers and rows', async () => {
    const headers = ['Modelo', 'Marca', 'Potencia_Wp', 'Preco_R$']
    const sampleRows = [
      ['CS6W-550MS', 'Canadian Solar', 550, '450,00'],
      ['TSM-440', 'Trina Solar', 440, '380,00'],
    ]

    const bytes = generateXlsx(headers, sampleRows, 'Módulos')
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(500)

    // Verifica assinatura PKZip (0x04034b50 -> 'PK\x03\x04')
    expect(bytes[0]).toBe(0x50) // 'P'
    expect(bytes[1]).toBe(0x4b) // 'K'
    expect(bytes[2]).toBe(0x03)
    expect(bytes[3]).toBe(0x04)

    // Faz o parse do XLSX gerado
    const parsed = await parseXlsx(bytes.buffer)
    expect(parsed.headers).toEqual(headers)
    expect(parsed.rows.length).toBe(2)
    expect(parsed.rows[0]['Modelo']).toBe('CS6W-550MS')
    expect(parsed.rows[0]['Marca']).toBe('Canadian Solar')
    expect(parsed.rows[0]['Potencia_Wp']).toBe('550')
    expect(parsed.rows[1]['Modelo']).toBe('TSM-440')
    expect(parsed.rows[1]['Potencia_Wp']).toBe('440')
  })
})
