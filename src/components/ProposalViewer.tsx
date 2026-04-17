import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'

export function ProposalViewer({ open, onOpenChange, proposal, negotiation }: any) {
  const [company, setCompany] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    if (open && negotiation?.company_id) {
      pb.collection('companies').getOne(negotiation.company_id).then(setCompany)
      pb.collection('proposal_settings')
        .getFirstListItem(`company_id = '${negotiation.company_id}'`)
        .then(setSettings)
        .catch(() => {})
    }
  }, [open, negotiation])

  const logoUrl = company?.logo
    ? pb.files.getURL(company, company.logo)
    : 'https://img.usecurling.com/i?q=solar%20energy&shape=fill&color=blue'

  const lead = negotiation?.expand?.lead_id || {}
  const sizing = negotiation?.sizing || {}

  const cons = Number(negotiation?.avg_consumption || 0)
  const chartData = [
    { name: 'Jan', consumo: Number(sizing.jan) || cons, geracao: cons * 1.15 },
    { name: 'Fev', consumo: Number(sizing.feb) || cons, geracao: cons * 1.12 },
    { name: 'Mar', consumo: Number(sizing.mar) || cons, geracao: cons * 1.1 },
    { name: 'Abr', consumo: Number(sizing.apr) || cons, geracao: cons * 1.08 },
    { name: 'Mai', consumo: Number(sizing.may) || cons, geracao: cons * 1.05 },
    { name: 'Jun', consumo: Number(sizing.jun) || cons, geracao: cons * 1.02 },
  ]

  const totalInv = proposal?.price || (sizing.totalPower ? sizing.totalPower * 3500 : 0)

  const pages = settings?.visible_pages || {
    cover: true,
    technical: true,
    charts: true,
    system: true,
    financial: true,
    warranty: true,
    terms: true,
  }
  const brand = settings?.branding || { primaryColor: '#2563eb', secondaryColor: '#1e40af' }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] overflow-y-auto p-0 border-none bg-zinc-100/50">
        <div className="bg-white mx-auto max-w-4xl min-h-full shadow-2xl flex flex-col print:shadow-none print:w-full print:max-w-full print:bg-white">
          {/* Page 1: Cover */}
          {pages.cover && (
            <div
              className="h-[29.7cm] flex flex-col justify-center items-center p-16 text-center relative overflow-hidden text-white page-break-after"
              style={{ backgroundColor: brand.primaryColor }}
            >
              <div className="absolute inset-0 opacity-20 bg-[url('https://img.usecurling.com/p/1200/800?q=solar%20panels%20roof&color=black')] bg-cover bg-center mix-blend-overlay"></div>
              <div className="relative z-10 w-full max-w-2xl bg-black/40 p-12 rounded-3xl backdrop-blur-sm border border-white/20 shadow-2xl">
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="h-28 mx-auto mb-12 object-contain filter drop-shadow-lg"
                />
                <h1 className="text-5xl font-bold mb-4 tracking-tight">Proposta Comercial</h1>
                <h2 className="text-2xl font-light text-blue-100 mb-12">
                  Sistema Fotovoltaico de Alta Performance
                </h2>

                <div className="text-left bg-white/10 p-8 rounded-xl mb-8 border border-white/10">
                  <p className="text-xl font-bold mb-2">{lead.name}</p>
                  <p className="text-sm text-slate-200">Documento: {lead.document || 'N/A'}</p>
                  <p className="text-sm text-slate-200">Data: {format(new Date(), 'dd/MM/yyyy')}</p>
                  <p className="text-sm text-slate-200">Proposta #: {proposal?.id || 'Rascunho'}</p>
                </div>
                <p className="text-sm text-slate-300">
                  Consultor Responsável:{' '}
                  <strong className="text-white">
                    {negotiation?.expand?.owner_id?.name || 'Equipe'}
                  </strong>
                </p>
              </div>
            </div>
          )}

          {/* Page 2: Technical Data */}
          {pages.technical && (
            <div className="p-16 space-y-12 page-break-after h-[29.7cm]">
              <div className="border-b-2 pb-4 mb-8" style={{ borderColor: brand.primaryColor }}>
                <h2 className="text-3xl font-bold text-slate-800">Dados do Cliente e Local</h2>
                <p className="text-slate-500">Informações técnicas de consumo e instalação</p>
              </div>
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Cliente
                    </h3>
                    <p className="text-lg font-medium text-slate-800">{lead.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Documento
                    </h3>
                    <p className="text-lg font-medium text-slate-800">
                      {lead.document || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Endereço de Instalação
                    </h3>
                    <p className="text-lg font-medium text-slate-800">
                      {negotiation?.address || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Concessionária
                    </h3>
                    <p className="text-lg font-medium text-slate-800">
                      {negotiation?.concessionaire || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Consumo Médio
                    </h3>
                    <p className="text-2xl font-bold" style={{ color: brand.primaryColor }}>
                      {cons} kWh/mês
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Page 3: Charts */}
          {pages.charts && (
            <div className="p-16 space-y-12 page-break-after h-[29.7cm]">
              <div className="border-b-2 pb-4 mb-8" style={{ borderColor: brand.primaryColor }}>
                <h2 className="text-3xl font-bold text-slate-800">Estudo de Geração</h2>
                <p className="text-slate-500">Projeção estimada de geração vs consumo atual</p>
              </div>
              <div className="h-96 w-full bg-white p-6 rounded-2xl border shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Bar
                      dataKey="consumo"
                      fill="#cbd5e1"
                      name="Consumo (kWh)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="geracao"
                      fill={brand.secondaryColor}
                      name="Geração (kWh)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Page 4: Proposed System */}
          {pages.system && (
            <div className="p-16 space-y-12 page-break-after h-[29.7cm]">
              <div className="border-b-2 pb-4 mb-8" style={{ borderColor: brand.primaryColor }}>
                <h2 className="text-3xl font-bold text-slate-800">O Sistema Proposto</h2>
                <p className="text-slate-500">Equipamentos e dimensionamento do gerador</p>
              </div>
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                  <h3 className="font-semibold text-xl text-slate-800 mb-6">Equipamentos</h3>
                  <ul className="space-y-4 text-slate-600">
                    <li className="flex justify-between border-b border-slate-200 pb-2">
                      <span>Módulos Solares:</span>{' '}
                      <span className="font-medium text-slate-800">
                        {sizing.adjustedModules || 0} un. ({sizing.modulePower || 0}W)
                      </span>
                    </li>
                    <li className="flex justify-between border-b border-slate-200 pb-2">
                      <span>Inversor:</span>{' '}
                      <span className="font-medium text-slate-800">
                        {sizing.selectedInverter || 'Não especificado'}
                      </span>
                    </li>
                    <li className="flex justify-between border-b border-slate-200 pb-2">
                      <span>Potência Total (kWp):</span>{' '}
                      <span className="font-bold" style={{ color: brand.primaryColor }}>
                        {sizing.totalPower?.toFixed(2) || 0} kWp
                      </span>
                    </li>
                  </ul>
                </div>
                <div
                  className="p-8 rounded-2xl text-white flex flex-col justify-center text-center shadow-lg relative overflow-hidden"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  <div className="relative z-10">
                    <p className="text-lg font-medium opacity-90 mb-2">Investimento Total</p>
                    <p className="text-5xl font-black mb-4 tracking-tight">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(totalInv)}
                    </p>
                    <p className="text-sm opacity-80 uppercase tracking-widest">
                      Projeto, Materiais e Instalação Inclusos
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Page 5: Financial Evaluation */}
          {pages.financial && (
            <div className="p-16 space-y-12 page-break-after h-[29.7cm]">
              <div className="border-b-2 pb-4 mb-8" style={{ borderColor: brand.primaryColor }}>
                <h2 className="text-3xl font-bold text-slate-800">Análise Financeira</h2>
                <p className="text-slate-500">Retorno sobre o investimento</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border shadow-sm p-8 rounded-2xl">
                  <p className="text-slate-500 text-sm font-semibold uppercase mb-2">
                    Economia Mensal Estimada
                  </p>
                  <p className="font-black text-4xl text-green-600">~R$ {Math.round(cons * 0.9)}</p>
                  <p className="text-sm text-slate-400 mt-2">
                    Redução de até 90% na fatura de energia.
                  </p>
                </div>
                <div className="bg-white border shadow-sm p-8 rounded-2xl">
                  <p className="text-slate-500 text-sm font-semibold uppercase mb-2">
                    Payback Estimado
                  </p>
                  <p className="font-black text-4xl text-slate-800">3.5 Anos</p>
                  <p className="text-sm text-slate-400 mt-2">
                    Tempo para o sistema se pagar sozinho.
                  </p>
                </div>
                <div
                  className="bg-white border shadow-sm p-8 rounded-2xl col-span-2 text-center"
                  style={{ backgroundColor: brand.primaryColor + '10' }}
                >
                  <p className="text-slate-600 text-sm font-semibold uppercase mb-2">
                    Economia Acumulada em 25 anos
                  </p>
                  <p className="font-black text-5xl" style={{ color: brand.primaryColor }}>
                    R$ {Math.round(cons * 0.9 * 12 * 25).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Page 6: Warranty & Schedule */}
          {pages.warranty && (
            <div className="p-16 space-y-12 page-break-after h-[29.7cm]">
              <div className="border-b-2 pb-4 mb-8" style={{ borderColor: brand.primaryColor }}>
                <h2 className="text-3xl font-bold text-slate-800">Garantias e Prazos</h2>
                <p className="text-slate-500">Segurança e transparência no projeto</p>
              </div>
              <div className="grid grid-cols-2 gap-12">
                <div>
                  <h3 className="font-bold text-xl mb-6 text-slate-800">Garantias</h3>
                  <ul className="space-y-4 text-slate-600 list-disc pl-5">
                    <li>
                      <strong className="text-slate-800">Módulos Solares:</strong> 12 anos contra
                      defeitos de fabricação.
                    </li>
                    <li>
                      <strong className="text-slate-800">Performance:</strong> 25 anos de eficiência
                      linear de 80%.
                    </li>
                    <li>
                      <strong className="text-slate-800">Inversor:</strong> 10 anos de garantia de
                      fábrica.
                    </li>
                    <li>
                      <strong className="text-slate-800">Instalação:</strong> 1 ano de garantia para
                      serviços prestados.
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-6 text-slate-800">Etapas do Projeto</h3>
                  <ul className="space-y-4 text-slate-600 list-none pl-0 border-l-2 border-slate-200 ml-2">
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-[-5px] before:top-2 before:w-2 before:h-2 before:bg-slate-400 before:rounded-full">
                      <strong className="text-slate-800">1. Assinatura:</strong> Aprovação do
                      contrato e financiamento.
                    </li>
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-[-5px] before:top-2 before:w-2 before:h-2 before:bg-slate-400 before:rounded-full">
                      <strong className="text-slate-800">2. Projeto:</strong> Elaboração e envio à
                      concessionária (15 dias).
                    </li>
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-[-5px] before:top-2 before:w-2 before:h-2 before:bg-slate-400 before:rounded-full">
                      <strong className="text-slate-800">3. Instalação:</strong> Execução da obra no
                      local (3 a 5 dias).
                    </li>
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-[-5px] before:top-2 before:w-2 before:h-2 before:bg-slate-400 before:rounded-full">
                      <strong className="text-slate-800">4. Vistoria:</strong> Aprovação final pela
                      concessionária e troca do medidor.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Page 7: Terms */}
          {pages.terms && (
            <div className="p-16 flex flex-col h-[29.7cm]">
              <div className="border-b-2 pb-4 mb-8" style={{ borderColor: brand.primaryColor }}>
                <h2 className="text-3xl font-bold text-slate-800">Termos e Condições</h2>
                <p className="text-slate-500">Condições comerciais da proposta</p>
              </div>
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 mb-8">
                <h3 className="font-bold text-lg mb-4 text-slate-800">Escopo do Fornecimento</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Esta proposta inclui todos os equipamentos, materiais complementares, estrutura de
                  fixação, frete, projeto de engenharia com emissão de ART, mão de obra de
                  instalação e homologação junto à concessionária de energia.
                </p>
                <h3 className="font-bold text-lg mb-4 text-slate-800">Validade</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Proposta válida por 10 dias corridos a partir da data de emissão. Sujeita a
                  alteração sem aviso prévio devido a flutuações cambiais.
                </p>
              </div>

              <div className="mt-auto pt-12 border-t text-center print:hidden flex flex-col items-center justify-center">
                <p className="text-slate-500 mb-6">Pronto para transformar o sol em economia?</p>
                <div className="flex gap-4">
                  <Button
                    onClick={() => window.print()}
                    className="px-8 shadow-lg"
                    style={{ backgroundColor: brand.primaryColor }}
                  >
                    Imprimir Proposta (PDF)
                  </Button>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
