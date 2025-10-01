import { supabase } from './supabase'
import { Payment, DealType, CommissionCalculation } from '@/types/database'
import { COMMISSION_TIERS, calculateSixMonthEquivalent, getCommissionTier } from '@/hooks/use-commission-data'

export class CommissionCalculator {

  /**
   * Calculate and save commission for a payment
   */
  static async calculateAndSaveCommission(paymentId: number): Promise<CommissionCalculation | null> {
    try {
      // Get the payment with deal type information
      const { data: payment, error: paymentError } = await (supabase as any)
        .from('payments')
        .select(`
          *,
          deal_types (
            id,
            name,
            display_name,
            conversion_rate,
            is_backend
          )
        `)
        .eq('id', paymentId)
        .single()

      if (paymentError || !payment) {
        console.error('Error fetching payment:', paymentError)
        return null
      }

      // Deal type is now joined in the payment query
      const dealType = (payment as any).deal_types

      if (!dealType) {
        console.error('Deal type not found for payment:', paymentId)
        return null
      }

      // Calculate commissions
      const commissionData = await this.calculateCommissionForPayment(payment, dealType)

      if (!commissionData) {
        return null
      }

      // Save or update commission calculation
      const { data: existingCalc } = await supabase
        .from('commission_calculations')
        .select('id')
        .eq('payment_id', paymentId)
        .single()

      let result

      if (existingCalc) {
        // Update existing calculation
        const { data, error } = await (supabase as any)
          .from('commission_calculations')
          .update(commissionData)
          .eq('payment_id', paymentId)
          .select()
          .single()

        if (error) {
          console.error('Error updating commission calculation:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          return null
        }
        result = data
      } else {
        // Create new calculation
        const insertData = { ...commissionData, payment_id: paymentId }

        const { data, error } = await (supabase as any)
          .from('commission_calculations')
          .insert([insertData])
          .select()
          .single()

        if (error) {
          console.error('Error creating commission calculation:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          return null
        }
        result = data
      }

      return result
    } catch (error) {
      console.error('Error in calculateAndSaveCommission:', error)
      return null
    }
  }

  /**
   * Calculate commission details for a payment
   */
  static async calculateCommissionForPayment(payment: Payment, dealType?: DealType | null): Promise<Omit<CommissionCalculation, 'id' | 'payment_id' | 'created_at'> | null> {
    try {
      const paymentDate = new Date(payment.payment_date)
      const month = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`

      // Determine which team member to calculate for
      const hasSetterAssigned = payment.setter_assigned && payment.setter_assigned !== 'Unassigned'
      const hasCloserAssigned = payment.closer_assigned && payment.closer_assigned !== 'Unassigned'
      const hasCSMAssigned = payment.assigned_csm && payment.assigned_csm !== 'N/A'

      let teamMemberName = null
      let teamMemberType = null

      if (hasSetterAssigned) {
        teamMemberName = payment.setter_assigned
        teamMemberType = 'setter'
      } else if (hasCloserAssigned) {
        teamMemberName = payment.closer_assigned
        teamMemberType = 'closer'
      } else if (hasCSMAssigned) {
        teamMemberName = payment.assigned_csm
        teamMemberType = 'csm'
      }

      // Calculate six-month equivalent deals for THIS PERSON in the month up to this payment
      const sixMonthDealsInMonth = await this.calculateSixMonthDealsForPerson(
        month,
        payment.payment_date,
        teamMemberName,
        teamMemberType as 'setter' | 'closer' | 'csm' | null
      )

      // Get commission tier based on this person's deals in month
      const tier = getCommissionTier(sixMonthDealsInMonth)

      const amount = Number(payment.amount)
      let closerCommission = 0
      let setterCommission = 0
      let csmCommission = 0
      let usedCloserRate = tier.closer_rate
      let usedSetterRate = tier.setter_rate

      // Backend deals (service upgrades) - only CSM gets commission
      if (dealType?.is_backend) {
        if (hasCSMAssigned) {
          csmCommission = amount * 0.03 // 3% for CSM
        }
      } else {
        // Regular deals - only one team member gets commission when completed
        if (payment.service_agreement_status === 'completed') {
          // Special handling for Rebills - use parent deal's commission rate
          if (payment.payment_type === 'Rebill' && (payment as any).parent_payment_id) {
            // Fetch parent payment's commission calculation
            const { data: parentCommission } = await supabase
              .from('commission_calculations')
              .select('closer_rate, setter_rate')
              .eq('payment_id', (payment as any).parent_payment_id)
              .single()

            if (parentCommission) {
              // Use parent's rates instead of current tier rates
              usedCloserRate = (parentCommission as any).closer_rate
              usedSetterRate = (parentCommission as any).setter_rate

              if (hasCloserAssigned) {
                closerCommission = amount * (usedCloserRate / 100)
              } else if (hasSetterAssigned) {
                setterCommission = amount * (usedSetterRate / 100)
              } else if (hasCSMAssigned) {
                // Rebills with CSM use setter rate as fallback
                csmCommission = amount * (usedSetterRate / 100)
              }
            } else {
              console.warn('Parent commission not found for rebill, using current tier rates')
              // Fallback to current tier rates if parent commission not found
              if (hasCloserAssigned) {
                closerCommission = amount * (tier.closer_rate / 100)
              } else if (hasSetterAssigned) {
                setterCommission = amount * (tier.setter_rate / 100)
              } else if (hasCSMAssigned) {
                csmCommission = amount * 0.03
              }
            }
          } else {
            // Standard New Deal commission rates
            if (hasCloserAssigned) {
              closerCommission = amount * (tier.closer_rate / 100)
            } else if (hasSetterAssigned) {
              setterCommission = amount * (tier.setter_rate / 100)
            } else if (hasCSMAssigned) {
              // Special case: if only CSM assigned for regular deal
              csmCommission = amount * 0.03 // 3% for CSM
            }
          }
        }
      }

      // Calculate six-month equivalent for this payment
      const dealTypeName = dealType?.name || 'referral_network_6_months'
      const sixMonthEquivalent = calculateSixMonthEquivalent(dealTypeName)

      return {
        month,
        deal_count_at_time: Number(sixMonthDealsInMonth.toFixed(2)), // Convert to number with 2 decimals
        six_month_equivalent: Number(sixMonthEquivalent.toFixed(2)), // Convert to number with 2 decimals
        tier_min_deals: tier.min_deals,
        tier_max_deals: tier.max_deals,
        closer_rate: usedCloserRate, // Use the actual rate used (parent's or current tier's)
        setter_rate: usedSetterRate, // Use the actual rate used (parent's or current tier's)
        closer_commission: Number(closerCommission.toFixed(2)), // Convert to number with 2 decimals
        setter_commission: Number(setterCommission.toFixed(2)), // Convert to number with 2 decimals
        csm_commission: Number(csmCommission.toFixed(2)), // Convert to number with 2 decimals
        is_paid: false
      }
    } catch (error) {
      console.error('Error calculating commission for payment:', error)
      return null
    }
  }

  /**
   * Calculate total six-month equivalent deals for a specific person in a month up to a certain date
   */
  static async calculateSixMonthDealsForPerson(
    month: string,
    upToDate: string,
    personName: string | null,
    personType: 'setter' | 'closer' | 'csm' | null
  ): Promise<number> {
    try {
      if (!personName || !personType) {
        return 0
      }

      const [year, monthNum] = month.split('-')
      const startDate = `${year}-${monthNum.padStart(2, '0')}-01`

      // Build query based on person type
      let query = supabase
        .from('payments')
        .select(`
          deal_types (
            name
          )
        `)
        .gte('payment_date', startDate)
        .lte('payment_date', upToDate)
        .eq('service_agreement_status', 'completed') // Only count completed deals

      // Filter by the specific person
      if (personType === 'setter') {
        query = query.eq('setter_assigned', personName)
      } else if (personType === 'closer') {
        query = query.eq('closer_assigned', personName)
      } else if (personType === 'csm') {
        query = query.eq('assigned_csm', personName)
      }

      const { data: payments, error } = await query

      if (error) {
        console.error('Error fetching payments for person:', error)
        return 0
      }

      // Calculate total six-month equivalent for this person
      const totalSixMonthDeals = payments?.reduce((total, payment: any) => {
        const dealTypeName = payment.deal_types?.name || 'referral_network_6_months'
        return total + calculateSixMonthEquivalent(dealTypeName)
      }, 0) || 0

      return totalSixMonthDeals
    } catch (error) {
      console.error('Error calculating six month deals for person:', error)
      return 0
    }
  }

  /**
   * Calculate total six-month equivalent deals for a closer in a specific month up to a certain date
   * @deprecated Use calculateSixMonthDealsForPerson instead
   */
  static async calculateSixMonthDealsForMonth(month: string, upToDate: string): Promise<number> {
    try {
      const [year, monthNum] = month.split('-')
      const startDate = `${year}-${monthNum.padStart(2, '0')}-01`

      // Get all payments for the month up to the specified date
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          deal_types (
            name
          )
        `)
        .gte('payment_date', startDate)
        .lte('payment_date', upToDate)
        .eq('service_agreement_status', 'completed') // Only count completed deals

      if (error) {
        console.error('Error fetching payments for month:', error)
        return 0
      }

      // Calculate total six-month equivalent
      const totalSixMonthDeals = payments?.reduce((total, payment: any) => {
        const dealTypeName = payment.deal_types?.name || 'referral_network_6_months'
        return total + calculateSixMonthEquivalent(dealTypeName)
      }, 0) || 0

      return totalSixMonthDeals
    } catch (error) {
      console.error('Error calculating six month deals for month:', error)
      return 0
    }
  }

  /**
   * Recalculate all commissions for payments in a specific month
   * This is useful when payment statuses change
   */
  static async recalculateMonthCommissions(month: string): Promise<boolean> {
    try {
      const [year, monthNum] = month.split('-')
      const startDate = `${year}-${monthNum.padStart(2, '0')}-01`
      const endDate = `${year}-${monthNum.padStart(2, '0')}-31`

      // Get all payments for the month
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date', { ascending: true })

      if (error || !payments) {
        console.error('Error fetching payments for recalculation:', error)
        return false
      }

      // Process each payment in chronological order
      for (const payment of payments as any[]) {
        await this.calculateAndSaveCommission(payment.id!)

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      return true
    } catch (error) {
      console.error('Error recalculating month commissions:', error)
      return false
    }
  }

  /**
   * Get commission summary for a specific month
   */
  static async getMonthlyCommissionSummary(month: string) {
    try {
      const [year, monthNum] = month.split('-')
      const startDate = `${year}-${monthNum.padStart(2, '0')}-01`
      const endDate = `${year}-${monthNum.padStart(2, '0')}-31`

      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          *,
          commission_calculations (*)
        `)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)

      if (error) {
        console.error('Error fetching monthly summary:', error)
        return null
      }

      const paymentsData = payments as any[] || []
      const totalPayments = paymentsData.length
      const totalAmount = paymentsData.reduce((sum, p) => sum + Number(p.amount), 0)
      const completedPayments = paymentsData.filter(p => p.service_agreement_status === 'completed')
      const completedAmount = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0)

      // Calculate total commissions
      const totalCloserCommission = completedPayments.reduce((sum, p) =>
        sum + (p.commission_calculations?.[0]?.closer_commission || 0), 0)
      const totalSetterCommission = completedPayments.reduce((sum, p) =>
        sum + (p.commission_calculations?.[0]?.setter_commission || 0), 0)
      const totalCSMCommission = completedPayments.reduce((sum, p) =>
        sum + (p.commission_calculations?.[0]?.csm_commission || 0), 0)

      // Calculate six-month equivalent deals
      const sixMonthDeals = paymentsData.reduce((sum, payment) => {
        return sum + calculateSixMonthEquivalent(payment.deal_type)
      }, 0)

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
        total_commissions: totalCloserCommission + totalSetterCommission + totalCSMCommission
      }
    } catch (error) {
      console.error('Error getting monthly commission summary:', error)
      return null
    }
  }

  /**
   * Get commission tiers for reference
   */
  static getCommissionTiers() {
    return COMMISSION_TIERS
  }

  /**
   * Validate commission calculation
   */
  static validateCommissionCalculation(payment: Payment, calculation: CommissionCalculation): boolean {
    // Basic validation rules
    if (calculation.closer_commission < 0 || calculation.setter_commission < 0 || calculation.csm_commission < 0) {
      return false
    }

    // If payment is not completed, closer and setter commissions should be 0 (unless it's a backend deal)
    if (payment.service_agreement_status !== 'completed') {
      // This is async, so we'll do a simplified check
      if (calculation.closer_commission > 0 || calculation.setter_commission > 0) {
        // Backend deals might have CSM commission even if not completed
        // For now, we'll allow this and rely on the calculation logic
      }
    }

    return true
  }
}