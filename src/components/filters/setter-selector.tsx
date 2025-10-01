'use client'

import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { UserRole } from '@/types/database'

interface PeopleSelectorProps {
  people: string[]
  selectedPeople: string[]
  onChange: (people: string[]) => void
  role: UserRole
  className?: string
}

export function PeopleSelector({ people, selectedPeople, onChange, role, className }: PeopleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const roleLabelPlural = role === 'setter' ? 'Setters' : 'Closers'

  const handlePersonToggle = (person: string) => {
    const newPeople = selectedPeople.includes(person)
      ? selectedPeople.filter(p => p !== person)
      : [...selectedPeople, person]
    onChange(newPeople)
  }

  const handleSelectAll = () => {
    onChange(selectedPeople.length === people.length ? [] : [...people])
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
              {selectedPeople.length === 0
                ? `All ${roleLabelPlural}`
                : selectedPeople.length === 1
                ? selectedPeople[0]
                : `${selectedPeople.length} ${roleLabelPlural.toLowerCase()} selected`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <div className="border-b p-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Select {roleLabelPlural}</h4>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-8 px-2"
                >
                  {selectedPeople.length === people.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedPeople.length > 0 && (
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
              {people.map((person) => (
                <div key={person} className="flex items-center space-x-2">
                  <Checkbox
                    id={person}
                    checked={selectedPeople.includes(person)}
                    onCheckedChange={() => handlePersonToggle(person)}
                  />
                  <label
                    htmlFor={person}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    {person}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {selectedPeople.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedPeople.map((person) => (
            <Badge key={person} variant="secondary" className="text-xs">
              {person}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePersonToggle(person)}
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

// Backward compatibility - keep the old interface for existing code
interface SetterSelectorProps {
  setters: string[]
  selectedSetters: string[]
  onChange: (setters: string[]) => void
  className?: string
}

export function SetterSelector({ setters, selectedSetters, onChange, className }: SetterSelectorProps) {
  return (
    <PeopleSelector
      people={setters}
      selectedPeople={selectedSetters}
      onChange={onChange}
      role="setter"
      className={className}
    />
  )
}