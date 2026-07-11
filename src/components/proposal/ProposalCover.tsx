import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'
import { Leaf, Sun, ShieldCheck } from 'lucide-react'
import type { ProposalPageData } from './proposal-utils'

export function ProposalCover({ data }: { data: ProposalPageData }) {
  const { template } = data

  if (template === 'elegant') {
    return <ProposalCoverElegant data={data} />
  }

  return <ProposalCoverModern data={data} />
}

function ProposalCoverModern({ data }: { data: ProposalPageData }) {
  const { company, branding, proposal, lead } = data
  const logoUrl = company?.logo
    ? pb.files.getURL(company, company.logo)
    : 'https://img.usecurling.com/i?q=solar%20energy&shape=fill&color=blue'

  return (
    <div className="proposal-no-break relative w-full h-[297mm] bg-white overflow-hidden text-slate-800 break-inside-avoid">
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '10mm 10mm',
        }}
      />
      <svg
        className="absolute top-0 left-0 h-full w-[120mm] z-0"
        viewBox="0 0 120 297"
        preserveAspectRatio="none"
      >
        <path d="M0,0 H50 C120,100 120,197 50,297 H0 Z" fill={branding.secondaryColor} />
        <path d="M0,0 H25 C80,100 80,197 25,297 H0 Z" fill={branding.primaryColor} />
      </svg>

      <div className="relative z-10 flex flex-col h-[297mm] pl-[25mm] pr-[15mm] py-[15mm]">
        <div className="flex justify-between items-start">
          <img
            src={logoUrl}
            className="h-16 max-w-[50mm] object-contain drop-shadow-md"
            alt="Logo"
          />
          <div className="flex gap-2 text-slate-400">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200" />
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200" />
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200" />
          </div>
        </div>

        <div className="mt-[20mm] text-center ml-[10mm]">
          <h2 className="text-2xl font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
            A Melhor
          </h2>
          <h1
            className="text-[3.5rem] font-black uppercase leading-[1]"
            style={{ color: branding.secondaryColor }}
          >
            Energia
            <br />
            <span style={{ color: branding.primaryColor }}>Solar</span>
          </h1>
          <h3 className="text-lg uppercase tracking-[0.2em] text-slate-400 mt-4">
            Para sua residência
          </h3>
        </div>

        <div className="relative mt-[15mm] flex justify-center ml-[15mm]">
          <img
            src="https://img.usecurling.com/p/800/600?q=solar%20panels%20roof"
            className="w-[150mm] h-[85mm] object-cover rounded-2xl shadow-2xl border-4 border-white"
            alt="Solar Panels"
          />
          <div
            className="absolute top-[10mm] -left-[10mm] bg-white px-4 py-3 rounded-xl shadow-xl border-l-8"
            style={{ borderColor: branding.primaryColor }}
          >
            <p className="text-sm font-bold text-slate-500">Proposta para</p>
            <p className="text-2xl font-black" style={{ color: branding.secondaryColor }}>
              {lead?.name?.split(' ')[0] || 'Cliente'}
            </p>
          </div>
        </div>

        <div className="mt-[15mm] flex justify-center gap-[15mm] ml-[15mm]">
          {[
            { icon: Leaf, label: 'Sustentável' },
            { icon: Sun, label: 'Renovável' },
            { icon: ShieldCheck, label: 'Garantia' },
          ].map((b) => (
            <div key={b.label} className="flex flex-col items-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3 shadow-md bg-white border"
                style={{
                  color: branding.primaryColor,
                  borderColor: branding.primaryColor + '40',
                }}
              >
                <b.icon className="w-7 h-7" />
              </div>
              <span className="text-sm font-bold text-slate-600">{b.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto text-center ml-[15mm]">
          <div
            className="inline-block px-8 py-3 rounded-full text-white font-bold text-lg mb-6 shadow-lg"
            style={{ backgroundColor: branding.primaryColor }}
          >
            Proposta: {proposal?.id?.slice(0, 8) || 'Rascunho'}
          </div>
          <p className="text-xl font-bold text-slate-800">{company?.name || 'Sua Empresa'}</p>
          <p className="text-md text-slate-500 mt-1">
            Emitido em: {format(new Date(proposal?.created || Date.now()), 'dd/MM/yyyy')}
          </p>
        </div>
      </div>
    </div>
  )
}

function ProposalCoverElegant({ data }: { data: ProposalPageData }) {
  const { company, branding, proposal, lead } = data
  const logoUrl = company?.logo
    ? pb.files.getURL(company, company.logo)
    : 'https://img.usecurling.com/i?q=solar%20energy&shape=fill&color=blue'

  return (
    <div
      className="proposal-no-break relative w-full h-[297mm] flex flex-col items-center justify-center text-white overflow-hidden break-inside-avoid p-[10mm]"
      style={{
        background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.gradientColor || branding.secondaryColor})`,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <div
        className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay print:opacity-10"
        style={{
          backgroundImage: `url('https://img.usecurling.com/p/1200/800?q=solar%20panels%20roof%20installation&color=black')`,
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      />
      <div className="relative z-10 w-full max-w-2xl bg-black/40 p-[12mm] rounded-3xl backdrop-blur-sm border border-white/20 shadow-2xl">
        <img
          src={logoUrl}
          alt="Logo"
          className="h-20 md:h-24 mx-auto mb-8 object-contain drop-shadow-lg"
        />
        <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight text-center">
          Proposta Comercial
        </h1>
        <h2 className="text-lg md:text-xl font-light text-blue-100 mb-8 text-center">
          Sistema Fotovoltaico de Alta Performance
        </h2>
        <div className="bg-white/10 p-6 md:p-8 rounded-xl border border-white/10 space-y-4">
          <p className="text-2xl font-bold text-center">{lead?.name || 'Cliente'}</p>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-200">
            <div>
              <span className="opacity-60 block">Proposta Nº</span>
              <p className="font-medium">{proposal?.id?.slice(0, 8) || 'Rascunho'}</p>
            </div>
            <div>
              <span className="opacity-60 block">Data de Emissão</span>
              <p className="font-medium">
                {format(new Date(proposal?.created || Date.now()), 'dd/MM/yyyy')}
              </p>
            </div>
            <div>
              <span className="opacity-60 block">Válido até</span>
              <p className="font-medium">
                {proposal?.validity_date
                  ? format(new Date(proposal.validity_date), 'dd/MM/yyyy')
                  : '10 dias corridos'}
              </p>
            </div>
            <div>
              <span className="opacity-60 block">Empresa</span>
              <p className="font-medium">{company?.name || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
