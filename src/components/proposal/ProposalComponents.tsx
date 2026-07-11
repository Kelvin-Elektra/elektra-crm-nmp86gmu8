import { LayoutGrid, Zap as ZapIcon, Wrench } from 'lucide-react'
import type { ProposalPageData } from './proposal-utils'

export function ProposalComponents({ data }: { data: ProposalPageData }) {
  const { moduleRec, inverterRecs, sizing, branding } = data

  const cards = [
    {
      icon: LayoutGrid,
      title: 'Módulos Fotovoltaicos',
      details: [
        { label: 'Marca', value: moduleRec?.brand || 'N/A' },
        { label: 'Modelo', value: moduleRec?.name || 'N/A' },
        { label: 'Potência Unit.', value: `${moduleRec?.power || 0} W` },
        { label: 'Quantidade', value: `${sizing?.module_qty || 0} un.` },
      ],
    },
    {
      icon: ZapIcon,
      title: 'Inversores',
      details:
        inverterRecs.length > 0
          ? inverterRecs.flatMap((inv: any, i: number) => [
              { label: `Marca (${i + 1})`, value: inv?.brand || 'N/A' },
              {
                label: `Modelo (${i + 1})`,
                value: `${inv?.name || 'N/A'} • ${inv?.power || 0}kW • ${inv?.qty || 1}un`,
              },
            ])
          : [{ label: 'Status', value: 'Sem inversores selecionados' }],
    },
    {
      icon: Wrench,
      title: 'Estrutura de Fixação',
      details: [
        { label: 'Tipo', value: sizing?.installation_type || sizing?.roof_type || 'N/A' },
        { label: 'Inclinação', value: sizing?.tilt ? `${sizing.tilt}°` : 'N/A' },
      ],
    },
  ]

  return (
    <div className="p-[15mm] space-y-8">
      <div
        className="proposal-section-title border-b-2 pb-4"
        style={{ borderColor: branding.primaryColor }}
      >
        <h2 className="text-3xl font-bold text-slate-800">Componentes do Sistema</h2>
      </div>
      <div className="space-y-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="proposal-no-break bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex gap-6 items-start"
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{
                backgroundColor: branding.primaryColor,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
              }}
            >
              <card.icon className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-slate-800 mb-3">{card.title}</h3>
              <div className="grid grid-cols-2 gap-3">
                {card.details.map((d, i) => (
                  <div key={i} className="text-sm">
                    <span className="text-slate-500">{d.label}: </span>
                    <span className="font-medium text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="proposal-table proposal-no-break overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead
            style={{
              backgroundColor: branding.primaryColor,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <tr className="text-white">
              <th className="px-6 py-3 text-left font-semibold">Equipamento</th>
              <th className="px-6 py-3 text-left font-semibold">Marca</th>
              <th className="px-6 py-3 text-left font-semibold">Modelo</th>
              <th className="px-6 py-3 text-left font-semibold">Potência</th>
              <th className="px-6 py-3 text-left font-semibold">Qtd.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr className="hover:bg-slate-50">
              <td className="px-6 py-3 font-medium">Módulo</td>
              <td className="px-6 py-3">{moduleRec?.brand || '-'}</td>
              <td className="px-6 py-3">{moduleRec?.name || '-'}</td>
              <td className="px-6 py-3">{moduleRec?.power || 0} W</td>
              <td className="px-6 py-3">{sizing?.module_qty || 0}</td>
            </tr>
            {inverterRecs.map((inv: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium">Inversor</td>
                <td className="px-6 py-3">{inv?.brand || '-'}</td>
                <td className="px-6 py-3">{inv?.name || '-'}</td>
                <td className="px-6 py-3">{inv?.power || 0} kW</td>
                <td className="px-6 py-3">{inv?.qty || 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
