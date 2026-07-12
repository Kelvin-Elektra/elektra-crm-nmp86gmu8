import { useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar, Clock, CreditCard, Wallet } from 'lucide-react'
import { BRL, parseSnapshot, type ProposalPageData } from './proposal-utils'

function parsePaymentMethods(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((m: any) => typeof m === 'string' && m.trim() !== '')
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

export function ProposalInvestment({ data }: { data: ProposalPageData }) {
  const { proposal, branding, company, sizing, negotiation, lead } = data
  const snapshot = parseSnapshot(proposal)

  useEffect(() => {
    const beforePrint = () => {
      document.title = `Proposta Fotovoltaica - ${lead?.name || 'Cliente'}`
    }
    const afterPrint = () => {
      document.title = 'Elektra CRM'
    }
    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    return () => {
      window.removeEventListener('beforeprint', beforePrint)
      window.removeEventListener('afterprint', afterPrint)
    }
  }, [lead?.name])

  const totalValue = proposal?.total_value || proposal?.price || 0
  const discount = proposal?.discount_amount || 0
  const discountValue = totalValue * (discount / 100)
  const finalPrice = totalValue - discountValue

  const validityDate = proposal?.validity_date
    ? format(new Date(proposal.validity_date), 'dd/MM/yyyy')
    : null

  const paymentTerms = proposal?.payment_terms || ''
  const definedPaymentMethod = snapshot?.defined_payment_method || ''
  const installationLeadTime = snapshot?.installation_lead_time || ''
  const acceptedPaymentMethodsList = parsePaymentMethods(snapshot?.accepted_payment_methods)

  const liveSizing = negotiation?.sizing || sizing || {}
  const estMonthlyGen =
    liveSizing?.estimated_monthly_generation || sizing?.estimated_monthly_generation || 0
  const kwp = Number(liveSizing?.kit_power_kwp || sizing?.kit_power_kwp) || 0

  return (
    <div className="p-[15mm] space-y-8">
      <div
        className="proposal-section-title border-b-2 pb-4"
        style={{ borderColor: branding.primaryColor, breakAfter: 'avoid', pageBreakAfter: 'avoid' }}
      >
        <h2 className="text-3xl font-bold text-slate-800">Investimento e Condições</h2>
      </div>

      <div className="proposal-no-break proposal-investment-card rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div
          style={{
            backgroundColor: branding.primaryColor,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
          className="p-4"
        >
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Resumo do Investimento
          </h3>
        </div>
        <div className="p-6 space-y-3">
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Valor de Tabela:</span>
              <span className="font-medium text-slate-700">{BRL.format(totalValue)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Desconto ({discount}%):</span>
              <span className="font-medium text-destructive">- {BRL.format(discountValue)}</span>
            </div>
          )}
          <div
            className="flex justify-between items-center pt-3 border-t"
            style={{ borderColor: branding.primaryColor + '20' }}
          >
            <span className="font-semibold text-slate-700">Total do Investimento:</span>
            <span className="text-2xl font-black" style={{ color: branding.primaryColor }}>
              {BRL.format(finalPrice)}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2">
            <span className="text-slate-500">Potência do Sistema:</span>
            <span className="font-medium">{kwp.toFixed(2)} kWp</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Geração Média Mensal:</span>
            <span className="font-medium">{Math.round(estMonthlyGen)} kWh</span>
          </div>
        </div>
      </div>

      <div className="proposal-no-break proposal-investment-card rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div
          className="p-4 bg-slate-50 border-b"
          style={{ borderColor: branding.primaryColor + '20' }}
        >
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5" style={{ color: branding.primaryColor }} /> Condições de
            Pagamento
          </h3>
        </div>
        <div className="p-6 space-y-3">
          {definedPaymentMethod.trim() !== '' && (
            <div>
              <span className="text-sm text-slate-500 block mb-1">
                Forma de Pagamento Definida:
              </span>
              <p className="font-medium text-slate-800">{definedPaymentMethod}</p>
            </div>
          )}

          {definedPaymentMethod.trim() === '' && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 min-h-[80px]">
              <p className="text-xs text-slate-400 mb-3">
                Forma de Pagamento (preencher manualmente):
              </p>
              <div className="space-y-4">
                <div className="border-b border-slate-300" style={{ minHeight: '1.5rem' }} />
                <div className="border-b border-slate-300" style={{ minHeight: '1.5rem' }} />
              </div>
            </div>
          )}

          {paymentTerms.trim() !== '' && (
            <div>
              <span className="text-sm text-slate-500 block mb-1">Condições:</span>
              <p className="text-slate-700 whitespace-pre-wrap">{paymentTerms}</p>
            </div>
          )}

          {acceptedPaymentMethodsList.length > 0 && (
            <div className="pt-2 border-t" style={{ borderColor: branding.primaryColor + '10' }}>
              <span className="text-sm text-slate-500 block mb-1">
                Formas de Pagamento Aceitas:
              </span>
              <ul className="text-sm text-slate-600 space-y-1">
                {acceptedPaymentMethodsList.map((m, i) => (
                  <li key={i}>• {m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {installationLeadTime.trim() !== '' && (
        <div className="proposal-no-break proposal-investment-card flex items-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{
              backgroundColor: branding.primaryColor,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Prazo de Instalação</h3>
            <p className="text-sm text-slate-600">{installationLeadTime}</p>
          </div>
        </div>
      )}

      {validityDate && (
        <div
          className="proposal-no-break proposal-investment-card flex items-center gap-4 p-6 rounded-2xl border-2"
          style={{ borderColor: branding.primaryColor + '40' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: branding.primaryColor + '10',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <Calendar className="w-6 h-6" style={{ color: branding.primaryColor }} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Validade da Proposta</h3>
            <p className="text-sm text-slate-600">Esta proposta é válida até {validityDate}</p>
          </div>
        </div>
      )}

      <div
        className="proposal-no-break text-center pt-6 border-t"
        style={{ borderColor: branding.primaryColor + '20' }}
      >
        <p className="font-bold text-slate-800">{company?.name || ''}</p>
        {company?.cnpj && <p className="text-sm text-slate-500">CNPJ: {company.cnpj}</p>}
      </div>
    </div>
  )
}
