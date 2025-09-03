'use client'

import { useState } from 'react'
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DatePreset } from '@/types/database'

interface DateRangePickerProps {
  value: { from: Date; to: Date }
  onChange: (range: { from: Date; to: Date }) => void
  className?: string
}

const presets: { label: string; value: DatePreset; getValue: () => { from: Date; to: Date } }[] = [
  {
    label: 'Today',
    value: 'today',
    getValue: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'This Week',
    value: 'this-week',
    getValue: () => ({
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  {
    label: 'This Month',
    value: 'this-month',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: 'Last 30 Days',
    value: 'last-30-days',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 30)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Custom Range',
    value: 'custom',
    getValue: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
]

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('last-30-days')
  const [isOpen, setIsOpen] = useState(false)

  const handlePresetSelect = (preset: DatePreset) => {
    setSelectedPreset(preset)
    if (preset !== 'custom') {
      const newRange = presets.find(p => p.value === preset)?.getValue()
      if (newRange) {
        onChange(newRange)
        setIsOpen(false)
      }
    }
  }

  const formatDateRange = () => {
    if (!value.from || !value.to) return 'Select date range'
    if (format(value.from, 'yyyy-MM-dd') === format(value.to, 'yyyy-MM-dd')) {
      return format(value.from, 'MMM dd, yyyy')
    }
    return `${format(value.from, 'MMM dd, yyyy')} - ${format(value.to, 'MMM dd, yyyy')}`
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r p-3">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Presets</h4>
                <div className="grid gap-1">
                  {presets.map((preset) => (
                    <Button
                      key={preset.value}
                      variant={selectedPreset === preset.value ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handlePresetSelect(preset.value)}
                      className="justify-start h-8"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={value?.from}
                selected={{ from: value?.from, to: value?.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    onChange({ from: range.from, to: range.to })
                    setSelectedPreset('custom')
                  }
                }}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}