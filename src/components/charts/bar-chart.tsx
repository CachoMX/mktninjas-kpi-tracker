'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

interface CustomBarChartProps {
  title: string
  description?: string
  data: Record<string, string | number>[]
  bars: {
    dataKey: string
    fill: string
    name: string
  }[]
  height?: number
  xAxisKey?: string
  orientation?: 'horizontal' | 'vertical'
}

export function CustomBarChart({
  title,
  description,
  data,
  bars,
  height = 300,
  xAxisKey = 'name',
  orientation = 'vertical',
}: CustomBarChartProps) {
  // Ensure data is always an array
  const chartData = Array.isArray(data) ? data : []
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type={orientation === 'horizontal' ? 'number' : 'category'}
                dataKey={orientation === 'horizontal' ? undefined : xAxisKey}
                className="text-xs fill-muted-foreground"
                angle={orientation === 'vertical' && chartData.length > 3 ? -45 : 0}
                textAnchor={orientation === 'vertical' && chartData.length > 3 ? 'end' : 'middle'}
                height={orientation === 'vertical' && chartData.length > 3 ? 60 : 30}
                interval={0}
              />
              <YAxis 
                type={orientation === 'horizontal' ? 'category' : 'number'}
                dataKey={orientation === 'horizontal' ? xAxisKey : undefined}
                className="text-xs fill-muted-foreground"
                width={orientation === 'horizontal' ? 100 : 50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              {bars.map((bar) => (
                <Bar
                  key={bar.dataKey}
                  dataKey={bar.dataKey}
                  fill={bar.fill}
                  name={bar.name}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No data available</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}