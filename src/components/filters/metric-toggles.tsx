'use client'

import { useState } from 'react'
import { KPIMetric, UserRole } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { BarChart3, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCountMetrics, getEfficiencyMetrics } from '@/lib/metrics-config'
import { Separator } from '@/components/ui/separator'

interface MetricTogglesProps {
  selectedMetrics: string[]
  onChange: (metrics: string[]) => void
  role: UserRole
  className?: string
}

export function MetricToggles({ selectedMetrics, onChange, role, className }: MetricTogglesProps) {
  const [open, setOpen] = useState(false)
  const countMetrics = getCountMetrics(role)
  const efficiencyMetrics = getEfficiencyMetrics(role)
  const allMetrics = [...countMetrics, ...efficiencyMetrics]

  const toggleMetric = (metricKey: string) => {
    const newMetrics = selectedMetrics.includes(metricKey)
      ? selectedMetrics.filter(m => m !== metricKey)
      : [...selectedMetrics, metricKey]
    onChange(newMetrics)
  }

  const handleSelectAll = () => {
    onChange(selectedMetrics.length === allMetrics.length
      ? []
      : allMetrics.map(m => m.key as string)
    )
  }

  const handleSectionToggle = (metrics: KPIMetric[]) => {
    const sectionKeys = metrics.map(m => m.key as string)
    const allSelected = sectionKeys.every(key => selectedMetrics.includes(key))

    if (allSelected) {
      onChange(selectedMetrics.filter(key => !sectionKeys.includes(key)))
    } else {
      const newMetrics = [...new Set([...selectedMetrics, ...sectionKeys])]
      onChange(newMetrics)
    }
  }

  const renderMetricSection = (title: string, metrics: KPIMetric[]) => {
    const sectionKeys = metrics.map(m => m.key as string)
    const allSelected = sectionKeys.every(key => selectedMetrics.includes(key))

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleSectionToggle(metrics)}
            className="h-6 px-2 text-xs"
          >
            {allSelected ? 'Clear' : 'All'}
          </Button>
        </div>
        <div className="space-y-0.5">
          {metrics.map((metric) => {
            const isSelected = selectedMetrics.includes(metric.key as string)
            return (
              <button
                key={metric.key as string}
                type="button"
                onClick={() => toggleMetric(metric.key as string)}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: metric.color }}
                  />
                  <span>{metric.label}</span>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Metrics ({selectedMetrics.length}/{allMetrics.length})</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Select Metrics</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-7 text-xs"
            >
              {selectedMetrics.length === allMetrics.length ? 'Clear All' : 'Select All'}
            </Button>
          </div>
          <Separator />
          {renderMetricSection('Count Metrics', countMetrics)}
          <Separator />
          {renderMetricSection('Efficiency Metrics', efficiencyMetrics)}
        </div>
      </PopoverContent>
    </Popover>
  )
}