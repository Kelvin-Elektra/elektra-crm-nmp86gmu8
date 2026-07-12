import { Receipt, TrendingUp, Leaf, Calendar, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BRL, type ProposalPageData } from './proposal-utils'

export function ProposalFinancial({ data }: { data: ProposalPageData }) {
  const { fp, td, branding, sizing, negotiation, proposal, hspData } = {
    fp: data.financialProjection,
    td: data.tariffDetails,
    branding: data.branding,
    sizing: data.sizing,
    negotiation: data.negotiation,
    proposal: data.proposal,
    hspData: data.hspData,
  }

  const cons = Number(negotiation?.avg_consumption || 0)
  const kwp = Number(sizing?.kit_power_kwp || 0)
  const hsp = hspData?.annual_avg || 4.94
  const estMonthlyGen = sizing?.estimated_monthly_generation || fp?.estMonthlyGen || 0
  const totalInv = proposal?.total_value || proposal?.price || kwp * 3500
  const currentBill = fp?.currentMonthlyCost ?? cons * 0.9
  const futureBill = fp?.futureMonthlyBill ?? cons * 0.1
  const monthlySavings = fp?.monthlySavings ?? currentBill - futureBill
  const annualSavings = fp?.annualSavings ?? monthlySavings * 12
  const roiMonths = fp?.roiMonths ?? (monthlySavings > 0 ? totalInv / monthlySavings : 0)
  const roiYears = fp?.roiYears ?? Math.floor(roiMonths / 12)
  const roiRemMonths = fp?.roiRemainingMonths ?? Math.ceil(roiMonths % 12)
  const co2Tons = Math.round((estMonthlyGen * 12 * 0.085) / 1000)
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
    <div className="p-[15mm] space-y-8">
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
        className="proposal-financial-highlight proposal-no-break border-2 rounded-xl p-6 bg-muted/20"
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
      <div className="proposal-no-break grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="proposal-roi-badge proposal-financial-highlight proposal-no-break bg-white border-2 rounded-2xl p-6 text-center"
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
