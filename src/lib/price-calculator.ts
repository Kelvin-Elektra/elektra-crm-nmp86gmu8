/**
 * Motor de Cálculo Financeiro: Tabela Price (Sistema Francês de Amortização)
 * Parcela mensal fixa com juros compostos.
 */

export interface PriceSimulationInput {
  financedAmount: number // Valor a financiar (PV - Present Value)
  annualRatePct: number // Taxa de juros anual % a.a.
  installments: number // Prazo em meses (n)
  downPayment?: number // Valor de entrada opcional
  totalNegotiationValue?: number // Valor total original
}

export interface PriceSimulationResult {
  financedAmount: number
  annualRatePct: number
  monthlyRatePct: number
  monthlyRateDecimal: number
  installments: number
  monthlyPayment: number // PMT
  totalPaid: number // Parcela * n + entrada
  totalFinancedPaid: number // Parcela * n
  totalInterest: number // Total pago nos financiados - principal financiado
  downPayment: number
  totalNegotiationValue: number
}

/**
 * Converte taxa de juros anual efetiva para taxa mensal equivalente:
 * i_mensal = (1 + i_anual)^(1/12) - 1
 */
export function annualToMonthlyRate(annualRatePct: number): number {
  const iAnnual = Math.max(0, Number(annualRatePct) || 0) / 100
  if (iAnnual <= 0) return 0
  return Math.pow(1 + iAnnual, 1 / 12) - 1
}

/**
 * Calcula a parcela fixa (PMT) e o total pago via Tabela Price:
 * PMT = PV * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
 */
export function calculatePriceSimulation(input: PriceSimulationInput): PriceSimulationResult {
  const financedAmount = Math.max(0, Number(input.financedAmount) || 0)
  const annualRatePct = Math.max(0, Number(input.annualRatePct) || 0)
  const installments = Math.max(1, Math.round(Number(input.installments) || 1))
  const downPayment = Math.max(0, Number(input.downPayment) || 0)
  const totalNegotiationValue = Number(input.totalNegotiationValue) || financedAmount + downPayment

  if (financedAmount <= 0) {
    return {
      financedAmount: 0,
      annualRatePct,
      monthlyRatePct: 0,
      monthlyRateDecimal: 0,
      installments,
      monthlyPayment: 0,
      totalPaid: downPayment,
      totalFinancedPaid: 0,
      totalInterest: 0,
      downPayment,
      totalNegotiationValue,
    }
  }

  const iMonthly = annualToMonthlyRate(annualRatePct)
  let monthlyPayment = 0

  if (iMonthly === 0) {
    // Sem juros: divisão simples
    monthlyPayment = financedAmount / installments
  } else {
    // Tabela Price
    const factor = Math.pow(1 + iMonthly, installments)
    monthlyPayment = (financedAmount * (iMonthly * factor)) / (factor - 1)
  }

  // Arredonda a parcela para 2 casas decimais
  const pmt = Math.round(monthlyPayment * 100) / 100
  const totalFinancedPaid = Math.round(pmt * installments * 100) / 100
  const totalInterest = Math.max(0, Math.round((totalFinancedPaid - financedAmount) * 100) / 100)
  const totalPaid = Math.round((totalFinancedPaid + downPayment) * 100) / 100

  return {
    financedAmount,
    annualRatePct,
    monthlyRatePct: Number((iMonthly * 100).toFixed(4)),
    monthlyRateDecimal: iMonthly,
    installments,
    monthlyPayment: pmt,
    totalPaid,
    totalFinancedPaid,
    totalInterest,
    downPayment,
    totalNegotiationValue,
  }
}
