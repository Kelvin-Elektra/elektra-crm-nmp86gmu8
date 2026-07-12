import { FileText, Banknote } from 'lucide-react'
import { format } from 'date-fns'
import { BRL, type ProposalPageData } from './proposal-utils'

export function ProposalInvestment({ data }: { data: ProposalPageData }) {
  const { proposal, branding, company } = data
  const total = proposal?.total_value || proposal?.price || 0

  return (
    <div className="p-[15mm] space-y-6">
      <div
        className="proposal-section-title border-b-2 pb-4"
        style={{ borderColor: branding.primaryColor }}
      >
        <h2 className="text-3xl font-bold text-slate-800">Investimento & Condições</h2>
      </div>

      <div
        className="proposal-investment-card proposal-no-break bg-white p-8 rounded-2xl border-2 shadow-sm"
        style={{ borderColor: branding.primaryColor }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{
              backgroundColor: branding.primaryColor,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <Banknote className="w-7 h-7" />
          </div>
          <h3 className="font-semibold text-xl text-slate-800">Investimento Total</h3>
        </div>
        <p
          className="text-5xl font-black mb-2"
          style={{
            color: branding.primaryColor,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {BRL.format(total)}
        </p>
        {proposal?.discount_amount ? (
          <p className="text-sm text-slate-500">
            Desconto aplicado: {BRL.format(proposal.discount_amount)}
          </p>
        ) : null}
      </div>

      {proposal?.payment_terms && proposal.payment_terms.trim() !== '' && (
        <div className="proposal-no-break bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h3 className="font-bold text-lg mb-3 text-slate-800">Condições de Pagamento</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
            {proposal.payment_terms}
          </p>
        </div>
      )}

      <div className="proposal-no-break bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5" style={{ color: branding.primaryColor }} />
          <h3 className="font-bold text-lg text-slate-800">Termos e Condições</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
          <div className="proposal-no-break">
            <h4 className="font-semibold text-slate-700 mb-1">Escopo do Fornecimento</h4>
            <p>Inclui projeto, materiais, mão de obra e homologação junto à concessionária.</p>
          </div>
          <div className="proposal-no-break">
            <h4 className="font-semibold text-slate-700 mb-1">Validade da Proposta</h4>
            <p>
              {proposal?.validity_date
                ? format(new Date(proposal.validity_date), 'dd/MM/yyyy')
                : '10 dias corridos'}
              .
            </p>
          </div>
          <div className="proposal-no-break">
            <h4 className="font-semibold text-slate-700 mb-1">Prazo de Instalação</h4>
            <p>
              {company?.installation_lead_time ||
                'Até 30 dias após a aprovação do projeto e disponibilidade dos materiais.'}
            </p>
          </div>
          {proposal?.payment_terms && (
            <div className="proposal-no-break">
              <h4 className="font-semibold text-slate-700 mb-1">Pagamento</h4>
              <p>{proposal.payment_terms}</p>
            </div>
          )}
        </div>
        <div className="pt-4 border-t text-center">
          <p className="text-xs text-slate-400">
            {company?.name || ''} • CNPJ: {company?.cnpj || 'N/A'} • Proposta Nº{' '}
            {proposal?.id?.slice(0, 8) || 'Rascunho'}
          </p>
        </div>
      </div>
    </div>
  )
}
