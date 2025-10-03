'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import {
  DollarSign,
  Plus,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Calculator,
  TrendingUp,
  Users,
  CheckCircle,
  Clock
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/filters/date-range-picker'
import { KPICard } from '@/components/cards/kpi-card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { Payment, ServiceAgreementStatus, PaymentWithDealType } from '@/types/database'
import { PaymentForm } from '@/components/forms/payment-form'
import { useDeletePayment } from '@/hooks/use-commission-data'
import { cn } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Helper function to parse date string without timezone conversion
function parseLocalDate(dateString: string): Date {
  const dateOnly = dateString.split('T')[0]
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

interface PaymentWithCommission extends PaymentWithDealType {
  commission_calculations?: {
    closer_commission: number
    setter_commission: number
    csm_commission: number
    tier_min_deals: number
    tier_max_deals: number | null
    closer_rate: number
    setter_rate: number
  }[]
  commission_calculation?: {
    closer_commission: number
    setter_commission: number
    csm_commission: number
    tier_min_deals: number
    tier_max_deals: number | null
    closer_rate: number
    setter_rate: number
  }
}

export default function CommissionsPage() {
  const [payments, setPayments] = useState<PaymentWithCommission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ServiceAgreementStatus>('all')
  const [dealTypeFilter, setDealTypeFilter] = useState<string>('all')
  const [positionFilter, setPositionFilter] = useState<'all' | 'closer' | 'setter' | 'csm'>('all')
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>(undefined)
  const [viewingPayment, setViewingPayment] = useState<PaymentWithCommission | undefined>(undefined)
  const [parentPayment, setParentPayment] = useState<PaymentWithCommission | undefined>(undefined)

  const deletePayment = useDeletePayment()

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd')
      const toDate = format(dateRange.to, 'yyyy-MM-dd')

      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select(`
          *,
          deal_types (
            id,
            name,
            display_name,
            conversion_rate,
            is_backend
          ),
          commission_calculations (
            id,
            closer_commission,
            setter_commission,
            csm_commission,
            tier_min_deals,
            tier_max_deals,
            closer_rate,
            setter_rate,
            created_at
          )
        `)
        .gte('payment_date', fromDate)
        .lte('payment_date', toDate)
        .order('payment_date', { ascending: false })

      if (error) {
        console.error('Error fetching payments:', error)
        return
      }

      // Map commission_calculations (object or array) to commission_calculation object for easier access
      const paymentsWithCommissions = (paymentsData || []).map((payment: any) => ({
        ...payment,
        commission_calculation: Array.isArray(payment.commission_calculations)
          ? payment.commission_calculations[0]
          : payment.commission_calculations
      })) as PaymentWithCommission[]

      setPayments(paymentsWithCommissions)
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  // Fetch payments data
  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Fetch parent payment when viewing a rebill
  useEffect(() => {
    const fetchParentPayment = async () => {
      if (viewingPayment?.payment_type === 'Rebill' && (viewingPayment as any).parent_payment_id) {
        const { data, error } = await supabase
          .from('payments')
          .select(`
            *,
            deal_types (
              id,
              name,
              display_name,
              conversion_rate,
              is_backend
            ),
            commission_calculations (
              id,
              closer_commission,
              setter_commission,
              csm_commission,
              tier_min_deals,
              tier_max_deals,
              closer_rate,
              setter_rate,
              created_at
            )
          `)
          .eq('id', (viewingPayment as any).parent_payment_id)
          .single()

        if (!error && data) {
          const parentWithCommission = {
            ...(data as any),
            commission_calculation: Array.isArray((data as any).commission_calculations)
              ? (data as any).commission_calculations[0]
              : (data as any).commission_calculations
          } as PaymentWithCommission
          setParentPayment(parentWithCommission)
        }
      } else {
        setParentPayment(undefined)
      }
    }

    fetchParentPayment()
  }, [viewingPayment])

  // Get unique employees by position
  const employeesByPosition = useMemo(() => {
    const closers = new Set<string>()
    const setters = new Set<string>()
    const csms = new Set<string>()

    payments.forEach(payment => {
      if (payment.closer_assigned && payment.closer_assigned !== 'Unassigned') {
        closers.add(payment.closer_assigned)
      }
      if (payment.setter_assigned && payment.setter_assigned !== 'Unassigned') {
        setters.add(payment.setter_assigned)
      }
      if (payment.assigned_csm && payment.assigned_csm !== 'N/A') {
        csms.add(payment.assigned_csm)
      }
    })

    return {
      closer: Array.from(closers).sort(),
      setter: Array.from(setters).sort(),
      csm: Array.from(csms).sort()
    }
  }, [payments])

  // Reset employee filter when position changes
  useEffect(() => {
    setEmployeeFilter('all')
  }, [positionFilter])

  // Filter payments based on search and filters
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const dealTypeName = payment.deal_types?.display_name || payment.deal_types?.name || ''

      const matchesSearch =
        payment.billing_full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dealTypeName.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || payment.service_agreement_status === statusFilter
      const matchesDealType = dealTypeFilter === 'all' || dealTypeName === dealTypeFilter

      // Position and employee filter logic
      let matchesPositionAndEmployee = true
      if (positionFilter !== 'all') {
        if (employeeFilter !== 'all') {
          // Filter by specific employee in position
          if (positionFilter === 'closer') {
            matchesPositionAndEmployee = payment.closer_assigned === employeeFilter
          } else if (positionFilter === 'setter') {
            matchesPositionAndEmployee = payment.setter_assigned === employeeFilter
          } else if (positionFilter === 'csm') {
            matchesPositionAndEmployee = payment.assigned_csm === employeeFilter
          }
        } else {
          // Filter by position only (show all payments where this position is assigned)
          if (positionFilter === 'closer') {
            matchesPositionAndEmployee = !!(payment.closer_assigned && payment.closer_assigned !== 'Unassigned')
          } else if (positionFilter === 'setter') {
            matchesPositionAndEmployee = !!(payment.setter_assigned && payment.setter_assigned !== 'Unassigned')
          } else if (positionFilter === 'csm') {
            matchesPositionAndEmployee = !!(payment.assigned_csm && payment.assigned_csm !== 'N/A')
          }
        }
      }

      return matchesSearch && matchesStatus && matchesDealType && matchesPositionAndEmployee
    })
  }, [payments, searchTerm, statusFilter, dealTypeFilter, positionFilter, employeeFilter])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalPayments = filteredPayments.length
    const totalAmount = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    const completedPayments = filteredPayments.filter(p => p.service_agreement_status === 'completed')
    const completedAmount = completedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)

    // Calculate commission based on position filter
    let totalCloserCommission = 0
    let totalSetterCommission = 0
    let totalCSMCommission = 0

    completedPayments.forEach(payment => {
      if (positionFilter === 'all' || positionFilter === 'closer') {
        totalCloserCommission += payment.commission_calculation?.closer_commission || 0
      }
      if (positionFilter === 'all' || positionFilter === 'setter') {
        totalSetterCommission += payment.commission_calculation?.setter_commission || 0
      }
      if (positionFilter === 'all' || positionFilter === 'csm') {
        totalCSMCommission += payment.commission_calculation?.csm_commission || 0
      }
    })

    return {
      totalPayments,
      totalAmount,
      completedPayments: completedPayments.length,
      completedAmount,
      totalCloserCommission,
      totalSetterCommission,
      totalCSMCommission,
      totalCommissions: totalCloserCommission + totalSetterCommission + totalCSMCommission
    }
  }, [filteredPayments, positionFilter])

  // Get unique deal types for filter
  const dealTypes = useMemo(() => {
    const types = [...new Set(payments.map(p => p.deal_types?.display_name || p.deal_types?.name || ''))]
    return types.filter(t => t).sort()
  }, [payments])

  const handleDeletePayment = async (payment: Payment) => {
    if (window.confirm(`Are you sure you want to delete the payment for ${payment.billing_full_name}?`)) {
      try {
        await deletePayment.mutateAsync(payment.id!)
        fetchPayments() // Refresh the payments list
      } catch (error) {
        console.error('Error deleting payment:', error)
        alert('Failed to delete payment. Please try again.')
      }
    }
  }

  // Check if payment has at least one team member assigned
  const hasValidAssignment = (payment: PaymentWithCommission) => {
    const hasSetterAssigned = payment.setter_assigned && payment.setter_assigned !== 'Unassigned'
    const hasCloserAssigned = payment.closer_assigned && payment.closer_assigned !== 'Unassigned'
    const hasCSMAssigned = payment.assigned_csm && payment.assigned_csm !== 'N/A'

    // Count how many are assigned
    const assignedCount = [hasSetterAssigned, hasCloserAssigned, hasCSMAssigned].filter(Boolean).length

    // Must have at least one assignment
    return assignedCount >= 1
  }

  const getStatusBadge = (status: ServiceAgreementStatus) => {
    return (
      <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
        {status === 'completed' ? (
          <>
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </>
        ) : (
          <>
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </>
        )}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading commission data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            Commission Tracker
          </h1>
          <p className="text-muted-foreground">
            Manage payments, track commissions, and monitor team performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowPaymentForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Payments"
          value={summaryStats.totalPayments}
          subtitle={formatCurrency(summaryStats.totalAmount)}
          color="blue"
          icon={Users}
        />
        <KPICard
          title="Completed Payments"
          value={summaryStats.completedPayments}
          subtitle={formatCurrency(summaryStats.completedAmount)}
          color="green"
          icon={CheckCircle}
        />
        <KPICard
          title="Total Commissions"
          value={formatCurrency(summaryStats.totalCommissions)}
          subtitle={`${summaryStats.completedPayments} deals processed`}
          color="purple"
          icon={Calculator}
          format="currency"
        />
        <KPICard
          title="Avg Commission Rate"
          value={summaryStats.completedAmount > 0 ?
            ((summaryStats.totalCommissions / summaryStats.completedAmount) * 100).toFixed(1) + '%' : '0%'
          }
          subtitle="Across all deal types"
          color="cyan"
          icon={TrendingUp}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* First row: Search, Status, Deal Type, Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search by name, email, or deal type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deal Type</label>
                <Select value={dealTypeFilter} onValueChange={setDealTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Deal Types</SelectItem>
                    {dealTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <DateRangePicker
                  value={dateRange}
                  onChange={(range) => setDateRange(range)}
                />
              </div>
            </div>

            {/* Second row: Position and Employee Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 mt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Position
                </label>
                <Select value={positionFilter} onValueChange={(value: any) => setPositionFilter(value)}>
                  <SelectTrigger className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    <SelectItem value="closer">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Closer
                      </div>
                    </SelectItem>
                    <SelectItem value="setter">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        Setter
                      </div>
                    </SelectItem>
                    <SelectItem value="csm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500" />
                        CSM
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Employee
                  {positionFilter !== 'all' && (
                    <Badge variant="outline" className="text-xs">
                      {positionFilter === 'closer' ? 'Closers' : positionFilter === 'setter' ? 'Setters' : 'CSMs'}
                    </Badge>
                  )}
                </label>
                <Select
                  value={employeeFilter}
                  onValueChange={setEmployeeFilter}
                  disabled={positionFilter === 'all'}
                >
                  <SelectTrigger className={cn(
                    "transition-all",
                    positionFilter === 'all' && "opacity-50 cursor-not-allowed",
                    positionFilter === 'closer' && "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
                    positionFilter === 'setter' && "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
                    positionFilter === 'csm' && "bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800"
                  )}>
                    <SelectValue placeholder={positionFilter === 'all' ? 'Select position first' : 'All employees'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {positionFilter !== 'all' && employeesByPosition[positionFilter].map(employee => (
                      <SelectItem key={employee} value={employee}>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            positionFilter === 'closer' && "bg-blue-500",
                            positionFilter === 'setter' && "bg-orange-500",
                            positionFilter === 'csm' && "bg-cyan-500"
                          )} />
                          {employee}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payments & Commissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Deal Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Setter</TableHead>
                  <TableHead>Closer</TableHead>
                  <TableHead>CSM</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-foreground">{payment.billing_full_name}</div>
                        <div className="text-xs text-muted-foreground">{payment.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseLocalDate(payment.payment_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-lg text-green-600 dark:text-green-400">
                        {formatCurrency(Number(payment.amount))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={payment.payment_type === 'Rebill'
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                          : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                        }
                      >
                        {payment.payment_type || 'New Deal'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900/50">
                        {payment.deal_types?.display_name || payment.deal_types?.name || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.service_agreement_status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {payment.setter_assigned && payment.setter_assigned !== 'Unassigned' ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <span className="text-sm font-medium">{payment.setter_assigned}</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {payment.closer_assigned && payment.closer_assigned !== 'Unassigned' ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-sm font-medium">{payment.closer_assigned}</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs font-medium",
                          payment.assigned_csm !== 'N/A' && "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300"
                        )}
                      >
                        {payment.assigned_csm}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.commission_calculation ? (
                        <div className="space-y-1.5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                          {payment.commission_calculation.closer_commission > 0 && (
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span className="text-xs font-medium text-muted-foreground">Closer:</span>
                              </div>
                              <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                                {formatCurrency(payment.commission_calculation.closer_commission)}
                              </span>
                            </div>
                          )}
                          {payment.commission_calculation.setter_commission > 0 && (
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                <span className="text-xs font-medium text-muted-foreground">Setter:</span>
                              </div>
                              <span className="font-mono font-bold text-sm text-orange-600 dark:text-orange-400">
                                {formatCurrency(payment.commission_calculation.setter_commission)}
                              </span>
                            </div>
                          )}
                          {payment.commission_calculation.csm_commission > 0 && (
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                <span className="text-xs font-medium text-muted-foreground">CSM:</span>
                              </div>
                              <span className="font-mono font-bold text-sm text-cyan-600 dark:text-cyan-400">
                                {formatCurrency(payment.commission_calculation.csm_commission)}
                              </span>
                            </div>
                          )}
                          <div className="pt-1.5 mt-1.5 border-t border-slate-300 dark:border-slate-600">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs font-semibold text-foreground">Total:</span>
                              <span className="font-mono font-bold text-sm text-green-600 dark:text-green-400">
                                {formatCurrency(
                                  payment.commission_calculation.closer_commission +
                                  payment.commission_calculation.setter_commission +
                                  payment.commission_calculation.csm_commission
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-3 px-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                          <span className="text-xs text-muted-foreground font-medium">
                            {!hasValidAssignment(payment) ? '⚠️ Assign Team' : '💤 Not calculated'}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setViewingPayment(payment)
                          }}
                          className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            console.log('Edit button clicked for payment:', payment.id)
                            setEditingPayment(payment)
                            setShowPaymentForm(true)
                          }}
                          className="hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePayment(payment)
                          }}
                          disabled={deletePayment.isPending}
                          className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredPayments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payments found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Form Dialog */}
      <PaymentForm
        open={showPaymentForm}
        onOpenChange={(open) => {
          setShowPaymentForm(open)
          if (!open) {
            setEditingPayment(undefined)
          }
        }}
        payment={editingPayment}
        onSuccess={() => {
          fetchPayments()
          setShowPaymentForm(false)
          setEditingPayment(undefined)
        }}
      />

      {/* Payment Details Dialog */}
      <Dialog open={!!viewingPayment} onOpenChange={() => setViewingPayment(undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Complete information for this payment and commission calculation
            </DialogDescription>
          </DialogHeader>

          {viewingPayment && (
            <div className="space-y-6">
              {/* Client Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Client Name</label>
                  <p className="font-medium">{viewingPayment.billing_full_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p>{viewingPayment.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Amount</label>
                  <p className="font-mono font-semibold text-lg">{formatCurrency(Number(viewingPayment.amount))}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Date</label>
                  <p>{format(parseLocalDate(viewingPayment.payment_date), 'PPP')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Type</label>
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    {viewingPayment.payment_type || 'New Deal'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Deal Type</label>
                  <Badge variant="outline">
                    {viewingPayment.deal_types?.display_name || viewingPayment.deal_types?.name || 'Unknown'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  {getStatusBadge(viewingPayment.service_agreement_status)}
                </div>
              </div>

              {/* Parent Payment Info for Rebills */}
              {viewingPayment.payment_type === 'Rebill' && parentPayment && (
                <div className="border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-r-lg">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
                    <span>🔗</span>
                    Linked to Parent Deal
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Parent Payment Date</label>
                      <p className="font-medium">{format(parseLocalDate(parentPayment.payment_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Parent Amount</label>
                      <p className="font-mono font-semibold">{formatCurrency(Number(parentPayment.amount))}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Parent Deal Type</label>
                      <Badge variant="outline" className="text-xs">
                        {parentPayment.deal_types?.display_name || 'Unknown'}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Inherited Commission Rate</label>
                      <p className="font-semibold text-purple-700 dark:text-purple-400">
                        {parentPayment.commission_calculation?.closer_rate || parentPayment.commission_calculation?.setter_rate || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Assignments */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assigned Setter</label>
                  <p>{viewingPayment.setter_assigned || 'Unassigned'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assigned Closer</label>
                  <p>{viewingPayment.closer_assigned || 'Unassigned'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assigned CSM</label>
                  <Badge variant="secondary">{viewingPayment.assigned_csm}</Badge>
                </div>
              </div>

              {/* Commission Details */}
              {viewingPayment.commission_calculation && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-medium mb-3">Commission Breakdown</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Closer Commission</label>
                      <p className="font-mono font-semibold">{formatCurrency(viewingPayment.commission_calculation.closer_commission)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Setter Commission</label>
                      <p className="font-mono font-semibold">{formatCurrency(viewingPayment.commission_calculation.setter_commission)}</p>
                    </div>
                    {viewingPayment.commission_calculation.csm_commission > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">CSM Commission</label>
                        <p className="font-mono font-semibold">{formatCurrency(viewingPayment.commission_calculation.csm_commission)}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Commission Tier</label>
                      <p>{viewingPayment.commission_calculation.closer_rate}% / {viewingPayment.commission_calculation.setter_rate}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}