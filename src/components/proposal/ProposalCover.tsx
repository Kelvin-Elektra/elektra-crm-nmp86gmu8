import type { ProposalPageData } from './proposal-utils'
import { ProposalCoverModern } from './ProposalCoverModern'
import { ProposalCoverElegant } from './ProposalCoverElegant'

export function ProposalCover({ data }: { data: ProposalPageData }) {
  if (data.template === 'elegant') {
    return <ProposalCoverElegant data={data} />
  }
  return <ProposalCoverModern data={data} />
}
