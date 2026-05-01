import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'

export function ProposalViewer({ open, onOpenChange, proposal, negotiation }: any) {
  const [company, setCompany] = useState<any>(null)

  useEffect(() => {
    if (open && negotiation?.company_id) {
      pb.collection('companies').getOne(negotiation.company_id).then(setCompany)
    }
  }, [open, negotiation])

  const logoUrl = company?.logo
    ? pb.files.getURL(company, company.logo)
    : 'https://img.usecurling.com/i?q=solar%20energy&shape=fill&color=blue'

  let snapshot: any = {}
  try {
    snapshot =
      typeof proposal?.kit_details === 'string'
        ? JSON.parse(proposal.kit_details)
        : proposal?.kit_details || {}
  } catch {
    /* intentionally ignored */
  }

  const sizing = snapshot.sizing || negotiation?.sizing || {}
  const settingsSnapshot = snapshot.settings || {}

  const lead = negotiation?.expand?.lead_id || {}
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

  let pagesLayout = settingsSnapshot.pages_layout || []

  if (!pagesLayout || pagesLayout.length === 0) {
    const pagesData = settingsSnapshot.visible_pages || {}
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
    pagesLayout = orderedPages
      .filter((p) => p.visible)
      .map((p, i) => ({ id: `page-${i}`, elements: [p.id] }))
  }

  const brand = settingsSnapshot.branding || {
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    gradientColor: '#3b82f6',
  }
  const template = settingsSnapshot.template || 'modern'

  const getTemplateClasses = () => {
    switch (template) {
      case 'elegant':
        return 'font-serif'
      case 'compact':
        return 'text-sm'
      case 'corporate':
        return 'font-sans tracking-tight'
      default:
        return 'font-sans'
    }
  }

  const PageSections: Record<string, React.ReactNode> = {
    cover: (
      <div
        className="flex flex-col justify-center items-center p-16 text-center relative overflow-hidden text-white min-h-[70vh] break-inside-avoid print:mb-0 print:min-h-[100vh]"
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
            <p className="text-sm text-slate-200">
              Data: {format(new Date(proposal?.created || Date.now()), 'dd/MM/yyyy')}
            </p>
            <p className="text-sm text-slate-200">Proposta #: {proposal?.id || 'Rascunho'}</p>
          </div>
        </div>
      </div>
    ),
    facade: (
      <div className="p-10 md:p-16 space-y-12">
        <div className="border-b-2 pb-4" style={{ borderColor: brand.primaryColor }}>
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
      <div className="p-10 md:p-16 space-y-8">
        <div className="border-b-2 pb-4" style={{ borderColor: brand.primaryColor }}>
          <h2 className="text-3xl font-bold text-slate-800">Dados do Cliente</h2>
        </div>
        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase">Cliente</h3>
              <p className="text-lg font-medium">{lead.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase">Documento</h3>
              <p className="text-lg font-medium">{lead.document || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase">Endereço</h3>
              <p className="text-lg font-medium">{negotiation?.address || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase">Consumo Médio</h3>
              <p className="text-2xl font-bold" style={{ color: brand.primaryColor }}>
                {cons} kWh/mês
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    charts: (
      <div className="p-10 md:p-16 space-y-8">
        <div className="border-b-2 pb-4" style={{ borderColor: brand.primaryColor }}>
          <h2 className="text-3xl font-bold text-slate-800">Estudo de Geração</h2>
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
      <div className="p-10 md:p-16 space-y-8">
        <div className="border-b-2 pb-4" style={{ borderColor: brand.primaryColor }}>
          <h2 className="text-3xl font-bold text-slate-800">O Sistema Proposto</h2>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
            <h3 className="font-semibold text-xl text-slate-800 mb-6">Equipamentos</h3>
            <ul className="space-y-4 text-slate-600">
              <li className="flex justify-between border-b pb-2">
                <span>Módulos:</span>{' '}
                <span className="font-medium">{sizing.module_qty || 0} un.</span>
              </li>
              <li className="flex justify-between border-b pb-2">
                <span>Potência:</span>{' '}
                <span className="font-bold" style={{ color: brand.primaryColor }}>
                  {sizing.kit_power_kwp?.toFixed(2) || 0} kWp
                </span>
              </li>
            </ul>
          </div>
          <div
            className="p-8 rounded-2xl text-white flex flex-col justify-center text-center shadow-lg relative"
            style={{ backgroundColor: brand.primaryColor }}
          >
            <p className="text-lg font-medium opacity-90 mb-2">Investimento Total</p>
            <p className="text-5xl font-black mb-4">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                totalInv,
              )}
            </p>
          </div>
        </div>
      </div>
    ),
    financial: (
      <div className="p-10 md:p-16 space-y-8">
        <div className="border-b-2 pb-4" style={{ borderColor: brand.primaryColor }}>
          <h2 className="text-3xl font-bold text-slate-800">Análise Financeira</h2>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border shadow-sm p-8 rounded-2xl">
            <p className="text-slate-500 text-sm font-semibold uppercase mb-2">Economia Mensal</p>
            <p className="font-black text-4xl text-green-600">~R$ {Math.round(cons * 0.9)}</p>
          </div>
          <div className="bg-white border shadow-sm p-8 rounded-2xl">
            <p className="text-slate-500 text-sm font-semibold uppercase mb-2">Payback Estimado</p>
            <p className="font-black text-4xl text-slate-800">3.5 Anos</p>
          </div>
        </div>
      </div>
    ),
    warranty: (
      <div className="p-10 md:p-16 space-y-8">
        <div className="border-b-2 pb-4" style={{ borderColor: brand.primaryColor }}>
          <h2 className="text-3xl font-bold text-slate-800">Garantias</h2>
        </div>
        <ul className="space-y-6 text-slate-600 list-none pl-0">
          <li className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-slate-800 shrink-0">
              12
            </div>
            <div>
              <strong className="block text-lg">Anos - Módulos</strong>Garantia contra defeitos de
              fabricação.
            </div>
          </li>
          <li className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-slate-600 shrink-0">
              25
            </div>
            <div>
              <strong className="block text-lg">Anos - Performance</strong>Garantia de eficiência
              linear.
            </div>
          </li>
        </ul>
      </div>
    ),
    schedule: (
      <div className="p-10 md:p-16 space-y-8">
        <div className="border-b-2 pb-4" style={{ borderColor: brand.primaryColor }}>
          <h2 className="text-3xl font-bold text-slate-800">Cronograma</h2>
        </div>
        <ul className="space-y-6 pl-4 border-l-4 ml-2" style={{ borderColor: brand.primaryColor }}>
          <li className="pl-6 relative">
            <div className="absolute -left-[14px] top-1 w-6 h-6 rounded-full border-4 border-white bg-slate-800"></div>
            <strong>1. Assinatura do Contrato</strong>
          </li>
          <li className="pl-6 relative">
            <div className="absolute -left-[14px] top-1 w-6 h-6 rounded-full border-4 border-white bg-slate-800"></div>
            <strong>2. Visita Técnica & Projeto</strong>
          </li>
          <li className="pl-6 relative">
            <div className="absolute -left-[14px] top-1 w-6 h-6 rounded-full border-4 border-white bg-slate-800"></div>
            <strong>3. Instalação</strong>
          </li>
        </ul>
      </div>
    ),
    terms: (
      <div className="p-10 md:p-16 space-y-8">
        <div className="border-b-2 pb-4" style={{ borderColor: brand.primaryColor }}>
          <h2 className="text-3xl font-bold text-slate-800">Termos e Condições</h2>
        </div>
        <div className="bg-slate-50 p-8 rounded-2xl border space-y-6">
          <div>
            <h3 className="font-bold text-lg mb-2">Escopo do Fornecimento</h3>
            <p className="text-sm text-slate-600">
              Inclui projeto, materiais, mão de obra e homologação.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">Validade da Proposta</h3>
            <p className="text-sm text-slate-600">
              {proposal?.validity_date
                ? format(new Date(proposal.validity_date), 'dd/MM/yyyy')
                : '10 dias corridos'}
            </p>
          </div>
          {proposal?.payment_terms && (
            <div>
              <h3 className="font-bold text-lg mb-2">Condições de Pagamento</h3>
              <p className="text-sm text-slate-600">{proposal.payment_terms}</p>
            </div>
          )}
        </div>
      </div>
    ),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] overflow-y-auto p-0 border-none bg-zinc-100/50 print:h-auto print:overflow-visible flex flex-col">
        <div
          className={`bg-white mx-auto max-w-4xl shadow-2xl flex-1 w-full print:shadow-none print:w-full print:max-w-full print:bg-white print:m-0 print:block flex flex-col ${getTemplateClasses()}`}
        >
          {pagesLayout.map((page: any, pIdx: number) => (
            <div
              key={page.id}
              className="min-h-[100vh] break-inside-avoid print:mb-0 pb-12 flex flex-col border-b last:border-b-0 border-dashed border-slate-200 print:border-none"
            >
              {page.elements.map((elId: string) => (
                <div key={elId} className="w-full">
                  {PageSections[elId] || (
                    <div className="p-10 text-red-500">Elemento Desconhecido: {elId}</div>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div className="mt-auto p-8 border-t text-center print:hidden flex flex-col items-center justify-center bg-muted/20">
            <p className="text-slate-500 mb-6">Pronto para imprimir?</p>
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
