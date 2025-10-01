'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { SetterKPISubmission, CloserEODSubmission, KPISubmission, SetterDashboardStats, CloserDashboardStats, FilterState, UserRole } from '@/types/database'
import { format } from 'date-fns'

export function useKPIData(filters: FilterState, role: UserRole) {
  const fromDate = format(filters.dateRange.from, 'yyyy-MM-dd')
  const toDate = format(filters.dateRange.to, 'yyyy-MM-dd')
  
  return useQuery({
    queryKey: ['kpi-data', role, fromDate, toDate, filters.people.sort().join(',')],
    queryFn: async (): Promise<KPISubmission[]> => {
      console.log('🔍 useKPIData executing with params:', { role, fromDate, toDate, people: filters.people })
      
      try {
        // Simple direct query without test query first
        const tableName = role === 'setter' ? 'setter_kpi_submissions' : 'closer_eod_submissions'
        let query = supabase
          .from(tableName)
          .select('*')
          .gte('submission_date', fromDate)
          .lte('submission_date', toDate)

        if (filters.people.length > 0) {
          query = query.in('full_name', filters.people)
        }

        console.log('🔍 Executing query...')
        const { data, error } = await query.order('submission_date', { ascending: false })

        if (error) {
          console.error('❌ Query error:', error)
          throw error
        }

        console.log('✅ Query successful, found', data?.length || 0, 'records')
        return data || []
      } catch (error) {
        console.error('❌ useKPIData error:', error)
        throw error
      }
    },
  })
}

export function useSetterDashboardStats(data: SetterKPISubmission[]): SetterDashboardStats {
  if (!data.length) {
    return {
      totalDials: 0,
      totalPickups: 0,
      pickupRate: 0,
      totalConvos: 0,
      convoRate: 0,
      totalDQs: 0,
      totalFollowUps: 0,
      totalAppointments: 0,
      totalDiscoveryCalls: 0,
      totalShowedUp: 0,
      totalRescheduled: 0,
      totalFullTerritory: 0,
      averagePerformanceScore: 0,
      showRate: 0,
    }
  }

  const totals = data.reduce((acc, curr) => ({
    dials: acc.dials + (curr.dials_today || 0),
    pickups: acc.pickups + (curr.pickups_today || 0),
    convos: acc.convos + (curr.one_min_convos || 0),
    dqs: acc.dqs + (curr.dqs_today || 0),
    followUps: acc.followUps + (curr.follow_ups_today || 0),
    appointments: acc.appointments + (curr.qualified_appointments || 0),
    scheduled: acc.scheduled + (curr.discovery_calls_scheduled || 0),
    showed: acc.showed + (curr.prospects_showed_up || 0),
    rescheduled: acc.rescheduled + (curr.prospects_rescheduled || 0),
    fullTerritory: acc.fullTerritory + (curr.prospects_full_territory || 0),
    performanceScore: acc.performanceScore + (curr.performance_score || 0),
  }), {
    dials: 0,
    pickups: 0,
    convos: 0,
    dqs: 0,
    followUps: 0,
    appointments: 0,
    scheduled: 0,
    showed: 0,
    rescheduled: 0,
    fullTerritory: 0,
    performanceScore: 0,
  })

  return {
    totalDials: totals.dials,
    totalPickups: totals.pickups,
    pickupRate: totals.dials > 0 ? (totals.pickups / totals.dials) * 100 : 0,
    totalConvos: totals.convos,
    convoRate: totals.pickups > 0 ? (totals.convos / totals.pickups) * 100 : 0,
    totalDQs: totals.dqs,
    totalFollowUps: totals.followUps,
    totalAppointments: totals.appointments,
    totalDiscoveryCalls: totals.scheduled,
    totalShowedUp: totals.showed,
    totalRescheduled: totals.rescheduled,
    totalFullTerritory: totals.fullTerritory,
    averagePerformanceScore: data.length > 0 ? totals.performanceScore / data.length : 0,
    showRate: totals.scheduled > 0 ? (totals.showed / totals.scheduled) * 100 : 0,
  }
}

export function useCloserDashboardStats(data: CloserEODSubmission[]): CloserDashboardStats {
  if (!data.length) {
    return {
      totalAppointmentsOnCalendar: 0,
      totalLiveCalls: 0,
      totalNoShows: 0,
      noShowRate: 0,
      totalFollowUpCallsScheduled: 0,
      totalCallsRescheduled: 0,
      totalOffersMade: 0,
      totalDealsClosingRate: 0,
      totalDealsClosed: 0,
      totalDepositsCollected: 0,
      totalCashCollected: 0,
      averageCashPerDeal: 0,
      averagePerformanceScore: 0,
      averageFocusScore: 0,
    }
  }

  const totals = data.reduce((acc, curr) => ({
    appointmentsOnCalendar: acc.appointmentsOnCalendar + (curr.appointments_on_calendar || 0),
    liveCalls: acc.liveCalls + (curr.live_calls_today || 0),
    noShows: acc.noShows + (curr.no_shows_today || 0),
    followUpCalls: acc.followUpCalls + (curr.follow_up_calls_scheduled || 0),
    callsRescheduled: acc.callsRescheduled + (curr.calls_rescheduled || 0),
    offersMade: acc.offersMade + (curr.offers_made || 0),
    dealsClosed: acc.dealsClosed + (curr.deals_closed || 0),
    depositsCollected: acc.depositsCollected + (curr.deposits_collected || 0),
    cashCollected: acc.cashCollected + (curr.cash_collected || 0),
    performanceScore: acc.performanceScore + (curr.performance_score || 0),
    focusScore: acc.focusScore + (curr.focus_score || 0),
  }), {
    appointmentsOnCalendar: 0,
    liveCalls: 0,
    noShows: 0,
    followUpCalls: 0,
    callsRescheduled: 0,
    offersMade: 0,
    dealsClosed: 0,
    depositsCollected: 0,
    cashCollected: 0,
    performanceScore: 0,
    focusScore: 0,
  })

  return {
    totalAppointmentsOnCalendar: totals.appointmentsOnCalendar,
    totalLiveCalls: totals.liveCalls,
    totalNoShows: totals.noShows,
    noShowRate: totals.appointmentsOnCalendar > 0 ? (totals.noShows / totals.appointmentsOnCalendar) * 100 : 0,
    totalFollowUpCallsScheduled: totals.followUpCalls,
    totalCallsRescheduled: totals.callsRescheduled,
    totalOffersMade: totals.offersMade,
    totalDealsClosingRate: totals.offersMade > 0 ? (totals.dealsClosed / totals.offersMade) * 100 : 0,
    totalDealsClosed: totals.dealsClosed,
    totalDepositsCollected: totals.depositsCollected,
    totalCashCollected: totals.cashCollected,
    averageCashPerDeal: totals.dealsClosed > 0 ? totals.cashCollected / totals.dealsClosed : 0,
    averagePerformanceScore: data.length > 0 ? totals.performanceScore / data.length : 0,
    averageFocusScore: data.length > 0 ? totals.focusScore / data.length : 0,
  }
}

export function usePeople(role: UserRole) {
  const tableName = role === 'setter' ? 'setter_kpi_submissions' : 'closer_eod_submissions'
  const queryKey = role === 'setter' ? 'setters' : 'closers'

  return useQuery({
    queryKey: [queryKey],
    queryFn: async (): Promise<string[]> => {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('full_name')
          .order('full_name')

        if (error) {
          console.error(`Supabase ${queryKey} error:`, error)
          return []
        }

        const uniquePeople = Array.from(new Set((data as any[])?.map(item => item.full_name) || []))
        return uniquePeople
      } catch (error) {
        console.error(`${queryKey} fetch error:`, error)
        return []
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

// Backward compatibility
export function useSetters() {
  return usePeople('setter')
}

export function useClosers() {
  return usePeople('closer')
}