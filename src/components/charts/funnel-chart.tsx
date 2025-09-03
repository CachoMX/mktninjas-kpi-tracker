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

export function FunnelChart({
  title,
  description,
  stages,
  height = 300,
}: FunnelChartProps) {
  const maxValue = Math.max(...stages.map(s => s.value))

  const calculateWidth = (value: number) => {
    const baseWidth = (value / maxValue) * 100
    return Math.max(baseWidth, 20) // Minimum width for visibility
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4" style={{ height }}>
          {stages.map((stage, index) => {
            const width = calculateWidth(stage.value)
            const nextStage = stages[index + 1]
            const conversionRate = nextStage 
              ? ((nextStage.value / stage.value) * 100).toFixed(1) 
              : null

            return (
              <div key={stage.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stage.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold">
                      {stage.value.toLocaleString()}
                    </span>
                    {stage.rate && (
                      <span className="text-xs text-muted-foreground">
                        ({stage.rate.toFixed(1)}%)
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
                      {width > 30 && stage.value.toLocaleString()}
                    </div>
                  </div>
                  {conversionRate && (
                    <div className="absolute -bottom-5 right-0 text-xs text-muted-foreground">
                      {conversionRate}% →
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overall Conversion:</span>
            <span>
              {((stages[stages.length - 1]?.value / stages[0]?.value) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}