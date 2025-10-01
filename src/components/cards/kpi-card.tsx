'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: number | string
  subtitle?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    period: string
  }
  format?: 'number' | 'percentage' | 'currency'
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan'
  icon?: React.ElementType
  className?: string
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  format = 'number',
  color = 'blue',
  icon: Icon,
  className,
}: KPICardProps) {
  const formatValue = (val: number | string) => {
    if (val == null) return '0'
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(val)
      default:
        return val.toLocaleString()
    }
  }

  const getTrendIcon = () => {
    switch (trend?.direction) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />
      case 'down':
        return <TrendingDown className="h-3 w-3" />
      default:
        return <Minus className="h-3 w-3" />
    }
  }

  const getTrendColor = () => {
    switch (trend?.direction) {
      case 'up':
        return 'text-green-600 dark:text-green-400'
      case 'down':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const getCardColor = () => {
    switch (color) {
      case 'green':
        return 'border-green-200 dark:border-green-800'
      case 'yellow':
        return 'border-yellow-200 dark:border-yellow-800'
      case 'red':
        return 'border-red-200 dark:border-red-800'
      case 'purple':
        return 'border-purple-200 dark:border-purple-800'
      case 'cyan':
        return 'border-cyan-200 dark:border-cyan-800'
      default:
        return 'border-blue-200 dark:border-blue-800'
    }
  }

  const getIconColor = () => {
    switch (color) {
      case 'green':
        return 'text-green-600 dark:text-green-400'
      case 'yellow':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'red':
        return 'text-red-600 dark:text-red-400'
      case 'purple':
        return 'text-purple-600 dark:text-purple-400'
      case 'cyan':
        return 'text-cyan-600 dark:text-cyan-400'
      default:
        return 'text-blue-600 dark:text-blue-400'
    }
  }

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      getCardColor(),
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={cn('h-4 w-4', getIconColor())} />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center space-x-1 mt-2">
            <div className={cn('flex items-center space-x-1 text-xs', getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value || 0).toFixed(1)}%</span>
            </div>
            <span className="text-xs text-muted-foreground">vs {trend.period}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}