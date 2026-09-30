export interface CompanyLeadTimeItem {
  id: string
  label: string
  is_default: boolean
}

/**
 * Normaliza o valor de installation_lead_times da empresa vindo do PocketBase (JSON).
 * Trata casos em que vem como array, string JSON, ou fallback para installation_lead_time antigo.
 */
export function normalizeCompanyLeadTimes(
  rawList: any,
  legacySingleTime?: string,
): CompanyLeadTimeItem[] {
  let list: any[] = []

  if (Array.isArray(rawList)) {
    list = rawList
  } else if (typeof rawList === 'string' && rawList.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(rawList)
      if (Array.isArray(parsed)) list = parsed
    } catch {
      list = []
    }
  }

  const normalized: CompanyLeadTimeItem[] = list
    .map((item, idx) => {
      if (!item) return null
      if (typeof item === 'string') {
        const text = item.trim()
        if (!text) return null
        return {
          id: `lt-${idx}-${Date.now()}`,
          label: text,
          is_default: idx === 0,
        }
      }
      const label = String(item.label || item.text || item.description || '').trim()
      if (!label) return null
      return {
        id: String(item.id || `lt-${idx}`),
        label,
        is_default: Boolean(item.is_default),
      }
    })
    .filter((item): item is CompanyLeadTimeItem => Boolean(item))

  // Se a lista estiver vazia mas existir o campo legado, cria o item inicial como default
  if (normalized.length === 0 && legacySingleTime && legacySingleTime.trim()) {
    normalized.push({
      id: 'legacy-lead-time',
      label: legacySingleTime.trim(),
      is_default: true,
    })
  }

  return normalized
}

/**
 * Retorna o item marcado como padrão ou o primeiro da lista, se houver.
 */
export function getDefaultLeadTime(items: CompanyLeadTimeItem[]): string {
  if (!items || items.length === 0) return ''
  const def = items.find((i) => i.is_default)
  return def ? def.label : items[0]?.label || ''
}
