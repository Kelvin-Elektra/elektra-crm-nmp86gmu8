import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'

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
    const totalModules = Number(sizing.total_modules || 0)
    const totalKwp = Number(sizing.system_power || sizing.total_kwp || sizing.power || 0)
    const totalMppt = Number(sizing.total_mppt || 0)
    const distributorId = sizing.distributor_id || null

    const [supplies, rules] = await Promise.all([
      pb.collection('pv_supplies').getFullList({ filter: `company_id = '${neg.company_id}'` }),
      pb.collection('pv_supply_rules').getFullList({ filter: `company_id = '${neg.company_id}'` }),
    ])

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
    }

    if (Array.isArray(sizing.inverters)) {
      sizing.inverters.forEach((inv: any) => {
        const qty = Number(inv.quantity || 0)
        const price = Number(inv.price || 0)
        if (qty > 0) {
          const cost = qty * price
          total += cost
          composition.push({ name: inv.name || 'Inversor', qty, total: cost, type: 'inverter' })
        }
      })
    }

    supplies.forEach((supply) => {
      if (supply.distributor_id && distributorId && supply.distributor_id !== distributorId) return

      const matchingRules = rules.filter((r) => r.supply_id === supply.id)
      const exactInstRules = matchingRules.filter((r) => r.installation_id === installationId)
      const anyInstRules = matchingRules.filter((r) => !r.installation_id)

      const checkRange = (r: any) => {
        if (r.range_type === 'modules') {
          const min = Number(r.min_val) || 0
          const max = r.max_val !== null && r.max_val !== '' ? Number(r.max_val) : Infinity
          return totalModules >= min && totalModules <= max
        }
        if (r.range_type === 'kwp') {
          const min = Number(r.min_val) || 0
          const max = r.max_val !== null && r.max_val !== '' ? Number(r.max_val) : Infinity
          return totalKwp >= min && totalKwp <= max
        }
        return true
      }

      const appliedRule = exactInstRules.find(checkRange) || anyInstRules.find(checkRange)

      const calcBase = appliedRule ? appliedRule.calc_base : supply.calc_base
      const multiplier = appliedRule ? appliedRule.multiplier : supply.multiplier
      const price = Number(supply.price || 0)

      let qty = 0
      if (calcBase === 'modules') qty = totalModules * multiplier
      else if (calcBase === 'kwp') qty = totalKwp * multiplier
      else if (calcBase === 'mppt') qty = totalMppt * multiplier
      else if (calcBase === 'fixed') qty = multiplier

      if (qty > 0) {
        const cost = qty * price
        total += cost
        composition.push({
          name: supply.name,
          qty,
          total: cost,
          type: 'supply',
          ruleApplied: !!appliedRule,
        })
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
  }, [sizingStr, neg?.company_id])

  return { kitPrice, kitComposition, loading }
}
