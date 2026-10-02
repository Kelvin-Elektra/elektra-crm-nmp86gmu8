import pb from '@/lib/pocketbase/client'

export interface FinancingPartnerRecord {
  id: string
  company_id: string
  name: string
  partner_type?: string
  notes?: string
  active?: boolean
  created?: string
  updated?: string
  expand?: {
    credit_lines?: FinancingCreditLineRecord[]
  }
}

export interface FinancingCreditLineRecord {
  id: string
  company_id: string
  partner_id: string
  name: string
  interest_rate_annual: number
  max_installments: number
  min_down_payment_percent?: number
  notes?: string
  active?: boolean
  created?: string
  updated?: string
  expand?: {
    partner_id?: FinancingPartnerRecord
  }
}

export interface FinancingSimulationRecord {
  id: string
  company_id: string
  negotiation_id: string
  partner_id: string
  credit_line_id?: string
  total_negotiation_value?: number
  down_payment?: number
  financed_amount: number
  interest_rate_annual: number
  installments: number
  monthly_payment?: number
  total_paid?: number
  total_interest?: number
  status?: 'Em análise' | 'Aprovado' | 'Recusado' | string
  notes?: string
  created?: string
  updated?: string
  expand?: {
    partner_id?: FinancingPartnerRecord
    credit_line_id?: FinancingCreditLineRecord
    negotiation_id?: any
  }
}

export async function getFinancingPartners(companyId: string): Promise<FinancingPartnerRecord[]> {
  if (!companyId) return []
  return pb.collection('financing_partners').getFullList<FinancingPartnerRecord>({
    filter: `company_id = '${companyId}'`,
    sort: 'name',
  })
}

export async function getFinancingCreditLines(
  companyId: string,
): Promise<FinancingCreditLineRecord[]> {
  if (!companyId) return []
  return pb.collection('financing_credit_lines').getFullList<FinancingCreditLineRecord>({
    filter: `company_id = '${companyId}'`,
    expand: 'partner_id',
    sort: 'name',
  })
}

export async function getFinancingSimulations(
  companyId: string,
): Promise<FinancingSimulationRecord[]> {
  if (!companyId) return []
  return pb.collection('financing_simulations').getFullList<FinancingSimulationRecord>({
    filter: `company_id = '${companyId}'`,
    expand: 'partner_id,credit_line_id,negotiation_id',
    sort: '-created',
  })
}

export async function getNegotiationFinancing(
  negotiationId: string,
): Promise<FinancingSimulationRecord | null> {
  if (!negotiationId) return null
  try {
    const list = await pb
      .collection('financing_simulations')
      .getList<FinancingSimulationRecord>(1, 1, {
        filter: `negotiation_id = '${negotiationId}'`,
        expand: 'partner_id,credit_line_id',
        sort: '-created',
      })
    return list.items[0] || null
  } catch {
    return null
  }
}
