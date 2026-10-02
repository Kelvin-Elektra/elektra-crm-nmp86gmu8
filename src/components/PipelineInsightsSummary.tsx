import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react'

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

interface PipelineInsightsSummaryProps {
  stages: any[]
  negotiations: any[]
  proposals: any[]
  isLossStageFn: (stageId: string, stageName?: string) => boolean
  isSaleStageFn: (stageId: string, stageName?: string) => boolean
}

/**
 * Calcula a diferença em dias entre duas datas (ou até hoje se não houver end)
 */
function daysBetween(startStr?: string | null, endStr?: string | null): number {
  if (!startStr) return 0
  const start = new Date(startStr).getTime()
  const end = endStr ? new Date(endStr).getTime() : Date.now()
  if (isNaN(start) || isNaN(end)) return 0
  const diffDays = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)))
  return diffDays
}

export function PipelineInsightsSummary({
  stages,
  negotiations,
  proposals,
  isLossStageFn,
  isSaleStageFn,
}: PipelineInsightsSummaryProps) {
  const getNegValue = (negId: string) => {
    const negProps = proposals.filter((p) => p.negotiation_id === negId)
    if (negProps.length === 0) return 0
    const sum = negProps.reduce((acc, p) => acc + (p.total_value || p.price || 0), 0)
    return sum / negProps.length
  }

  const metrics = useMemo(() => {
    // Classificação
    const wonList: any[] = []
    const lostList: any[] = []
    const activeList: any[] = []

    negotiations.forEach((n) => {
      const stageObj = stages.find((s) => s.id === n.stage)
      const isLost = isLossStageFn(n.stage, stageObj?.name) || Boolean(n.lost_at || n.loss_reason)
      const isWon =
        isSaleStageFn(n.stage, stageObj?.name) || n.status === 'won' || n.stage === 'Venda Fechada'

      if (isLost) {
        lostList.push(n)
      } else if (isWon) {
        wonList.push(n)
      } else {
        activeList.push(n)
      }
    })

    const totalActiveCount = activeList.length
    const totalActiveValue = activeList.reduce((acc, n) => acc + getNegValue(n.id), 0)

    const wonCount = wonList.length
    const wonValue = wonList.reduce((acc, n) => acc + getNegValue(n.id), 0)

    const lostCount = lostList.length
    const lostValue = lostList.reduce((acc, n) => acc + getNegValue(n.id), 0)

    // Taxa de conversão simples: Vendas / (Vendas + Perdas) ou Vendas / Total finalizadas
    const finalizedTotal = wonCount + lostCount
    const conversionRate = finalizedTotal > 0 ? Math.round((wonCount / finalizedTotal) * 100) : 0

    // Tempo médio de negociação no funil até conversão ou dias ativo
    // Para ganhas: created até updated ou stage_changed_at
    const wonDaysSum = wonList.reduce((acc, n) => {
      return acc + daysBetween(n.created, n.stage_changed_at || n.updated)
    }, 0)
    const avgDaysToWon = wonCount > 0 ? Math.round(wonDaysSum / wonCount) : 0

    // Tempo médio no funil (todas ativas)
    const activeDaysSum = activeList.reduce((acc, n) => {
      return acc + daysBetween(n.created)
    }, 0)
    const avgDaysActive = totalActiveCount > 0 ? Math.round(activeDaysSum / totalActiveCount) : 0

    // Detalhamento por estágio ativo
    const stagesBreakdown = stages
      .filter((s) => !isLossStageFn(s.id, s.name))
      .map((stg) => {
        const inStage = negotiations.filter((n) => n.stage === stg.id)
        const count = inStage.length
        const totalVal = inStage.reduce((acc, n) => acc + getNegValue(n.id), 0)

        // Tempo médio no estágio
        const stageDaysSum = inStage.reduce((acc, n) => {
          return acc + daysBetween(n.stage_changed_at || n.created)
        }, 0)
        const avgDaysInStage = count > 0 ? Math.round(stageDaysSum / count) : 0

        return {
          id: stg.id,
          name: stg.name,
          count,
          totalVal,
          avgDaysInStage,
          isSale: isSaleStageFn(stg.id, stg.name),
        }
      })

    return {
      totalActiveCount,
      totalActiveValue,
      wonCount,
      wonValue,
      lostCount,
      lostValue,
      conversionRate,
      avgDaysToWon,
      avgDaysActive,
      stagesBreakdown,
    }
  }, [stages, negotiations, proposals, isLossStageFn, isSaleStageFn])

  return (
    <div className="space-y-4">
      {/* 4 Cards de Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/70 border-border/70 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Em Andamento</span>
              <DollarSign className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-foreground">
              {BRL.format(metrics.totalActiveValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalActiveCount} negociações • Média {metrics.avgDaysActive} dias no funil
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/70 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Vendas Fechadas</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-600">{BRL.format(metrics.wonValue)}</div>
            <p className="text-xs text-muted-foreground">{metrics.wonCount} projetos fechados</p>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/70 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Taxa de Conversão</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-foreground">{metrics.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.wonCount} ganhas de {metrics.wonCount + metrics.lostCount} finalizadas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/70 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tempo até Venda</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-foreground">
              {metrics.avgDaysToWon}{' '}
              <span className="text-xs font-normal text-muted-foreground">dias</span>
            </div>
            <p className="text-xs text-muted-foreground">Média desde o primeiro contato</p>
          </CardContent>
        </Card>
      </div>

      {/* Régua horizontal de Estágios com contagem, valor e tempo médio */}
      {metrics.stagesBreakdown.length > 0 && (
        <div className="bg-muted/30 border border-border/60 rounded-xl p-3 overflow-x-auto">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center justify-between">
            <span>Visão Resumida por Estágio</span>
            {metrics.lostCount > 0 && (
              <span className="text-rose-600 normal-case font-normal flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                {metrics.lostCount} negociações perdidas ({BRL.format(metrics.lostValue)})
              </span>
            )}
          </div>
          <div className="flex items-stretch gap-2 min-w-max">
            {metrics.stagesBreakdown.map((stg) => (
              <div
                key={stg.id}
                className={`px-3 py-2 rounded-lg border text-xs min-w-[150px] flex-1 flex flex-col justify-between ${
                  stg.isSale
                    ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20'
                    : 'bg-background border-border/70'
                }`}
              >
                <div className="font-semibold text-foreground truncate mb-1">{stg.name}</div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-primary">{BRL.format(stg.totalVal)}</span>
                  <span className="text-muted-foreground">{stg.count} neg.</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 opacity-60" />
                  <span>Méd. {stg.avgDaysInStage} dias no estágio</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
