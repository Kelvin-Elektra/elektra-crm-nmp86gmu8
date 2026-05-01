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

  const totalInv =
    proposal?.total_value || proposal?.price || (sizing.totalPower ? sizing.totalPower * 3500 : 0)

  const pagesData = settings?.visible_pages || {}
  let orderedPages: any[] = []
  if (Array.isArray(pagesData)) {
    orderedPages = pagesData
  } else {
    orderedPages = [
      { id: 'cover', visible: pagesData.cover ?? true },
      { id: 'facade', visible: pagesData.facade ?? true },
      { id: 'technical', visible: pagesData.technical ?? true },
      { id: 'charts', visible: pagesData.charts ?? true },
      { id: 'system', visible: pagesData.system ?? true },
      { id: 'financial', visible: pagesData.financial ?? true },
      { id: 'warranty', visible: pagesData.warranty ?? true },
      { id: 'schedule', visible: pagesData.schedule ?? true },
      { id: 'terms', visible: pagesData.terms ?? true },
    ]
  }

  const brand = settings?.branding || {
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    gradientColor: '#3b82f6',
  }

  const PageSections: Record<string, React.ReactNode> = {
    cover: (
      <div
        className="flex flex-col justify-center items-center p-16 text-center relative overflow-hidden text-white min-h-[70vh] mb-12 break-inside-avoid print:mb-0 print:min-h-[100vh]"
        style={{
          background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.gradientColor || brand.secondaryColor})`,
        }}
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
    ),
    facade: (
      <div className="p-10 md:p-16 space-y-12 mb-12 break-inside-avoid print:mb-8">
        <div className="border-b-2 pb-4 mb-8" style={{ borderColor: brand.primaryColor }}>
          <h2 className="text-3xl font-bold text-slate-800">Local de Instalação</h2>
          <p className="text-slate-500">Visão da fachada e área de cobertura</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-200">
            <img
              src="https://img.usecurling.com/p/800/450?q=house%20roof%20solar%20panels&color=black"
              alt="Fachada"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    ),
    technical: (
      <div className="p-10 md:p-16 space-y-12 mb-12 break-inside-avoid print:mb-8">
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
    ),
    charts: (
      <div className="p-10 md:p-16 space-y-12 mb-12 break-inside-avoid print:mb-8">
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
              <Bar dataKey="consumo" fill="#cbd5e1" name="Consumo (kWh)" radius={[4, 4, 0, 0]} />
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
    ),
    system: (
      <div className="p-10 md:p-16 space-y-12 mb-12 break-inside-avoid print:mb-8">
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
    ),
    financial: (
      <div className="p-10 md:p-16 space-y-12 mb-12 break-inside-avoid print:mb-8">
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
            <p className="text-sm text-slate-400 mt-2">Redução de até 90% na fatura de energia.</p>
          </div>
          <div className="bg-white border shadow-sm p-8 rounded-2xl">
            <p className="text-slate-500 text-sm font-semibold uppercase mb-2">Payback Estimado</p>
            <p className="font-black text-4xl text-slate-800">3.5 Anos</p>
            <p className="text-sm text-slate-400 mt-2">Tempo para o sistema se pagar sozinho.</p>
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
    ),
    warranty: (
      <div className="p-10 md:p-16 space-y-12 mb-12 break-inside-avoid print:mb-8">
        <div className="border-b-2 pb-4 mb-8" style={{ borderColor: brand.primaryColor }}>
          <h2 className="text-3xl font-bold text-slate-800">Garantias</h2>
          <p className="text-slate-500">Segurança e transparência no projeto</p>
        </div>
        <div className="max-w-2xl">
          <ul className="space-y-6 text-slate-600 list-none pl-0">
            <li className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: brand.primaryColor }}
              >
                12
              </div>
              <div>
                <strong className="text-slate-800 text-lg block">Anos - Módulos Solares</strong>
                Garantia contra defeitos de fabricação dos painéis solares.
              </div>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: brand.secondaryColor }}
              >
                25
              </div>
              <div>
                <strong className="text-slate-800 text-lg block">Anos - Performance</strong>
                Garantia de eficiência linear de geração de energia mínima de 80%.
              </div>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 bg-slate-400">
                10
              </div>
              <div>
                <strong className="text-slate-800 text-lg block">Anos - Inversor</strong>
                Garantia de fábrica contra defeitos no equipamento conversor.
              </div>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 bg-slate-300">
                1
              </div>
              <div>
                <strong className="text-slate-800 text-lg block">Ano - Instalação</strong>
                Garantia completa para os serviços prestados pela nossa equipe.
              </div>
            </li>
          </ul>
        </div>
      </div>
    ),
    schedule: (
      <div className="p-10 md:p-16 space-y-12 mb-12 break-inside-avoid print:mb-8">
        <div className="border-b-2 pb-4 mb-8" style={{ borderColor: brand.primaryColor }}>
          <h2 className="text-3xl font-bold text-slate-800">Cronograma de Execução</h2>
          <p className="text-slate-500">Próximos passos após o fechamento</p>
        </div>
        <div className="max-w-2xl mx-auto py-8">
          <ul
            className="space-y-10 text-slate-600 list-none pl-0 border-l-4 ml-6"
            style={{ borderColor: brand.primaryColor }}
          >
            <li className="relative pl-10">
              <div
                className="absolute left-[-14px] top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm"
                style={{ backgroundColor: brand.secondaryColor }}
              ></div>
              <strong className="text-slate-800 text-xl block mb-2">
                1. Assinatura do Contrato
              </strong>
              Aprovação comercial e validação de financiamento (se aplicável).
            </li>
            <li className="relative pl-10">
              <div
                className="absolute left-[-14px] top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm"
                style={{ backgroundColor: brand.secondaryColor }}
              ></div>
              <strong className="text-slate-800 text-xl block mb-2">
                2. Visita Técnica & Projeto
              </strong>
              Levantamento detalhado no local e envio do projeto à concessionária para aprovação.
            </li>
            <li className="relative pl-10">
              <div
                className="absolute left-[-14px] top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm"
                style={{ backgroundColor: brand.secondaryColor }}
              ></div>
              <strong className="text-slate-800 text-xl block mb-2">3. Entrega & Instalação</strong>
              Recebimento dos equipamentos e execução da obra no local por nossa equipe
              especializada.
            </li>
            <li className="relative pl-10">
              <div
                className="absolute left-[-14px] top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm"
                style={{ backgroundColor: brand.secondaryColor }}
              ></div>
              <strong className="text-slate-800 text-xl block mb-2">4. Vistoria & Ativação</strong>
              Aprovação final pela concessionária e troca do medidor. Seu sistema já está gerando
              economia!
            </li>
          </ul>
        </div>
      </div>
    ),
    terms: (
      <div className="p-10 md:p-16 flex flex-col mb-12 break-inside-avoid print:mb-8">
        <div className="border-b-2 pb-4 mb-8" style={{ borderColor: brand.primaryColor }}>
          <h2 className="text-3xl font-bold text-slate-800">Termos e Condições</h2>
          <p className="text-slate-500">Condições comerciais da proposta</p>
        </div>
        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 mb-8 space-y-6">
          <div>
            <h3 className="font-bold text-lg mb-2 text-slate-800">Escopo do Fornecimento</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Esta proposta inclui todos os equipamentos, materiais complementares, estrutura de
              fixação, frete, projeto de engenharia com emissão de ART, mão de obra de instalação e
              homologação junto à concessionária de energia.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2 text-slate-800">Validade da Proposta</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {proposal?.validity_date
                ? `Válida até ${format(new Date(proposal.validity_date), 'dd/MM/yyyy')}`
                : '10 dias corridos a partir da data de emissão'}
              . Sujeita a alteração sem aviso prévio devido a flutuações cambiais.
            </p>
          </div>
          {proposal?.payment_terms && (
            <div>
              <h3 className="font-bold text-lg mb-2 text-slate-800">Condições de Pagamento</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{proposal.payment_terms}</p>
            </div>
          )}
          {proposal?.notes && (
            <div>
              <h3 className="font-bold text-lg mb-2 text-slate-800">Observações</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{proposal.notes}</p>
            </div>
          )}
        </div>
      </div>
    ),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] overflow-y-auto p-0 border-none bg-zinc-100/50 print:h-auto print:overflow-visible flex flex-col">
        <div className="bg-white mx-auto max-w-4xl shadow-2xl flex-1 w-full print:shadow-none print:w-full print:max-w-full print:bg-white print:m-0 print:block flex flex-col">
          {orderedPages.map((page) => {
            if (!page.visible) return null
            return <div key={page.id}>{PageSections[page.id]}</div>
          })}

          <div className="mt-auto p-8 border-t text-center print:hidden flex flex-col items-center justify-center bg-muted/20">
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
      </DialogContent>
    </Dialog>
  )
}
