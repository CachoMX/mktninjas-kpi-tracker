'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface FunnelStage {
  name: string
  value: number
  color: string
  rate?: number
}

interface FunnelChartProps {
  title: string
  description?: string
  stages: FunnelStage[]
  height?: number
}

const safeNumber = (value: number | null | undefined): string => {
  return (value ?? 0).toLocaleString()
}

export function FunnelChart({
  title,
  description,
  stages,
  height,
}: FunnelChartProps) {
  const maxValue = Math.max(...stages.map(s => s.value))
  
  // Calculate dynamic height based on number of stages with a reasonable maximum
  const dynamicHeight = height || Math.max(300, Math.min(stages.length * 60 + 100, 600))

  const calculateWidth = (value: number) => {
    const baseWidth = (value / maxValue) * 100
    return Math.max(baseWidth, 20) // Minimum width for visibility
  }

  return (
    <Card className="h-fit max-h-[700px] overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="overflow-y-auto max-h-[600px]">
        <div className="space-y-4" style={{ minHeight: Math.min(dynamicHeight, 500) }}>
          {stages.map((stage, index) => {
            const width = calculateWidth(stage.value)
            const nextStage = stages[index + 1]
            
            // Only show conversion rate if next stage has lower or similar value (logical funnel)
            const conversionRate = nextStage && stage.value > 0
              ? (((nextStage.value || 0) / stage.value) * 100).toFixed(1) 
              : null
            
            const showConversionRate = conversionRate && parseFloat(conversionRate) <= 100

            return (
              <div key={stage.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stage.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold">
                      {safeNumber(stage.value)}
                    </span>
                    {stage.rate && (
                      <span className="text-xs text-muted-foreground">
                        ({(stage.rate || 0).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <div className="w-full bg-muted rounded-lg h-8">
                    <div
                      className="h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium transition-all duration-300"
                      style={{
                        width: `${width}%`,
                        backgroundColor: stage.color,
                      }}
                    >
                      {width > 30 && safeNumber(stage.value)}
                    </div>
                  </div>
                  {showConversionRate && (
                    <div className="absolute -bottom-5 right-0 text-xs text-muted-foreground">
                      {conversionRate}% →
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {stages.length > 1 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Overall Conversion ({stages[0]?.name} → {stages[stages.length - 1]?.name}):</span>
              <span>
                {stages[0]?.value > 0 
                  ? (((stages[stages.length - 1]?.value || 0) / stages[0].value) * 100).toFixed(1)
                  : '0.0'
                }%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}