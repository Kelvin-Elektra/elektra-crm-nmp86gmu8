import { useState } from 'react'
import { Receipt, TrendingUp, ChevronDown, Leaf, Calendar, AlertTriangle } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { getFioBScalingFactor } from '@/lib/financial-analysis'
import { BRL, type ProposalPageData } from './proposal-utils'

export function ProposalFinancial({ data }: { data: ProposalPageData }) {
  const [open, setOpen] = useState(false)
  const { fp, td, branding, sizing, negotiation, proposal } = {
    fp: data.financialProjection,
    td: data.tariffDetails,
    branding: data.branding,
    sizing: data.sizing,
    negotiation: data.negotiation,
    proposal: data.proposal,
  }

  const cons = Number(negotiation?.avg_consumption || 0)
  const kwp = Number(sizing?.kit_power_kwp || 0)
  const estMonthlyGen = fp?.estMonthlyGen || kwp * 4.94 * 30 * 0.77
  const totalInv = proposal?.total_value || proposal?.price || kwp * 3500
  const currentBill = fp?.currentMonthlyCost ?? cons * 0.9
  const futureBill = fp?.futureMonthlyBill ?? cons * 0.1
  const monthlySavings = fp?.monthlySavings ?? currentBill - futureBill
  const annualSavings = fp?.annualSavings ?? monthlySavings * 12
  const roiMonths = fp?.roiMonths ?? (monthlySavings > 0 ? totalInv / monthlySavings : 0)
  const roiYears = fp?.roiYears ?? Math.floor(roiMonths / 12)
  const roiRemMonths = fp?.roiRemainingMonths ?? Math.ceil(roiMonths % 12)
  const co2Tons = Math.round((estMonthlyGen * 12 * 0.085) / 1000)
  const fioBScale = getFioBScalingFactor()
  const fioBBase = td?.fio_b_value || 0.22
  const projectionYears = [1, 2, 3, 5, 10, 25]

  const roiLabel =
    roiMonths > 0
      ? [
          roiYears > 0 ? `${roiYears} ano(s)` : '',
          roiYears > 0 && roiRemMonths > 0 ? ' e ' : '',
          roiRemMonths > 0 ? `${roiRemMonths} mês(es)` : '',
        ].join('')
      : ''

  return (
    <div className="p-8 md:p-16 space-y-8">
      <div
        className="proposal-section-title border-b-2 pb-4"
        style={{ borderColor: branding.primaryColor }}
      >
        <h2 className="text-3xl font-bold text-slate-800">Análise Financeira</h2>
      </div>
      {td?.found === false && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Tarifas não configuradas para esta classe (
            {fp?.consumerCategory || negotiation?.consumer_category || 'N/A'}).
          </AlertDescription>
        </Alert>
      )}
      <div
        className="proposal-financial-highlight border-2 rounded-xl p-6 bg-muted/20"
        style={{ borderColor: branding.primaryColor + '40' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Conta Atual</span>
            </div>
            <p className="text-3xl font-bold">{BRL.format(currentBill)}</p>
            <p className="text-xs text-muted-foreground mt-1">por mês</p>
          </div>
          <div
            className="md:border-l md:pl-6"
            style={{ borderColor: branding.primaryColor + '20' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Conta Após Solar</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{BRL.format(futureBill)}</p>
            <p className="text-xs text-green-700/70 mt-1">estimada por mês</p>
          </div>
        </div>
        <div
          className="mt-4 pt-4 border-t flex justify-between items-center"
          style={{ borderColor: branding.primaryColor + '15' }}
        >
          <span className="text-sm font-medium text-muted-foreground">Economia Mensal</span>
          <span className="text-xl font-bold text-green-600">
            {BRL.format(monthlySavings)}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({BRL.format(annualSavings)}/ano)
            </span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="proposal-roi-badge proposal-financial-highlight bg-white border-2 rounded-2xl p-6 text-center"
          style={{
            borderColor: branding.primaryColor,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <TrendingUp className="w-8 h-8 mx-auto mb-2" style={{ color: branding.primaryColor }} />
          <p
            className="proposal-roi-badge text-3xl font-bold"
            style={{
              color: branding.primaryColor,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            {roiLabel || '—'}
          </p>
          <p className="text-sm text-slate-500">Retorno do Investimento</p>
        </div>
        <div className="proposal-financial-highlight bg-white border-2 border-green-200 rounded-2xl p-6 text-center">
          <Leaf className="w-8 h-8 mx-auto mb-2 text-green-600" />
          <p
            className="proposal-roi-badge text-3xl font-bold text-green-600"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {co2Tons}t
          </p>
          <p className="text-sm text-slate-500">CO₂ Evitado/ano</p>
        </div>
        <div className="proposal-financial-highlight bg-white border-2 border-blue-200 rounded-2xl p-6 text-center">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-600" />
          <p
            className="proposal-roi-badge text-2xl font-bold text-blue-600"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {BRL.format(annualSavings)}
          </p>
          <p className="text-sm text-slate-500">Economia Anual</p>
        </div>
      </div>
      {fp && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="flex items-center justify-between border rounded-lg px-4 py-3 bg-muted/50">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" /> Detalhamento do Cálculo
            </h4>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-auto">
                <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="border border-t-0 rounded-b-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Tarifa Base (TE + TUSD)</span>
                <span className="font-medium">{BRL.format(fp.baseRate)} /kWh</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Consumo Instantâneo (Autoconsumo)</span>
                <span className="font-medium">{Math.round(fp.instantConsumption)} kWh</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Consumo Compensado</span>
                <span className="font-medium">{Math.round(fp.compensatedConsumption)} kWh</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Encargo de ICMS TE</span>
                <span className="font-medium">{BRL.format(fp.teComponent)} /kWh</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">Encargo de ICMS TUSD</span>
                <span className="font-medium">{BRL.format(fp.tusdComponent)} /kWh</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-muted-foreground">
                  Fio B ({BRL.format(fioBBase)}/kWh × {Math.round(fioBScale * 100)}%)
                </span>
                <span className="font-medium">{BRL.format(fp.fioBCost)}</span>
              </div>
              {fp.energyFromGrid > 0 && (
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Energia da Rede (não compensada)</span>
                  <span className="font-medium">{Math.round(fp.energyFromGrid)} kWh</span>
                </div>
              )}
              <div className="flex justify-between py-1 font-semibold border-t pt-2">
                <span>Conta Após Solar Total</span>
                <span>{BRL.format(fp.futureMonthlyBill)}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      <div className="proposal-table overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead
            style={{
              backgroundColor: branding.primaryColor,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <tr className="text-white">
              <th className="px-4 py-3 text-left">Ano</th>
              <th className="px-4 py-3 text-left">Economia Mensal</th>
              <th className="px-4 py-3 text-left">Economia Anual</th>
              <th className="px-4 py-3 text-left">Acumulado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {projectionYears.map((year) => {
              const factor = Math.pow(1.05, year - 1)
              const annual = monthlySavings * 12 * factor
              const accumulated = ((monthlySavings * 12 + annual) / 2) * year
              return (
                <tr key={year} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">Ano {year}</td>
                  <td className="px-4 py-3">{BRL.format(monthlySavings * factor)}</td>
                  <td className="px-4 py-3">{BRL.format(annual)}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">
                    {BRL.format(accumulated)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
