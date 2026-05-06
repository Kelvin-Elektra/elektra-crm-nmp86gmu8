import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon, TrendingUp, TrendingDown, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface MetricCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
  delay?: number
  tooltip?: string
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  className,
  delay = 0,
  tooltip,
}: MetricCardProps) {
  return (
    <Card
      className={cn('hover-lift animate-fade-in-up border-border/50', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground/40 hover:text-muted-foreground cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] text-center p-2">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && trendValue && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            {trend === 'up' && <TrendingUp className="mr-1 h-3 w-3 text-emerald-500" />}
            {trend === 'down' && <TrendingDown className="mr-1 h-3 w-3 text-destructive" />}
            <span
              className={cn(
                trend === 'up' && 'text-emerald-500 font-medium',
                trend === 'down' && 'text-destructive font-medium',
              )}
            >
              {trendValue}
            </span>
            <span className="ml-1">vs mês anterior</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
