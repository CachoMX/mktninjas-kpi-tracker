'use client'

import { KPIMetric } from '@/types/database'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

const DEFAULT_METRICS: KPIMetric[] = [
  { label: 'Dials', key: 'dials_today', color: '#3B82F6' },
  { label: 'Pickups', key: 'pickups_today', color: '#10B981' },
  { label: '1min+ Convos', key: 'one_min_convos', color: '#F59E0B' },
  { label: 'DQs', key: 'dqs_today', color: '#EF4444' },
  { label: 'Appointments', key: 'qualified_appointments', color: '#8B5CF6' },
  { label: 'Deals Closed', key: 'deals_closed', color: '#06B6D4' },
  { label: 'Performance Score', key: 'performance_score', color: '#84CC16', format: 'number' },
]

interface MetricTogglesProps {
  selectedMetrics: string[]
  onChange: (metrics: string[]) => void
  className?: string
}

export function MetricToggles({ selectedMetrics, onChange, className }: MetricTogglesProps) {
  const handleMetricToggle = (metricKey: string) => {
    const newMetrics = selectedMetrics.includes(metricKey)
      ? selectedMetrics.filter(m => m !== metricKey)
      : [...selectedMetrics, metricKey]
    onChange(newMetrics)
  }

  const handleSelectAll = () => {
    onChange(selectedMetrics.length === DEFAULT_METRICS.length 
      ? [] 
      : DEFAULT_METRICS.map(m => m.key as string)
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Metrics Display
          </CardTitle>
          <button
            onClick={handleSelectAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {selectedMetrics.length === DEFAULT_METRICS.length ? 'Clear All' : 'Select All'}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {DEFAULT_METRICS.map((metric) => (
          <div key={metric.key as string} className="flex items-center space-x-2">
            <Switch
              id={metric.key as string}
              checked={selectedMetrics.includes(metric.key as string)}
              onCheckedChange={() => handleMetricToggle(metric.key as string)}
            />
            <Label
              htmlFor={metric.key as string}
              className="text-sm font-medium cursor-pointer flex-1"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: metric.color }}
                />
                {metric.label}
              </div>
            </Label>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}