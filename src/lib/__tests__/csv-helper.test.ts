import { describe, it, expect } from 'vitest'
import { parseCsv, generateCsv } from '../csv-helper'

describe('CSV Helper', () => {
  it('parses comma and semicolon separated CSV correctly', () => {
    const csvComma = 'name,power,price\nCanadense 550W,550,450.50\nTrina 600W,600,520'
    const res1 = parseCsv(csvComma)
    expect(res1.headers).toEqual(['name', 'power', 'price'])
    expect(res1.rows.length).toBe(2)
    expect(res1.rows[0].name).toBe('Canadense 550W')
    expect(res1.rows[0].power).toBe('550')

    const csvSemicolon = 'name;brand;power\r\nDeye;Deye;5000\r\nGrovatt;Growatt;6000'
    const res2 = parseCsv(csvSemicolon)
    expect(res2.headers).toEqual(['name', 'brand', 'power'])
    expect(res2.rows.length).toBe(2)
    expect(res2.rows[0].brand).toBe('Deye')
  })

  it('generates Excel compatible CSV with UTF-8 BOM', () => {
    const headers = ['Nome', 'Potência', 'Preço']
    const rows = [['Módulo Solar 550W', 550, '450,00']]
    const csv = generateCsv(headers, rows)

    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('Módulo Solar 550W;550;450,00')
  })
})
