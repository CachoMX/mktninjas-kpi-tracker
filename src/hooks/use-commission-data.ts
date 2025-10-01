'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Payment, DealType, CSM, CommissionCalculation, PaymentWithDealType } from '@/types/database'

// Payment with commission calculations joined
interface PaymentWithCommissions extends Payment {
  commission_calculations?: CommissionCalculation[]
}

// Commission tiers based on requirements
export const COMMISSION_TIERS = [
  { min_deals: 0, max_deals: 12, closer_rate: 8, setter_rate: 3 },
  { min_deals: 13, max_deals: 19, closer_rate: 9, setter_rate: 4 },
  { min_deals: 20, max_deals: 25, closer_rate: 10, setter_rate: 5 },
  { min_deals: 26, max_deals: 30, closer_rate: 11, setter_rate: 6 },
  { min_deals: 31, max_deals: null, closer_rate: 12, setter_rate: 7 }
]

// Hook to fetch payments
export function usePayments(dateRange?: { from: Date; to: Date }) {
  return useQuery({
    queryKey: ['payments', dateRange],
    queryFn: async () => {
      let query = supabase
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
            closer_commission,
            setter_commission,
            csm_commission,
            tier_min_deals,
            tier_max_deals,
            closer_rate,
            setter_rate
          )
        `)
        .order('payment_date', { ascending: false })

      if (dateRange) {
        const fromDate = dateRange.from.toISOString().split('T')[0]
        const toDate = dateRange.to.toISOString().split('T')[0]
        query = query.gte('payment_date', fromDate).lte('payment_date', toDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data as PaymentWithDealType[]
    }
  })
}

// Hook to fetch deal types
export function useDealTypes() {
  return useQuery({
    queryKey: ['deal-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_types')
        .select('*')
        .order('display_name')

      if (error) throw error
      return data as DealType[]
    }
  })
}

// Hook to fetch CSMs
export function useCSMs() {
  return useQuery({
    queryKey: ['csms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csms')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data as CSM[]
    }
  })
}

// Hook to fetch team members (setters and closers)
export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      // Get setters
      const { data: setters, error: settersError } = await supabase
        .from('setter_kpi_submissions')
        .select('full_name, email_address')
        .order('full_name')

      if (settersError) throw settersError

      // Get closers
      const { data: closers, error: closersError } = await supabase
        .from('closer_eod_submissions')
        .select('full_name, email_address')
        .order('full_name')

      if (closersError) throw closersError

      // Create unique lists with proper typing
      const setterData: { full_name: string; email_address: string }[] = setters || []
      const closerData: { full_name: string; email_address: string }[] = closers || []

      const uniqueSetters = Array.from(
        new Map(setterData.map(s => [s.full_name, { full_name: s.full_name, email: s.email_address, role: 'setter' as const }])).values()
      )

      const uniqueClosers = Array.from(
        new Map(closerData.map(c => [c.full_name, { full_name: c.full_name, email: c.email_address, role: 'closer' as const }])).values()
      )

      return {
        setters: uniqueSetters,
        closers: uniqueClosers,
        all: [...uniqueSetters, ...uniqueClosers]
      }
    }
  })
}

// Commission calculation utilities
export function calculateSixMonthEquivalent(dealType: string, amount: number = 1): number {
  // Map deal types to commission calculation rates
  const conversions: Record<string, number> = {
    // Deal types (actual deal types from deal_types table)
    'google_ads': 1/3, // 3 Google Ads = 1 six-month deal
    'referral_network_6_months': 1,
    'referral_network_3_months': 0.5, // 2 three-month = 1 six-month
    'referral_network_4_months': 0.5, // 2 four-month = 1 six-month
    'service_upgrade': 0, // No count towards six-month deals

    // Legacy fallbacks for old data
    'New Deal': 1, // Standard deal = 1 six-month equivalent
    'Rebill': 1, // Rebill still counts as full deal for six-month calculation
    'Manual Classification Needed': 1 // Default to standard deal
  }

  // Default to 1 if deal type not found (treat as standard deal)
  return (conversions[dealType] || 1) * amount
}

// Calculate rebill commission percentage based on consecutive rebills
export function calculateRebillPercentage(): number {
  // This would need to query the database to count consecutive rebills for this client
  // For now, return a base percentage that can be enhanced later
  return 0.02 // 2% base rate for rebills
}

export function getCommissionTier(sixMonthDeals: number) {
  return COMMISSION_TIERS.find(tier =>
    sixMonthDeals >= tier.min_deals &&
    (tier.max_deals === null || sixMonthDeals <= tier.max_deals)
  ) || COMMISSION_TIERS[0]
}

export function calculateCommissions(
  payment: Payment,
  sixMonthDealsInMonth: number,
  dealType: DealType | null
) {
  const amount = Number(payment.amount)
  const tier = getCommissionTier(sixMonthDealsInMonth)

  let closerCommission = 0
  let setterCommission = 0
  let csmCommission = 0

  // Backend deals (service upgrades) - only CSM gets commission
  if (dealType?.is_backend) {
    csmCommission = amount * 0.03 // 3% for CSM
  } else {
    // Regular deals - setter and closer get commission
    if (payment.service_agreement_status === 'completed') {
      closerCommission = amount * (tier.closer_rate / 100)
      setterCommission = amount * (tier.setter_rate / 100)
    }
  }

  return {
    closer_commission: closerCommission,
    setter_commission: setterCommission,
    csm_commission: csmCommission,
    tier
  }
}

// Hook to calculate monthly commission summary
export function useMonthlyCommissionSummary(month: string) {
  return useQuery({
    queryKey: ['monthly-commission-summary', month],
    queryFn: async () => {
      const startDate = `${month}-01`
      const endDate = `${month}-31`

      const { data: payments, error } = await supabase
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
          commission_calculations (*)
        `)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date')

      if (error) throw error

      // Calculate summary statistics with proper typing
      const paymentsData: PaymentWithCommissions[] = payments || []
      const totalPayments = paymentsData.length
      const totalAmount = paymentsData.reduce((sum, p) => sum + Number(p.amount), 0)
      const completedPayments = paymentsData.filter(p => p.service_agreement_status === 'completed')
      const completedAmount = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0)

      // Calculate six-month equivalent deals for the month
      const sixMonthDeals = paymentsData.reduce((sum, payment: any) => {
        const dealTypeName = payment.deal_types?.name || 'referral_network_6_months'
        return sum + calculateSixMonthEquivalent(dealTypeName)
      }, 0)

      // Calculate total commissions
      const totalCloserCommission = completedPayments.reduce((sum, p) =>
        sum + (p.commission_calculations?.[0]?.closer_commission || 0), 0)
      const totalSetterCommission = completedPayments.reduce((sum, p) =>
        sum + (p.commission_calculations?.[0]?.setter_commission || 0), 0)
      const totalCSMCommission = completedPayments.reduce((sum, p) =>
        sum + (p.commission_calculations?.[0]?.csm_commission || 0), 0)

      // Group by person
      const byPerson: Record<string, { name: string; role: string; commission: number; deals: number }> = {}

      completedPayments.forEach(payment => {
        const calc = payment.commission_calculations?.[0]

        if (calc) {
          // Closer commission
          if (payment.closer_assigned && calc.closer_commission > 0) {
            const key = `closer_${payment.closer_assigned}`
            if (!byPerson[key]) {
              byPerson[key] = { name: payment.closer_assigned, role: 'closer', commission: 0, deals: 0 }
            }
            byPerson[key].commission += calc.closer_commission
            byPerson[key].deals += 1
          }

          // Setter commission
          if (payment.setter_assigned && calc.setter_commission > 0) {
            const key = `setter_${payment.setter_assigned}`
            if (!byPerson[key]) {
              byPerson[key] = { name: payment.setter_assigned, role: 'setter', commission: 0, deals: 0 }
            }
            byPerson[key].commission += calc.setter_commission
            byPerson[key].deals += 1
          }

          // CSM commission
          if (calc.csm_commission > 0) {
            const key = `csm_${payment.assigned_csm}`
            if (!byPerson[key]) {
              byPerson[key] = { name: payment.assigned_csm, role: 'csm', commission: 0, deals: 0 }
            }
            byPerson[key].commission += calc.csm_commission
            byPerson[key].deals += 1
          }
        }
      })

      return {
        month,
        total_payments: totalPayments,
        total_amount: totalAmount,
        completed_payments: completedPayments.length,
        completed_amount: completedAmount,
        six_month_deals: sixMonthDeals,
        total_closer_commission: totalCloserCommission,
        total_setter_commission: totalSetterCommission,
        total_csm_commission: totalCSMCommission,
        by_person: Object.values(byPerson).sort((a, b) => b.commission - a.commission)
      }
    }
  })
}

// Mutation to create/update payment
export function useCreatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payment: any) => {
      const { data, error } = await (supabase as any)
        .from('payments')
        .insert([payment])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-commission-summary'] })
    }
  })
}

// Mutation to update payment
export function useUpdatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const { data, error } = await (supabase as any)
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-commission-summary'] })
    }
  })
}

// Mutation to delete payment
export function useDeletePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-commission-summary'] })
    }
  })
}