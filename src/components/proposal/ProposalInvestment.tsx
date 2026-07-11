import { Banknote, CreditCard, Landmark, BadgeCheck, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { BRL, type ProposalPageData } from './proposal-utils'

export function ProposalInvestment({ data }: { data: ProposalPageData }) {
  const { proposal, branding, sizing } = data
  const total =
    proposal?.total_value || proposal?.price || (Number(sizing?.kit_power_kwp) || 0) * 3500

  const options = [
    {
      icon: Banknote,
      title: 'À Vista',
      badge: 'Melhor Preço',
      badgeColor: 'bg-green-600',
      value: total * 0.9,
      desc: '10% de desconto sobre o valor total',
      detail: `Economia de ${BRL.format(total * 0.1)}`,
    },
    {
      icon: CreditCard,
      title: 'Cartão de Crédito',
      badge: null,
      badgeColor: '',
      value: total / 12,
      desc: 'Parcelamento em até 12x sem juros',
      detail: `Total: ${BRL.format(total)} em 12x`,
    },
    {
      icon: Landmark,
      title: 'Financiamento',
      badge: null,
      badgeColor: '',
      value: (total * 1.199) / 60,
      desc: 'Até 60x com juros de 1,99% a.m.',
      detail: `Total: ${BRL.format(total * 1.199)} em 60x`,
    },
  ]

  return (
    <div className="p-8 md:p-16 space-y-8">
      <div
        className="proposal-section-title border-b-2 pb-4"
        style={{ borderColor: branding.primaryColor }}
      >
        <h2 className="text-3xl font-bold text-slate-800">Investimento & Condições</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((opt) => (
          <div
            key={opt.title}
            className={`proposal-investment-card relative bg-white p-6 rounded-2xl border-2 shadow-sm flex flex-col ${opt.badge ? 'border-green-300' : 'border-slate-200'}`}
          >
            {opt.badge && (
              <span
                className={`absolute -top-3 right-4 ${opt.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1`}
              >
                <BadgeCheck className="w-3 h-3" /> {opt.badge}
              </span>
            )}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4"
              style={{
                backgroundColor: branding.primaryColor,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <opt.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-slate-800 mb-1">{opt.title}</h3>
            <p className="text-3xl font-black mb-2" style={{ color: branding.primaryColor }}>
              {BRL.format(opt.value)}
            </p>
            <p className="text-xs text-slate-500 mb-1">{opt.desc}</p>
            <p className="text-xs font-medium text-slate-600 mt-auto pt-2 border-t">{opt.detail}</p>
          </div>
        ))}
      </div>
      {proposal?.payment_terms && (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h3 className="font-bold text-lg mb-2 text-slate-800">Condições Especiais</h3>
          <p className="text-sm text-slate-600">{proposal.payment_terms}</p>
        </div>
      )}
      <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 space-y-4">
        <div className="proposal-no-break flex items-center gap-2">
          <FileText className="w-5 h-5" style={{ color: branding.primaryColor }} />
          <h3 className="font-bold text-lg text-slate-800">Termos e Condições</h3>
        </div>
        <div className="space-y-3 text-sm text-slate-600">
          <div>
            <h4 className="font-semibold text-slate-700 mb-1">Escopo do Fornecimento</h4>
            <p>Inclui projeto, materiais, mão de obra e homologação junto à concessionária.</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 mb-1">Validade da Proposta</h4>
            <p>
              {proposal?.validity_date
                ? format(new Date(proposal.validity_date), 'dd/MM/yyyy')
                : '10 dias corridos'}
              .
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 mb-1">Prazo de Instalação</h4>
            <p>Até 30 dias após a aprovação do projeto e disponibilidade dos materiais.</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 mb-1">Pagamento</h4>
            <p>{proposal?.payment_terms || 'Conforme condição selecionada acima.'}</p>
          </div>
        </div>
        <div className="pt-4 border-t text-center">
          <p className="text-xs text-slate-400">
            {data.company?.name || ''} • CNPJ: {data.company?.cnpj || 'N/A'} • Proposta Nº{' '}
            {proposal?.id?.slice(0, 8) || 'Rascunho'}
          </p>
        </div>
      </div>
    </div>
  )
}
