/**
 * Arredondamento de saída de valores financeiros (payload ao Gerador de
 * Propostas e snapshot salvo na proposta) para no máximo 2 casas decimais.
 *
 * IMPORTANTE: NÃO altera o motor de cálculo nem números intermediários
 * internos — aplica apenas na borda de saída. Recursivo em objetos e arrays,
 * com proteção contra ciclos e profundidade máxima.
 */

/** Arredonda um número para no máximo 2 casas decimais (ex.: 21249.287... → 21249.29). */
export function roundTo2(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value
  return Math.round(value * 100) / 100
}

/**
 * Percorre um objeto/array recursivamente e arredonda todo `number` para no
 * máximo 2 casas decimais. Cuidado: só aplicar em dados de SAÍDA (payload ao
 * Gerador, snapshot gravado na proposta) — nunca no estado interno do motor.
 * Protege contra referências circulares rastreando o caminho de ancestrais.
 */
export function roundFinancialDeep<T>(value: T): T {
  const seen = new Set<object>()
  const visit = (v: any): any => {
    if (v == null) return v
    if (typeof v === 'number') return roundTo2(v)
    if (typeof v !== 'object') return v
    if (seen.has(v)) return v // referência circular: mantém como está
    seen.add(v)
    try {
      if (Array.isArray(v)) {
        const out = new Array(v.length)
        for (let i = 0; i < v.length; i++) out[i] = visit(v[i])
        return out
      }
      const out: Record<string, any> = {}
      for (const k of Object.keys(v)) {
        out[k] = visit(v[k])
      }
      return out
    } finally {
      seen.delete(v)
    }
  }
  return visit(value)
}

/**
 * Conveniência para o payload financeiro enviado ao Gerador: mesma travessia
 * de roundFinancialDeep (todo number arredondado a 2 casas), nome explícito
 * para leitura clara no ponto de montagem do payload.
 */
export function roundFinancialPayload<T>(value: T): T {
  return roundFinancialDeep(value)
}
