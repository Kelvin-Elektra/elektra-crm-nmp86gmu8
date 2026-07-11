export interface BrandingConfig {
  primaryColor: string
  secondaryColor: string
  gradientColor: string
}

export interface ProposalPageData {
  company: any | null
  branding: BrandingConfig
  template: string
  sizing: any
  lead: any
  negotiation: any
  proposal: any
  moduleRec: any | null
  inverterRecs: any[]
  financialProjection: any | null
  tariffDetails: any | null
}

export const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const ELEMENT_TO_SECTION: Record<string, string> = {
  cover: 'cover',
  facade: 'summary',
  technical: 'summary',
  charts: 'financial',
  system: 'components',
  financial: 'financial',
  warranty: 'execution',
  schedule: 'execution',
  terms: 'investment',
  summary: 'summary',
  components: 'components',
  execution: 'execution',
  investment: 'investment',
}

export function parseSnapshot(proposal: any): any {
  try {
    if (proposal?.snapshot_data && typeof proposal.snapshot_data === 'object')
      return proposal.snapshot_data
    if (typeof proposal?.kit_details === 'string') return JSON.parse(proposal.kit_details)
    if (proposal?.kit_details && typeof proposal.kit_details === 'object')
      return proposal.kit_details
  } catch {
    /* ignore */
  }
  return {}
}

export function getBranding(snapshot: any): BrandingConfig {
  return (
    snapshot?.branding ||
    snapshot?.settings?.branding || {
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      gradientColor: '#3b82f6',
    }
  )
}

export function getTemplate(snapshot: any): string {
  return snapshot?.template || snapshot?.settings?.template || 'modern'
}

export function getPagesLayout(snapshot: any): Array<{ id: string; elements: string[] }> {
  const layout = snapshot?.pages_layout || snapshot?.settings?.pages_layout || []
  if (!Array.isArray(layout) || layout.length === 0) {
    return [
      { id: 'p1', elements: ['cover'] },
      { id: 'p2', elements: ['summary'] },
      { id: 'p3', elements: ['components'] },
      { id: 'p4', elements: ['financial'] },
      { id: 'p5', elements: ['execution'] },
      { id: 'p6', elements: ['investment'] },
    ]
  }
  return layout
}

export function getTemplateClasses(template: string): string {
  switch (template) {
    case 'elegant':
      return 'font-serif'
    case 'compact':
      return 'text-sm'
    case 'corporate':
      return 'font-sans tracking-tight'
    default:
      return 'font-sans'
  }
}
