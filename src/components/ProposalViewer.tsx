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
  const lead = negotiation?.expand?.lead_id || {}
  const sizing = negotiation?.sizing || {}

  const cons = negotiation?.avg_consumption || 0
  const chartData = [
    { name: 'Jan', consumo: sizing.jan || cons, geracao: cons * 1.15 },
    { name: 'Fev', consumo: sizing.feb || cons, geracao: cons * 1.12 },
    { name: 'Mar', consumo: sizing.mar || cons, geracao: cons * 1.1 },
    { name: 'Abr', consumo: sizing.apr || cons, geracao: cons * 1.08 },
    { name: 'Mai', consumo: sizing.may || cons, geracao: cons * 1.05 },
    { name: 'Jun', consumo: sizing.jun || cons, geracao: cons * 1.02 },
  ]

  const totalInv = proposal?.price || (sizing.totalPower ? sizing.totalPower * 3500 : 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] overflow-y-auto p-0 border-none bg-zinc-100/50">
        <div className="bg-white mx-auto max-w-4xl min-h-full shadow-2xl flex flex-col print:shadow-none print:w-full print:max-w-full">
          {/* Page 1: Cover */}
          <div className="h-screen flex flex-col justify-center items-center p-16 text-center relative overflow-hidden bg-slate-900 text-white page-break-after">
            <div className="absolute inset-0 opacity-30 bg-[url('https://img.usecurling.com/p/1200/800?q=solar%20panels%20roof&color=blue')] bg-cover bg-center"></div>
            <div className="relative z-10 w-full max-w-2xl bg-black/50 p-12 rounded-3xl backdrop-blur-md border border-white/10">
              <img src={logoUrl} alt="Company Logo" className="h-24 mx-auto mb-12 object-contain" />
              <h1 className="text-5xl font-bold mb-4">Proposta Comercial</h1>
              <h2 className="text-2xl font-light text-blue-300 mb-12">
                Sistema Fotovoltaico de Alta Performance
              </h2>

              <div className="text-left bg-white/10 p-6 rounded-xl mb-8">
                <p className="text-lg font-semibold">{lead.name}</p>
                <p className="text-sm text-slate-300">Documento: {lead.document || 'N/A'}</p>
                <p className="text-sm text-slate-300">Data: {format(new Date(), 'dd/MM/yyyy')}</p>
                <p className="text-sm text-slate-300">Proposta #: {proposal?.id || 'Rascunho'}</p>
              </div>
              <p className="text-sm text-slate-400">
                Consultor Responsável: {negotiation?.expand?.owner_id?.name || 'Equipe'}
              </p>
            </div>
          </div>

          {/* Page 2: Technical Data & Performance */}
          <div className="p-16 space-y-12 page-break-after min-h-screen">
            <div className="border-b-2 border-primary pb-4 mb-8">
              <h2 className="text-3xl font-bold text-slate-800">Dados do Projeto</h2>
              <p className="text-slate-500">Análise de consumo e dimensionamento</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="font-semibold text-lg text-slate-700 mb-4">Local de Instalação</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong className="text-slate-500">Endereço:</strong>{' '}
                    {negotiation?.address || 'Não informado'}
                  </p>
                  <p>
                    <strong className="text-slate-500">Concessionária:</strong>{' '}
                    {negotiation?.concessionaire || 'Não informado'}
                  </p>
                  <p>
                    <strong className="text-slate-500">Consumo Médio:</strong> {cons} kWh/mês
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="font-semibold text-lg text-slate-700 mb-4">O Sistema Proposto</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong className="text-slate-500">Potência Total:</strong>{' '}
                    {sizing.totalPower?.toFixed(2) || 0} kWp
                  </p>
                  <p>
                    <strong className="text-slate-500">Módulos:</strong>{' '}
                    {sizing.adjustedModules || 0} unidades
                  </p>
                  <p>
                    <strong className="text-slate-500">Inversor(es):</strong>{' '}
                    {sizing.selectedInverter || 'Dimensionado'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <h3 className="font-semibold text-xl text-slate-800 mb-6">
                Projeção de Geração vs Consumo
              </h3>
              <div className="h-72 w-full bg-white p-4 rounded-xl border">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="consumo"
                      fill="#94a3b8"
                      name="Consumo (kWh)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="geracao"
                      fill="#3b82f6"
                      name="Geração (kWh)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Page 3: Financials & Terms */}
          <div className="p-16 bg-slate-50 flex-1 flex flex-col min-h-screen">
            <div className="border-b-2 border-primary pb-4 mb-8">
              <h2 className="text-3xl font-bold text-slate-800">Análise Financeira</h2>
              <p className="text-slate-500">Investimento e Retorno</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 mb-12 text-center">
              <p className="text-lg text-slate-500 font-medium mb-2">
                Investimento Total do Projeto
              </p>
              <p className="text-5xl font-black text-primary mb-6">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  totalInv,
                )}
              </p>
              <div className="grid grid-cols-3 gap-4 border-t pt-6">
                <div>
                  <p className="text-sm text-slate-400">Economia Estimada (Mês)</p>
                  <p className="text-xl font-bold text-green-600">~R$ {Math.round(cons * 0.95)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Payback Estimado</p>
                  <p className="text-xl font-bold text-slate-700">3.5 Anos</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Vida Útil</p>
                  <p className="text-xl font-bold text-slate-700">25+ Anos</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-auto">
              <div>
                <h3 className="font-bold text-lg mb-4 text-slate-800">Garantias Inclusas</h3>
                <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
                  <li>Módulos Solares: 12 anos contra defeitos</li>
                  <li>Módulos Solares: 25 anos de performance (80%)</li>
                  <li>Inversor: 10 anos de garantia de fábrica</li>
                  <li>Serviço de Instalação: 1 ano</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-4 text-slate-800">Termos e Condições</h3>
                <ul className="space-y-3 text-sm text-slate-600 list-disc pl-5">
                  <li>Validade da proposta: 10 dias úteis</li>
                  <li>Formas de Pagamento: À vista, Financiamento Bancário ou Cartão de Crédito</li>
                  <li>Incluso projeto elétrico e homologação junto à concessionária</li>
                </ul>
              </div>
            </div>

            <div className="mt-16 pt-8 border-t text-center print:hidden">
              <Button onClick={() => window.print()} className="w-full sm:w-auto px-8">
                Imprimir PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
