'use client'

import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'

interface SetterSelectorProps {
  setters: string[]
  selectedSetters: string[]
  onChange: (setters: string[]) => void
  className?: string
}

export function SetterSelector({ setters, selectedSetters, onChange, className }: SetterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSetterToggle = (setter: string) => {
    const newSetters = selectedSetters.includes(setter)
      ? selectedSetters.filter(s => s !== setter)
      : [...selectedSetters, setter]
    onChange(newSetters)
  }

  const handleSelectAll = () => {
    onChange(selectedSetters.length === setters.length ? [] : [...setters])
  }

  const handleClear = () => {
    onChange([])
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[280px] justify-between">
            <span className="truncate">
              {selectedSetters.length === 0
                ? 'All Setters'
                : selectedSetters.length === 1
                ? selectedSetters[0]
                : `${selectedSetters.length} setters selected`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <div className="border-b p-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Select Setters</h4>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-8 px-2"
                >
                  {selectedSetters.length === setters.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedSetters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="h-8 px-2"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-3">
            <div className="space-y-2">
              {setters.map((setter) => (
                <div key={setter} className="flex items-center space-x-2">
                  <Checkbox
                    id={setter}
                    checked={selectedSetters.includes(setter)}
                    onCheckedChange={() => handleSetterToggle(setter)}
                  />
                  <label
                    htmlFor={setter}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    {setter}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {selectedSetters.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedSetters.map((setter) => (
            <Badge key={setter} variant="secondary" className="text-xs">
              {setter}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSetterToggle(setter)}
                className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}