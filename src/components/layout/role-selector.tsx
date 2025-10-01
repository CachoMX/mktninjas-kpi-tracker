'use client'

import { useRole } from '@/contexts/role-context'
import { Button } from '@/components/ui/button'
import { UserRole } from '@/types/database'
import { cn } from '@/lib/utils'
import { Users, Phone } from 'lucide-react'

export function RoleSelector() {
  const { currentRole, setCurrentRole } = useRole()

  const roles: { value: UserRole; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'setter', label: 'Setters', icon: Users },
    { value: 'closer', label: 'Closers', icon: Phone },
  ]

  return (
    <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
      {roles.map((role) => {
        const Icon = role.icon
        const isActive = currentRole === role.value

        return (
          <Button
            key={role.value}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentRole(role.value)}
            className={cn(
              "text-xs font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3 w-3 mr-1" />
            {role.label}
          </Button>
        )
      })}
    </div>
  )
}