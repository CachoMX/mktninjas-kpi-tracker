'use client'

import { KPIMetric } from '@/types/database'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const COUNT_METRICS: KPIMetric[] = [
  { label: 'Dials', key: 'dials_today', color: '#3B82F6' },
  { label: 'Pickups', key: 'pickups_today', color: '#10B981' },
  { label: '1min+ Convos', key: 'one_min_convos', color: '#F59E0B' },
  { label: 'DQs', key: 'dqs_today', color: '#EF4444' },
  { label: 'Follow Ups', key: 'follow_ups_today', color: '#EC4899' },
  { label: 'Appointments', key: 'qualified_appointments', color: '#8B5CF6' },
  { label: 'Discovery Calls', key: 'discovery_calls_scheduled', color: '#F97316' },
  { label: 'Showed Up', key: 'prospects_showed_up', color: '#22C55E' },
  { label: 'Rescheduled', key: 'prospects_rescheduled', color: '#F59E0B' },
  { label: 'Full Territory', key: 'prospects_full_rterritory', color: '#A855F7' },
  { label: 'Deals Closed', key: 'deals_closed', color: '#06B6D4' },
  { label: 'Performance Score', key: 'performance_score', color: '#84CC16', format: 'number' },
]

const EFFICIENCY_METRICS: KPIMetric[] = [
  { label: 'Pickup Rate', key: 'pickupRate', color: '#10B981', format: 'percentage', calculated: true },
  { label: 'Show Rate', key: 'showRate', color: '#22C55E', format: 'percentage', calculated: true },
]

const DEFAULT_METRICS = [...COUNT_METRICS, ...EFFICIENCY_METRICS]

interface MetricTogglesProps {
  selectedMetrics: string[]
  onChange: (metrics: string[]) => void
  className?: string
}

export function MetricToggles({ selectedMetrics, onChange, className }: MetricTogglesProps) {
  // const handleMetricToggle = (metricKey: string) => {
  //   const newMetrics = selectedMetrics.includes(metricKey)
  //     ? selectedMetrics.filter(m => m !== metricKey)
  //     : [...selectedMetrics, metricKey]
  //   onChange(newMetrics)
  // }

  const handleSelectAll = () => {
    onChange(selectedMetrics.length === DEFAULT_METRICS.length 
      ? [] 
      : DEFAULT_METRICS.map(m => m.key as string)
    )
  }

  const handleSectionToggle = (metrics: KPIMetric[]) => {
    const sectionKeys = metrics.map(m => m.key as string)
    const allSelected = sectionKeys.every(key => selectedMetrics.includes(key))
    
    if (allSelected) {
      // Deselect all in this section
      onChange(selectedMetrics.filter(key => !sectionKeys.includes(key)))
    } else {
      // Select all in this section
      const newMetrics = [...new Set([...selectedMetrics, ...sectionKeys])]
      onChange(newMetrics)
    }
  }

  const renderMetricSection = (title: string, metrics: KPIMetric[]) => {
    const sectionKeys = metrics.map(m => m.key as string)
    const allSelected = sectionKeys.every(key => selectedMetrics.includes(key))
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </h4>
          <button
            type="button"
            onClick={() => handleSectionToggle(metrics)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {allSelected ? 'Clear' : 'Select All'}
          </button>
        </div>
        {metrics.map((metric) => (
          <div key={metric.key as string} className="flex items-center space-x-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const metricKey = metric.key as string;
                const newMetrics = selectedMetrics.includes(metricKey)
                  ? selectedMetrics.filter(m => m !== metricKey)
                  : [...selectedMetrics, metricKey];
                onChange(newMetrics);
              }}
              className={cn(
                "peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
                selectedMetrics.includes(metric.key as string)
                  ? "bg-primary"
                  : "bg-input"
              )}
            >
              <div
                className={cn(
                  "bg-background pointer-events-none block size-4 rounded-full ring-0 transition-transform",
                  selectedMetrics.includes(metric.key as string)
                    ? "translate-x-[calc(100%-2px)]"
                    : "translate-x-0"
                )}
              />
            </button>
            <Label
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
      </div>
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
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {selectedMetrics.length === DEFAULT_METRICS.length ? 'Clear All' : 'Select All'}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderMetricSection('Count Metrics', COUNT_METRICS)}
        {renderMetricSection('Efficiency Metrics', EFFICIENCY_METRICS)}
      </CardContent>
    </Card>
  )
}