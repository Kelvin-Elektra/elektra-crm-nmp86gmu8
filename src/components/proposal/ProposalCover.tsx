import { format } from 'date-fns'
import pb from '@/lib/pocketbase/client'
import type { ProposalPageData } from './proposal-utils'

export function ProposalCover({ data }: { data: ProposalPageData }) {
  const { company, branding, proposal, lead } = data
  const logoUrl = company?.logo
    ? pb.files.getURL(company, company.logo)
    : 'https://img.usecurling.com/i?q=solar%20energy&shape=fill&color=blue'

  return (
    <div
      className="relative min-h-[100vh] flex flex-col items-center justify-center text-white overflow-hidden break-inside-avoid p-8"
      style={{
        background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.gradientColor || branding.secondaryColor})`,
      }}
    >
      <div
        className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay"
        style={{
          backgroundImage: `url('https://img.usecurling.com/p/1200/800?q=solar%20panels%20roof%20installation&color=black')`,
        }}
      />
      <div className="relative z-10 w-full max-w-2xl bg-black/40 p-10 md:p-12 rounded-3xl backdrop-blur-sm border border-white/20 shadow-2xl">
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
          <p className="text-2xl font-bold text-center">{lead.name || 'Cliente'}</p>
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
