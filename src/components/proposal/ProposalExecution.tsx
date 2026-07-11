import {
  ClipboardCheck,
  FileCheck,
  Hammer,
  Plug,
  Activity,
  ShieldCheck,
  LayoutGrid,
  Wrench,
} from 'lucide-react'
import type { ProposalPageData } from './proposal-utils'

export function ProposalExecution({ data }: { data: ProposalPageData }) {
  const { branding, inverterRecs } = data

  const steps = [
    {
      icon: ClipboardCheck,
      title: 'Levantamento Técnico',
      desc: 'Visita ao local para medição e avaliação estrutural.',
    },
    {
      icon: FileCheck,
      title: 'Aprovação do Projeto',
      desc: 'Elaboração e aprovação do projeto executivo.',
    },
    { icon: Hammer, title: 'Instalação', desc: 'Montagem da estrutura, módulos e inversores.' },
    {
      icon: Plug,
      title: 'Conexão com Concessionária',
      desc: 'Homologação do sistema junto à concessionária.',
    },
    {
      icon: Activity,
      title: 'Monitoramento',
      desc: 'Ativação do sistema de monitoramento remoto.',
    },
  ]

  const warranties = [
    {
      icon: LayoutGrid,
      title: 'Módulos',
      years: '12 anos',
      desc: 'Garantia contra defeitos de fabricação',
    },
    {
      icon: ShieldCheck,
      title: 'Performance',
      years: '25 anos',
      desc: 'Garantia de eficiência linear',
    },
    {
      icon: Wrench,
      title: 'Inversor',
      years: inverterRecs[0]?.warranty || '5 anos',
      desc: 'Garantia do fabricante',
    },
    { icon: Hammer, title: 'Mão de Obra', years: '5 anos', desc: 'Garantia de instalação' },
  ]

  return (
    <div className="p-8 md:p-16 space-y-12">
      <div className="space-y-8">
        <div
          className="proposal-section-title border-b-2 pb-4"
          style={{ borderColor: branding.primaryColor }}
        >
          <h2 className="text-3xl font-bold text-slate-800">Cronograma de Execução</h2>
        </div>
        <div className="relative pl-8">
          <div
            className="absolute left-3 top-2 bottom-2 w-0.5"
            style={{ backgroundColor: branding.primaryColor + '40' }}
          />
          {steps.map((step, i) => (
            <div key={i} className="proposal-timeline-item relative pb-8 last:pb-0">
              <div
                className="absolute -left-[22px] top-1 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md z-10"
                style={{
                  backgroundColor: branding.primaryColor,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <step.icon className="w-4 h-4" />
              </div>
              <div className="ml-4">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{
                      backgroundColor: branding.secondaryColor,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  >
                    Etapa {i + 1}
                  </span>
                  <h3 className="font-semibold text-lg text-slate-800">{step.title}</h3>
                </div>
                <p className="text-sm text-slate-500 mt-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <div
          className="proposal-section-title border-b-2 pb-4"
          style={{ borderColor: branding.primaryColor }}
        >
          <h2 className="text-3xl font-bold text-slate-800">Garantias</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warranties.map((w) => (
            <div
              key={w.title}
              className="proposal-warranty-card bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{
                  backgroundColor: branding.primaryColor,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <w.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-semibold text-slate-800">{w.title}</h3>
                  <span className="text-2xl font-black" style={{ color: branding.primaryColor }}>
                    {w.years}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{w.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
