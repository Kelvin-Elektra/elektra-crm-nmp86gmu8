export interface SizingMetrics {
  totalModules: number
  totalKwp: number
  totalKw: number
  hasSizing: boolean
}

export function extractSizingMetrics(
  neg: any,
  modulePowerW?: number,
  resolvedInverters?: Array<{ power?: number; qty?: number }>,
): SizingMetrics {
  const sizing = neg?.sizing || {}

  let totalModules = Number(sizing.total_modules || sizing.module_qty || 0)

  if (neg?.use_roof_faces && Array.isArray(neg.roof_faces_data)) {
    totalModules = neg.roof_faces_data.reduce(
      (acc: number, f: any) => acc + (Number(f.modules) || 0),
      0,
    )
  }

  let totalKwp = Number(
    sizing.total_power_kwp || sizing.kit_power_kwp || sizing.system_power || sizing.total_kwp || 0,
  )

  if (
    neg?.use_roof_faces &&
    Array.isArray(neg.roof_faces_data) &&
    modulePowerW &&
    modulePowerW > 0
  ) {
    totalKwp = (totalModules * modulePowerW) / 1000
  }

  let totalKw = 0
  if (resolvedInverters && resolvedInverters.length > 0) {
    totalKw = resolvedInverters.reduce((acc: number, inv: any) => {
      if (!inv) return acc
      return acc + (Number(inv.power) || 0) * (Number(inv.qty) || 0)
    }, 0)
  }

  const hasSizing = totalModules > 0 || totalKwp > 0 || totalKw > 0

  return { totalModules, totalKwp, totalKw, hasSizing }
}

export function getBaseValue(calcBase: string, metrics: SizingMetrics): number {
  switch (calcBase) {
    case 'modules':
      return metrics.totalModules
    case 'kwp':
      return metrics.totalKwp
    case 'kw':
      return metrics.totalKw
    default:
      return 0
  }
}

export function getBaseLabel(calcBase: string): string {
  const labels: Record<string, string> = {
    modules: 'módulos',
    kwp: 'kWp',
    kw: 'kW',
    fixed: 'fixo',
  }
  return labels[calcBase] || calcBase
}
