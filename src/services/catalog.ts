import pb from '@/lib/pocketbase/client'

export interface CatalogItemRecord {
  id: string
  company_id: string
  name: string
  description?: string
  item_type: 'produto' | 'servico'
  price: number
  unit?: string // un, m, hora, servico, etc.
  active?: boolean
  created?: string
  updated?: string
}

export interface NegotiationQuoteItemRecord {
  id: string
  company_id: string
  negotiation_id: string
  catalog_item_id?: string
  name: string
  description?: string
  item_type: 'produto' | 'servico'
  unit?: string
  unit_price: number
  quantity: number
  total_price: number
  notes?: string
  created?: string
  updated?: string
  expand?: {
    catalog_item_id?: CatalogItemRecord
  }
}

export async function getCatalogItems(companyId: string): Promise<CatalogItemRecord[]> {
  if (!companyId) return []
  return pb.collection('catalog_items').getFullList<CatalogItemRecord>({
    filter: `company_id = '${companyId}'`,
    sort: 'name',
  })
}

export async function getNegotiationQuoteItems(
  negotiationId: string,
): Promise<NegotiationQuoteItemRecord[]> {
  if (!negotiationId) return []
  return pb.collection('negotiation_quote_items').getFullList<NegotiationQuoteItemRecord>({
    filter: `negotiation_id = '${negotiationId}'`,
    expand: 'catalog_item_id',
    sort: 'created',
  })
}
