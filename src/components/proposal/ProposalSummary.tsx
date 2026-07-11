import { MapPin, User, Zap, Sun } from 'lucide-react'
import type { ProposalPageData } from './proposal-utils'

export function ProposalSummary({ data }: { data: ProposalPageData }) {
  const { lead, negotiation, sizing, branding, hspData } = data
  const cons = Number(negotiation?.avg_consumption || 0)
  const hsp = hspData?.annual_avg || 4.94
  const estGen = Number(sizing?.estimated_monthly_generation) || 0

  const quadrants = [
    {
      icon: User,
      title: 'Informações do Cliente',
      items: [
        { label: 'Nome', value: lead.name || 'N/A' },
        { label: 'Documento', value: lead.document || 'N/A' },
        { label: 'Email', value: lead.email || 'N/A' },
        { label: 'Telefone', value: lead.phone || 'N/A' },
      ],
    },
    {
      icon: MapPin,
      title: 'Local de Instalação',
      items: [
        { label: 'Endereço', value: negotiation?.address || 'N/A' },
        { label: 'Cidade', value: negotiation?.city || 'N/A' },
        { label: 'Estado', value: negotiation?.state || 'N/A' },
        { label: 'CEP', value: negotiation?.cep || 'N/A' },
      ],
    },
    {
      icon: Zap,
      title: 'Histórico de Consumo',
      items: [
        { label: 'Consumo Médio', value: `${cons} kWh/mês` },
        { label: 'Concessionária', value: negotiation?.concessionaire || 'N/A' },
        { label: 'UC', value: negotiation?.uc || 'N/A' },
        { label: 'Categoria', value: negotiation?.consumer_category || 'N/A' },
      ],
    },
    {
      icon: Sun,
      title: 'Resumo do Sistema',
      items: [
        { label: 'Potência', value: `${(Number(sizing?.kit_power_kwp) || 0).toFixed(2)} kWp` },
        { label: 'Módulos', value: `${sizing?.module_qty || 0} unidades` },
        { label: 'Geração Estimada', value: `${estGen} kWh/mês` },
        { label: 'Irradiação (HSP)', value: `${hsp.toFixed(2)} kWh/kWp/dia` },
        { label: 'Inversores', value: `${sizing?.inverters?.length || 0} unidade(s)` },
      ],
    },
  ]

  return (
    <div className="p-[15mm] space-y-8">
      <div
        className="proposal-section-title border-b-2 pb-4"
        style={{ borderColor: branding.primaryColor }}
      >
        <h2 className="text-3xl font-bold text-slate-800">Resumo & Consumo</h2>
      </div>
      <div className="proposal-no-break grid grid-cols-1 md:grid-cols-2 gap-6">
        {quadrants.map((q) => (
          <div
            key={q.title}
            className="proposal-quadrant proposal-no-break proposal-card bg-slate-50 p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                style={{
                  backgroundColor: branding.primaryColor,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <q.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg text-slate-800">{q.title}</h3>
            </div>
            <div className="space-y-3">
              {q.items.map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between border-b border-slate-200 pb-2"
                >
                  <span className="text-sm text-slate-500">{item.label}</span>
                  <span className="text-sm font-medium text-slate-800 text-right">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
