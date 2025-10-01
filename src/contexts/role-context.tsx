'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { UserRole } from '@/types/database'

interface RoleContextType {
  currentRole: UserRole
  setCurrentRole: (role: UserRole) => void
  getRoleLabel: (role: UserRole) => string
  getTableName: (role: UserRole) => string
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>('setter')

  const getRoleLabel = (role: UserRole) => {
    return role === 'setter' ? 'Setters' : 'Closers'
  }

  const getTableName = (role: UserRole) => {
    return role === 'setter' ? 'setter_kpi_submissions' : 'closer_eod_submissions'
  }

  const value = {
    currentRole,
    setCurrentRole,
    getRoleLabel,
    getTableName,
  }

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}