'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { SetterKPISubmission, DashboardStats, FilterState } from '@/types/database'
import { format } from 'date-fns'

export function useKPIData(filters: FilterState) {
  return useQuery({
    queryKey: ['kpi-data', filters],
    queryFn: async (): Promise<SetterKPISubmission[]> => {
      try {
        let query = supabase
          .from('setter_kpi_submissions')
          .select('*')
          .gte('submission_date', format(filters.dateRange.from, 'yyyy-MM-dd'))
          .lte('submission_date', format(filters.dateRange.to, 'yyyy-MM-dd'))

        if (filters.setters.length > 0) {
          query = query.in('full_name', filters.setters)
        }

        const { data, error } = await query.order('submission_date', { ascending: false })

        if (error) {
          console.error('Supabase error:', error)
          return []
        }

        return data || []
      } catch (error) {
        console.error('KPI data fetch error:', error)
        return []
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

export function useDashboardStats(data: SetterKPISubmission[]): DashboardStats {
  if (!data.length) {
    return {
      totalDials: 0,
      totalPickups: 0,
      pickupRate: 0,
      totalConvos: 0,
      convoRate: 0,
      totalDQs: 0,
      totalAppointments: 0,
      totalDeals: 0,
      averagePerformanceScore: 0,
      showRate: 0,
    }
  }

  const totals = data.reduce((acc, curr) => ({
    dials: acc.dials + curr.dials_today,
    pickups: acc.pickups + curr.pickups_today,
    convos: acc.convos + curr.one_min_convos,
    dqs: acc.dqs + curr.dqs_today,
    appointments: acc.appointments + curr.qualified_appointments,
    deals: acc.deals + curr.deals_closed,
    scheduled: acc.scheduled + curr.discovery_calls_scheduled,
    showed: acc.showed + curr.prospects_showed_up,
    performanceScore: acc.performanceScore + curr.performance_score,
  }), {
    dials: 0,
    pickups: 0,
    convos: 0,
    dqs: 0,
    appointments: 0,
    deals: 0,
    scheduled: 0,
    showed: 0,
    performanceScore: 0,
  })

  return {
    totalDials: totals.dials,
    totalPickups: totals.pickups,
    pickupRate: totals.dials > 0 ? (totals.pickups / totals.dials) * 100 : 0,
    totalConvos: totals.convos,
    convoRate: totals.pickups > 0 ? (totals.convos / totals.pickups) * 100 : 0,
    totalDQs: totals.dqs,
    totalAppointments: totals.appointments,
    totalDeals: totals.deals,
    averagePerformanceScore: data.length > 0 ? totals.performanceScore / data.length : 0,
    showRate: totals.scheduled > 0 ? (totals.showed / totals.scheduled) * 100 : 0,
  }
}

export function useSetters() {
  return useQuery({
    queryKey: ['setters'],
    queryFn: async (): Promise<string[]> => {
      try {
        const { data, error } = await supabase
          .from('setter_kpi_submissions')
          .select('full_name')
          .order('full_name')

        if (error) {
          console.error('Supabase setters error:', error)
          return []
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const uniqueSetters = Array.from(new Set((data as any[])?.map(item => item.full_name) || []))
        return uniqueSetters
      } catch (error) {
        console.error('Setters fetch error:', error)
        return []
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  })
}