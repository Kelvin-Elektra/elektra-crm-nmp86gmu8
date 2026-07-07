import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { extractSizingMetrics } from '@/lib/sizing-utils'

export interface KitCompositionItem {
  name: string
  qty: number
  total: number
  type: 'module' | 'inverter' | 'supply'
  ruleApplied?: boolean
}

export async function calculateKitPrice(
  neg: any,
): Promise<{ kitPrice: number; kitComposition: KitCompositionItem[] }> {
  if (!neg?.company_id || !neg?.sizing) return { kitPrice: 0, kitComposition: [] }

  try {
    const sizing = neg.sizing || {}
    const installationId = sizing.installation_id || null
    const distributorId = sizing.selected_distributor_id || sizing.distributor_id || null

    const [supplies, rules, allInverters, allModules] = await Promise.all([
      pb.collection('pv_supplies').getFullList({ filter: `company_id = '${neg.company_id}'` }),
      pb.collection('pv_supply_rules').getFullList({ filter: `company_id = '${neg.company_id}'` }),
      pb.collection('pv_inverters').getFullList({ filter: `company_id = '${neg.company_id}'` }),
      pb.collection('pv_modules').getFullList({ filter: `company_id = '${neg.company_id}'` }),
    ])

    let modPowerW = 0
    if (sizing.selected_module_id) {
      const mod = allModules.find((m) => m.id === sizing.selected_module_id)
      if (mod) modPowerW = Number(mod.power || 0)
    }

    const resolvedInverters = (sizing.inverters || []).map((inv: any) => {
      const data = allInverters.find((i) => i.id === inv.id)
      return {
        power: Number(data?.power || 0),
        qty: Number(inv.qty || inv.quantity || 0),
      }
    })

    const metrics = extractSizingMetrics(neg, modPowerW, resolvedInverters)
    let totalModules = metrics.totalModules
    let totalKwp = Math.round(metrics.totalKwp * 10000) / 10000

    let totalMppt = Number(sizing.total_mppt || 0)
    let total = 0
    const composition: KitCompositionItem[] = []

    if (Array.isArray(sizing.modules)) {
      sizing.modules.forEach((m: any) => {
        const qty = Number(m.quantity || 0)
        const price = Number(m.price || 0)
        if (qty > 0) {
          const cost = qty * price
          total += cost
          composition.push({ name: m.name || 'Módulo', qty, total: cost, type: 'module' })
        }
      })
    } else if (sizing.selected_module_id && totalModules > 0) {
      const mod = allModules.find((m) => m.id === sizing.selected_module_id)
      if (mod) {
        const qty = totalModules
        const price = Number(mod.price || 0)
        const cost = qty * price
        total += cost
        composition.push({
          name: mod.brand ? `${mod.brand} ${mod.power}W` : 'Módulo',
          qty,
          total: cost,
          type: 'module',
        })
      }
    }

    if (Array.isArray(sizing.inverters)) {
      sizing.inverters.forEach((inv: any) => {
        const iData = allInverters.find((i) => i.id === inv.id)
        if (iData) {
          const qty = Number(inv.qty || inv.quantity || 0)
          const price = Number(iData.price || inv.price || 0)
          const mppt = Number(iData.mppt || 0)
          totalMppt += mppt * qty
          if (qty > 0) {
            const cost = qty * price
            total += cost
            composition.push({
              name: iData.brand ? `${iData.brand} ${iData.power}kW` : inv.name || 'Inversor',
              qty,
              total: cost,
              type: 'inverter',
            })
          }
        } else {
          const qty = Number(inv.quantity || inv.qty || 0)
          const price = Number(inv.price || 0)
          if (qty > 0) {
            const cost = qty * price
            total += cost
            composition.push({ name: inv.name || 'Inversor', qty, total: cost, type: 'inverter' })
          }
        }
      })
    }

    supplies.forEach((supply) => {
      if (supply.distributor_id && distributorId && supply.distributor_id !== distributorId) {
        return
      }

      const matchingRules = rules.filter((r) => r.supply_id === supply.id)
      const safeInstId = installationId || ''

      const checkRange = (r: any) => {
        if (r.range_type === 'modules') {
          const min = parseFloat(r.min_val) || 0
          const max = r.max_val !== null && r.max_val !== '' ? parseFloat(r.max_val) : Infinity
          return totalModules >= min && totalModules <= max
        }
        if (r.range_type === 'kwp') {
          const min = parseFloat(r.min_val) || 0
          const max = r.max_val !== null && r.max_val !== '' ? parseFloat(r.max_val) : Infinity
          return totalKwp >= min && totalKwp <= max
        }
        return true
      }

      if (matchingRules.length > 0) {
        let validRules = matchingRules.filter((r) => {
          const rInstId = r.installation_id || ''
          const matchesInst = rInstId === '-' || rInstId === '' || rInstId === safeInstId
          if (!matchesInst) return false
          return checkRange(r)
        })

        if (validRules.length > 0) {
          let totalQty = 0

          validRules.forEach((appliedRule) => {
            const calcBase = appliedRule.calc_base
            const ruleMultiplier = parseFloat(appliedRule.multiplier) || 0
            let qty = 0

            if (calcBase === 'modules') qty = totalModules * ruleMultiplier
            else if (calcBase === 'kwp') qty = totalKwp * ruleMultiplier
            else if (calcBase === 'mppt') qty = totalMppt * ruleMultiplier
            else if (calcBase === 'fixed') qty = ruleMultiplier

            totalQty += qty
          })

          if (totalQty > 0) {
            const supplyPrice = parseFloat(supply.price) || 0
            const cost = totalQty * supplyPrice
            total += cost
            composition.push({
              name: supply.name,
              qty: totalQty,
              total: cost,
              type: 'supply',
              ruleApplied: true,
            })
          }
        }
      }
    })

    return { kitPrice: total, kitComposition: composition }
  } catch (e) {
    console.error('Error calculating kit:', e)
    return { kitPrice: 0, kitComposition: [] }
  }
}

export function useKitCalculator(neg: any) {
  const [kitPrice, setKitPrice] = useState(0)
  const [kitComposition, setKitComposition] = useState<KitCompositionItem[]>([])
  const [loading, setLoading] = useState(false)

  const sizingStr = JSON.stringify(neg?.sizing || {})
  const roofFacesStr = JSON.stringify(neg?.roof_faces_data || [])
  const useRoofFaces = neg?.use_roof_faces

  useEffect(() => {
    let isMounted = true
    if (!neg?.company_id || !neg?.sizing) {
      setKitPrice(0)
      setKitComposition([])
      return
    }

    setLoading(true)
    calculateKitPrice(neg).then((res) => {
      if (isMounted) {
        setKitPrice(res.kitPrice)
        setKitComposition(res.kitComposition)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizingStr, roofFacesStr, useRoofFaces, neg?.company_id])

  return { kitPrice, kitComposition, loading }
}
