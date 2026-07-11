import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'
import { Leaf, Sun, ShieldCheck, Tag, ArrowRight } from 'lucide-react'
import { BRL, type ProposalPageData } from './proposal-utils'

export function ProposalCoverModern({ data }: { data: ProposalPageData }) {
  const { company, branding, proposal, lead, sizing } = data
  const logoUrl = company?.logo
    ? pb.files.getURL(company, company.logo)
    : 'https://img.usecurling.com/i?q=solar%20energy&shape=fill&color=blue'

  const kwp = Number(sizing?.kit_power_kwp) || 0
  const moduleQty = sizing?.module_qty || 0
  const inverterCount = sizing?.inverters?.length || 0
  const discount = proposal?.discount_amount || 0
  const validityDate = proposal?.validity_date
    ? format(new Date(proposal.validity_date), 'dd/MM/yyyy')
    : '10 dias corridos'

  const metrics = [
    { value: `${kwp.toFixed(2)} kWp`, label: 'Potência', color: branding.primaryColor },
    { value: `${moduleQty} un.`, label: 'Módulos', color: branding.secondaryColor },
    {
      value: `${inverterCount}`,
      label: 'Inversores',
      color: branding.gradientColor || branding.primaryColor,
    },
  ]

  const badges = [
    { icon: Leaf, label: 'Sustentável' },
    { icon: Sun, label: 'Renovável' },
    { icon: ShieldCheck, label: 'Garantia' },
  ]

  return (
    <div className="proposal-no-break relative w-full h-[297mm] bg-white overflow-hidden text-slate-800 break-inside-avoid">
      <div
        className="absolute top-0 left-0 w-[3mm] h-full z-0"
        style={{ backgroundColor: branding.primaryColor }}
      />
      <svg
        className="absolute top-0 right-0 h-full w-[60mm] z-0"
        viewBox="0 0 60 297"
        preserveAspectRatio="none"
      >
        <path
          d="M60,0 L60,297 L20,297 C45,200 45,97 20,0 Z"
          fill={branding.primaryColor}
          opacity="0.06"
        />
        <path
          d="M60,0 L60,297 L40,297 C55,200 55,97 40,0 Z"
          fill={branding.secondaryColor}
          opacity="0.04"
        />
      </svg>

      <div className="relative z-10 flex flex-col h-[297mm] pl-[20mm] pr-[20mm] py-[15mm]">
        <div className="flex justify-between items-start">
          <img src={logoUrl} className="h-14 max-w-[45mm] object-contain" alt="Logo" />
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Proposta Nº
            </span>
            <p className="text-base font-black" style={{ color: branding.primaryColor }}>
              {proposal?.id?.slice(0, 8) || 'Rascunho'}
            </p>
          </div>
        </div>

        <div className="mt-[16mm]">
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-2">
            Sistema Fotovoltaico de Alta Performance
          </h2>
          <h1 className="text-[3rem] font-black uppercase leading-[0.95]">
            <span className="text-slate-800">Energia</span>
            <br />
            <span style={{ color: branding.primaryColor }}>Solar</span>
            <span className="text-slate-300"> Inteligente</span>
          </h1>
        </div>

        <div className="mt-[12mm] relative">
          <img
            src="https://img.usecurling.com/p/800/350?q=solar%20panels%20roof%20installation&color=blue"
            className="w-full h-[60mm] object-cover rounded-2xl shadow-xl"
            alt="Sistema Solar"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          />
          <div
            className="absolute bottom-[5mm] left-[5mm] bg-white px-[6mm] py-[3mm] rounded-xl shadow-lg border-l-[3mm]"
            style={{ borderColor: branding.primaryColor }}
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Proposta para
            </p>
            <p className="text-xl font-black text-slate-800">{lead?.name || 'Cliente'}</p>
          </div>
        </div>

        <div className="mt-[10mm] grid grid-cols-3 gap-[6mm]">
          {metrics.map((m) => (
            <div key={m.label} className="border-l-[2mm] pl-[3mm]" style={{ borderColor: m.color }}>
              <p className="text-xl font-black" style={{ color: m.color }}>
                {m.value}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{m.label}</p>
            </div>
          ))}
        </div>

        {discount > 0 && (
          <div
            className="mt-[8mm] flex items-center gap-[4mm] px-[5mm] py-[3mm] rounded-xl"
            style={{
              backgroundColor: branding.primaryColor + '0D',
              border: `1px dashed ${branding.primaryColor}`,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Oferta Especial</p>
              <p className="text-xs text-slate-500">
                Desconto de {BRL.format(discount)} aplicado nesta proposta
              </p>
            </div>
          </div>
        )}

        <div className="mt-[10mm] flex justify-center gap-[15mm]">
          {badges.map((b) => (
            <div key={b.label} className="flex flex-col items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-2 border-2"
                style={{
                  color: branding.primaryColor,
                  borderColor: branding.primaryColor + '40',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <b.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-600">{b.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto">
          <div
            className="rounded-2xl p-[6mm] text-white"
            style={{
              background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80">Pronto para economizar com energia solar?</p>
                <p className="text-lg font-bold mt-1">Aceite esta proposta e inicie seu projeto</p>
              </div>
              <div
                className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="mt-[4mm] text-center">
            <p className="text-sm font-bold text-slate-800">{company?.name || 'Sua Empresa'}</p>
            <p className="text-[10px] text-slate-400 mt-1">
              Emitido em {format(new Date(proposal?.created || Date.now()), 'dd/MM/yyyy')} • Válido
              até {validityDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
