import { type ProposalPageData, ELEMENT_TO_SECTION, getTemplateClasses } from './proposal-utils'
import { ProposalCover } from './ProposalCover'
import { ProposalSummary } from './ProposalSummary'
import { ProposalComponents } from './ProposalComponents'
import { ProposalFinancial } from './ProposalFinancial'
import { ProposalExecution } from './ProposalExecution'
import { ProposalInvestment } from './ProposalInvestment'

const SECTION_COMPONENTS: Record<string, React.FC<{ data: ProposalPageData }>> = {
  cover: ProposalCover,
  summary: ProposalSummary,
  components: ProposalComponents,
  financial: ProposalFinancial,
  execution: ProposalExecution,
  investment: ProposalInvestment,
}

export function ProposalDocument({
  data,
  pagesLayout,
}: {
  data: ProposalPageData
  pagesLayout: Array<{ id: string; elements: string[] }>
}) {
  return (
    <div className={`proposal-document ${getTemplateClasses(data.template)}`}>
      {pagesLayout.map((page) => {
        const seen = new Set<string>()
        const sections = page.elements
          .map((elId) => ELEMENT_TO_SECTION[elId] || elId)
          .filter((s) => {
            if (seen.has(s)) return false
            seen.add(s)
            return true
          })

        const isCover = sections.includes('cover')

        return (
          <div key={page.id} className={`proposal-a4-page ${isCover ? 'proposal-a4-cover' : ''}`}>
            {sections.map((sId) => {
              const Cmp = SECTION_COMPONENTS[sId]
              return Cmp ? <Cmp key={sId} data={data} /> : null
            })}
          </div>
        )
      })}
    </div>
  )
}
