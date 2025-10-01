'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { Info } from 'lucide-react'

interface ActivityData {
  date: string
  value: number
}

interface HeatmapCalendarProps {
  title: string
  description?: string
  data: ActivityData[]
  month: Date
  colorScheme?: 'blue' | 'green' | 'purple'
}

export function HeatmapCalendar({
  title,
  description,
  data,
  month,
  colorScheme = 'blue',
}: HeatmapCalendarProps) {
  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  })

  const maxValue = Math.max(...data.map(d => d.value), 1)

  const getIntensity = (date: string) => {
    const activity = data.find(d => d.date === date)
    if (!activity) return 0
    return Math.ceil((activity.value / maxValue) * 4)
  }

  const getColorClass = (intensity: number) => {
    if (intensity === 0) return 'bg-muted'
    
    const colorMap = {
      blue: [
        'bg-blue-100 dark:bg-blue-900/20',
        'bg-blue-200 dark:bg-blue-900/40',
        'bg-blue-300 dark:bg-blue-900/60',
        'bg-blue-400 dark:bg-blue-900/80',
        'bg-blue-500 dark:bg-blue-900',
      ],
      green: [
        'bg-green-100 dark:bg-green-900/20',
        'bg-green-200 dark:bg-green-900/40',
        'bg-green-300 dark:bg-green-900/60',
        'bg-green-400 dark:bg-green-900/80',
        'bg-green-500 dark:bg-green-900',
      ],
      purple: [
        'bg-purple-100 dark:bg-purple-900/20',
        'bg-purple-200 dark:bg-purple-900/40',
        'bg-purple-300 dark:bg-purple-900/60',
        'bg-purple-400 dark:bg-purple-900/80',
        'bg-purple-500 dark:bg-purple-900',
      ],
    }

    return colorMap[colorScheme][intensity - 1]
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  // Create calendar grid
  const firstDayOfMonth = startOfMonth(month)
  const startingDayOfWeek = getDay(firstDayOfMonth)
  const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => i)

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {title}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <div className="space-y-2">
                    <div className="font-medium">Activity Score Formula:</div>
                    <div className="text-xs space-y-1">
                      <div>• Dials × 1</div>
                      <div>• Pickups × 3</div>
                      <div>• 1min+ Convos × 5</div>
                      <div>• DQs × 8</div>
                      <div>• Follow Ups × 2</div>
                      <div>• Appointments × 10</div>
                      <div>• Discovery Calls × 8</div>
                      <div>• Showed Up × 15</div>
                      <div>• Rescheduled × 3</div>
                      <div>• Full Territory × 20</div>
                      <div>• Deals Closed × 50</div>
                      <div>• Performance Score × 1</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Score depends on selected metrics in filters
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </div>
          {description && <CardDescription>{description}</CardDescription>}
          <div className="text-sm text-muted-foreground">
            {format(month, 'MMMM yyyy')}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground text-center">
              {weekdays.map(day => (
                <div key={day} className="p-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty days for month start alignment */}
              {emptyDays.map(day => (
                <div key={`empty-${day}`} className="w-8 h-8" />
              ))}
              
              {/* Actual days */}
              {days.map(day => {
                const dateString = format(day, 'yyyy-MM-dd')
                const intensity = getIntensity(dateString)
                const activity = data.find(d => d.date === dateString)
                
                return (
                  <Tooltip key={dateString}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'w-8 h-8 rounded-sm border border-border cursor-pointer transition-all hover:border-foreground',
                          getColorClass(intensity)
                        )}
                      >
                        <div className="w-full h-full flex items-center justify-center text-xs font-medium">
                          {format(day, 'd')}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <div className="font-medium">
                          {format(day, 'MMM dd, yyyy')}
                        </div>
                        <div>
                          Activity Score: {activity?.value || 0}
                        </div>
                        <div className="text-muted-foreground mt-1">
                          Combined score from selected metrics
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">Less</span>
              <div className="flex space-x-1">
                {[0, 1, 2, 3, 4].map(level => (
                  <div
                    key={level}
                    className={cn('w-3 h-3 rounded-sm border border-border', getColorClass(level))}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">More</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}