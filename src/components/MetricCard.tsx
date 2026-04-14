import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
  delay?: number
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  className,
  delay = 0,
}: MetricCardProps) {
  return (
    <Card
      className={cn('hover-lift animate-fade-in-up border-border/50', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
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
