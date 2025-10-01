'use client'

import { useState, useMemo } from 'react'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import { Phone, Users, MessageSquare, CheckCircle, Calendar, Star, Target, DollarSign, UserCheck } from 'lucide-react'

import { DateRangePicker } from '@/components/filters/date-range-picker'
import { PeopleSelector } from '@/components/filters/setter-selector'
import { MetricToggles } from '@/components/filters/metric-toggles'
import { KPICard } from '@/components/cards/kpi-card'
import { CustomLineChart } from '@/components/charts/line-chart'
import { CustomBarChart } from '@/components/charts/bar-chart'
import { FunnelChart } from '@/components/charts/funnel-chart'
import { HeatmapCalendar } from '@/components/charts/heatmap-calendar'
import { LeaderboardTable } from '@/components/tables/leaderboard-table'
import { useKPIData, useSetterDashboardStats, useCloserDashboardStats, usePeople } from '@/hooks/use-kpi-data'
import { FilterState, LeaderboardEntry, TrendData, SetterKPISubmission, CloserEODSubmission } from '@/types/database'
import { useRole } from '@/contexts/role-context'
import { getDefaultMetrics } from '@/lib/metrics-config'

export default function DashboardPage() {
  const { currentRole } = useRole()

  const [filters, setFilters] = useState<FilterState>({
    people: [],
    dateRange: {
      from: startOfDay(subDays(new Date(), 30)),
      to: endOfDay(new Date()),
    },
    metrics: getDefaultMetrics(currentRole),
    role: currentRole,
  })

  // Use role-aware data hooks
  const { data: kpiData = [], isLoading: loading, error: queryError } = useKPIData(filters, currentRole)
  const { data: people = [] } = usePeople(currentRole)
  const error = queryError?.message || null

  // Data is already filtered by the hook based on filters
  const filteredKpiData = kpiData

  // Use role-aware dashboard stats - call both hooks unconditionally
  const setterStats = useSetterDashboardStats(filteredKpiData as SetterKPISubmission[])
  const closerStats = useCloserDashboardStats(filteredKpiData as CloserEODSubmission[])
  const dashboardStats = currentRole === 'setter' ? setterStats : closerStats
  
  // Data fetching is now handled by React Query hooks

  const trendData = useMemo((): TrendData[] => {
    if (!kpiData) return []

    const groupedData = kpiData.reduce((acc, curr) => {
      const date = curr.submission_date
      if (!acc[date]) {
        acc[date] = {
          date,
          dials: 0,
          pickups: 0,
          convos: 0,
          dqs: 0,
          followUps: 0,
          appointments: 0,
          discoveryCalls: 0,
          showedUp: 0,
          rescheduled: 0,
          fullTerritory: 0,
          deals: 0,
          performanceScore: 0,
          liveCalls: 0,
          noShows: 0,
          offersMade: 0,
          depositsCollected: 0,
          cashCollected: 0,
        }
      }

      if (currentRole === 'setter') {
        const item = curr as SetterKPISubmission
        (acc[date].dials as number) += item.dials_today || 0
        ;(acc[date].pickups as number) += item.pickups_today || 0
        ;(acc[date].convos as number) += item.one_min_convos || 0
        ;(acc[date].dqs as number) += item.dqs_today || 0
        ;(acc[date].followUps as number) += item.follow_ups_today || 0
        ;(acc[date].appointments as number) += item.qualified_appointments || 0
        ;(acc[date].discoveryCalls as number) += item.discovery_calls_scheduled || 0
        ;(acc[date].showedUp as number) += item.prospects_showed_up || 0
        ;(acc[date].rescheduled as number) += item.prospects_rescheduled || 0
        ;(acc[date].fullTerritory as number) += item.prospects_full_territory || 0
        acc[date].performanceScore = Math.max(acc[date].performanceScore as number, item.performance_score || 0)
      } else {
        const item = curr as CloserEODSubmission
        ;(acc[date].appointments as number) += item.appointments_on_calendar || 0
        ;(acc[date].liveCalls as number) += item.live_calls_today || 0
        ;(acc[date].noShows as number) += item.no_shows_today || 0
        ;(acc[date].followUps as number) += item.follow_up_calls_scheduled || 0
        ;(acc[date].rescheduled as number) += item.calls_rescheduled || 0
        ;(acc[date].offersMade as number) += item.offers_made || 0
        ;(acc[date].deals as number) += item.deals_closed || 0
        ;(acc[date].depositsCollected as number) += item.deposits_collected || 0
        ;(acc[date].cashCollected as number) += item.cash_collected || 0
        acc[date].performanceScore = Math.max(acc[date].performanceScore as number, item.performance_score || 0)
      }
      return acc
    }, {} as Record<string, TrendData>)

    // Add calculated metrics to each day
    const dataWithCalculatedMetrics = Object.values(groupedData).map(day => ({
      ...day,
      pickupRate: (day.dials as number) > 0 ? ((day.pickups as number) / (day.dials as number)) * 100 : 0,
      showRate: (day.discoveryCalls as number) > 0 ? ((day.showedUp as number) / (day.discoveryCalls as number)) * 100 : 0,
      noShowRate: (day.appointments as number) > 0 ? ((day.noShows as number) / (day.appointments as number)) * 100 : 0,
      closingRate: (day.offersMade as number) > 0 ? ((day.deals as number) / (day.offersMade as number)) * 100 : 0,
      averageCashPerDeal: (day.deals as number) > 0 ? (day.cashCollected as number) / (day.deals as number) : 0,
    }))

    return dataWithCalculatedMetrics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [kpiData, currentRole])

  const peoplePerformanceData = useMemo(() => {
    if (!kpiData) return []

    const grouped = kpiData.reduce((acc, curr) => {
      const name = curr.full_name
      if (!acc[name]) {
        acc[name] = {
          name,
          dials: 0,
          pickups: 0,
          convos: 0,
          dqs: 0,
          followUps: 0,
          appointments: 0,
          discoveryCalls: 0,
          showedUp: 0,
          rescheduled: 0,
          fullTerritory: 0,
          deals: 0,
          performanceScore: 0,
          liveCalls: 0,
          noShows: 0,
          offersMade: 0,
          depositsCollected: 0,
          cashCollected: 0,
        }
      }

      if (currentRole === 'setter') {
        const item = curr as SetterKPISubmission
        acc[name].dials += item.dials_today || 0
        acc[name].pickups += item.pickups_today || 0
        acc[name].convos += item.one_min_convos || 0
        acc[name].dqs += item.dqs_today || 0
        acc[name].followUps += item.follow_ups_today || 0
        acc[name].appointments += item.qualified_appointments || 0
        acc[name].discoveryCalls += item.discovery_calls_scheduled || 0
        acc[name].showedUp += item.prospects_showed_up || 0
        acc[name].rescheduled += item.prospects_rescheduled || 0
        acc[name].fullTerritory += item.prospects_full_territory || 0
        acc[name].performanceScore = Math.max(acc[name].performanceScore, item.performance_score || 0)
      } else {
        const item = curr as CloserEODSubmission
        acc[name].appointments += item.appointments_on_calendar || 0
        acc[name].liveCalls += item.live_calls_today || 0
        acc[name].noShows += item.no_shows_today || 0
        acc[name].followUps += item.follow_up_calls_scheduled || 0
        acc[name].rescheduled += item.calls_rescheduled || 0
        acc[name].offersMade += item.offers_made || 0
        acc[name].deals += item.deals_closed || 0
        acc[name].depositsCollected += item.deposits_collected || 0
        acc[name].cashCollected += item.cash_collected || 0
        acc[name].performanceScore = Math.max(acc[name].performanceScore, item.performance_score || 0)
      }
      return acc
    }, {} as Record<string, any>)

    // Add calculated metrics
    const dataWithCalculatedMetrics = Object.values(grouped).map(person => ({
      ...person,
      pickupRate: person.dials > 0 ? (person.pickups / person.dials) * 100 : 0,
      showRate: person.discoveryCalls > 0 ? (person.showedUp / person.discoveryCalls) * 100 : 0,
      noShowRate: person.appointments > 0 ? (person.noShows / person.appointments) * 100 : 0,
      closingRate: person.offersMade > 0 ? (person.deals / person.offersMade) * 100 : 0,
      averageCashPerDeal: person.deals > 0 ? person.cashCollected / person.deals : 0,
    }))

    // Sort by the most relevant metric for the role
    const sortKey = currentRole === 'setter' ? 'dials' : 'deals'
    return dataWithCalculatedMetrics.sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 10)
  }, [kpiData, currentRole])

  const funnelData = useMemo(() => {
    let allStages: any[] = []

    if (currentRole === 'setter') {
      const setterStats = dashboardStats as any
      allStages = [
        { key: 'dials_today', name: 'Dials', value: setterStats.totalDials || 0, color: '#3B82F6' },
        { key: 'pickups_today', name: 'Pickups', value: setterStats.totalPickups || 0, color: '#10B981' },
        { key: 'one_min_convos', name: '1min+ Convos', value: setterStats.totalConvos || 0, color: '#F59E0B' },
        { key: 'dqs_today', name: 'DQs', value: setterStats.totalDQs || 0, color: '#EF4444' },
        { key: 'follow_ups_today', name: 'Follow Ups', value: setterStats.totalFollowUps || 0, color: '#EC4899' },
        { key: 'qualified_appointments', name: 'Appointments', value: setterStats.totalAppointments || 0, color: '#8B5CF6' },
        { key: 'discovery_calls_scheduled', name: 'Discovery Calls', value: setterStats.totalDiscoveryCalls || 0, color: '#F97316' },
        { key: 'prospects_showed_up', name: 'Showed Up', value: setterStats.totalShowedUp || 0, color: '#22C55E' },
        { key: 'prospects_rescheduled', name: 'Rescheduled', value: setterStats.totalRescheduled || 0, color: '#F59E0B' },
        { key: 'prospects_full_territory', name: 'Full Territory', value: setterStats.totalFullTerritory || 0, color: '#A855F7' },
        { key: 'performance_score', name: 'Performance Score', value: setterStats.averagePerformanceScore || 0, color: '#84CC16' },
      ]
    } else {
      const closerStats = dashboardStats as any
      allStages = [
        { key: 'appointments_on_calendar', name: 'Appointments on Calendar', value: closerStats.totalAppointmentsOnCalendar || 0, color: '#3B82F6' },
        { key: 'live_calls_today', name: 'Live Calls', value: closerStats.totalLiveCalls || 0, color: '#10B981' },
        { key: 'no_shows_today', name: 'No Shows', value: closerStats.totalNoShows || 0, color: '#EF4444' },
        { key: 'follow_up_calls_scheduled', name: 'Follow-up Calls', value: closerStats.totalFollowUpCallsScheduled || 0, color: '#EC4899' },
        { key: 'calls_rescheduled', name: 'Calls Rescheduled', value: closerStats.totalCallsRescheduled || 0, color: '#F59E0B' },
        { key: 'offers_made', name: 'Offers Made', value: closerStats.totalOffersMade || 0, color: '#8B5CF6' },
        { key: 'deals_closed', name: 'Deals Closed', value: closerStats.totalDealsClosed || 0, color: '#22C55E' },
        { key: 'deposits_collected', name: 'Deposits Collected', value: closerStats.totalDepositsCollected || 0, color: '#F97316' },
        { key: 'cash_collected', name: 'Cash Collected', value: closerStats.totalCashCollected || 0, color: '#06B6D4' },
        { key: 'performance_score', name: 'Performance Score', value: closerStats.averagePerformanceScore || 0, color: '#84CC16' },
      ]
    }

    // Only include selected metrics, allow zero values to show
    const selectedStages = allStages
      .filter(stage => filters.metrics.includes(stage.key))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ key: _key, ...stage }) => stage) // Remove the key property

    return selectedStages
  }, [dashboardStats, filters.metrics, currentRole])

  const leaderboardData = useMemo((): LeaderboardEntry[] => {
    if (!kpiData) return []

    const aggregated = kpiData.reduce((acc, curr) => {
      const key = curr.full_name
      if (!acc[key]) {
        acc[key] = { ...curr, rank: 0, pickupRate: 0, convoRate: 0 } as any
      } else {
        if (currentRole === 'setter') {
          const item = curr as SetterKPISubmission
          const existing = acc[key] as any
          existing.dials_today += item.dials_today || 0
          existing.pickups_today += item.pickups_today || 0
          existing.one_min_convos += item.one_min_convos || 0
          existing.dqs_today += item.dqs_today || 0
          existing.qualified_appointments += item.qualified_appointments || 0
          existing.performance_score = Math.max(existing.performance_score, item.performance_score || 0)
        } else {
          const item = curr as CloserEODSubmission
          const existing = acc[key] as any
          existing.appointments_on_calendar = (existing.appointments_on_calendar || 0) + (item.appointments_on_calendar || 0)
          existing.live_calls_today = (existing.live_calls_today || 0) + (item.live_calls_today || 0)
          existing.deals_closed = (existing.deals_closed || 0) + (item.deals_closed || 0)
          existing.cash_collected = (existing.cash_collected || 0) + (item.cash_collected || 0)
          existing.performance_score = Math.max(existing.performance_score, item.performance_score || 0)
        }
      }
      return acc
    }, {} as Record<string, any>)

    return Object.values(aggregated).map((entry: any) => ({
      ...entry,
      rank: 1,
      pickupRate: entry.dials_today > 0 ? (entry.pickups_today / entry.dials_today) * 100 : 0,
      convoRate: entry.pickups_today > 0 ? (entry.one_min_convos / entry.pickups_today) * 100 : 0,
      noShowRate: entry.appointments_on_calendar > 0 ? (entry.no_shows_today / entry.appointments_on_calendar) * 100 : 0,
      closingRate: entry.offers_made > 0 ? (entry.deals_closed / entry.offers_made) * 100 : 0,
    })).sort((a, b) => b.performance_score - a.performance_score).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }))
  }, [kpiData, currentRole])

  const activityData = useMemo(() => {
    console.log('📊 Activity data calculation - kpiData length:', kpiData.length)
    console.log('📊 Selected metrics:', filters.metrics)

    if (!kpiData || kpiData.length === 0) {
      console.log('❌ No KPI data available for activity heatmap')
      return []
    }

    // Group real data by date and calculate activity score based on selected metrics
    const dailyActivity = kpiData.reduce((acc, curr) => {
      // Convert timestamp to simple date format (YYYY-MM-DD)
      const rawDate = curr.submission_date
      const date = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate

      if (!acc[date]) {
        acc[date] = { date, value: 0 }
      }

      // Calculate weighted activity score based on selected metrics only
      let activityScore = 0

      if (currentRole === 'setter') {
        const item = curr as SetterKPISubmission
        if (filters.metrics.includes('dials_today')) activityScore += (item.dials_today || 0) * 1
        if (filters.metrics.includes('pickups_today')) activityScore += (item.pickups_today || 0) * 3
        if (filters.metrics.includes('one_min_convos')) activityScore += (item.one_min_convos || 0) * 5
        if (filters.metrics.includes('dqs_today')) activityScore += (item.dqs_today || 0) * 8
        if (filters.metrics.includes('follow_ups_today')) activityScore += (item.follow_ups_today || 0) * 2
        if (filters.metrics.includes('qualified_appointments')) activityScore += (item.qualified_appointments || 0) * 10
        if (filters.metrics.includes('discovery_calls_scheduled')) activityScore += (item.discovery_calls_scheduled || 0) * 8
        if (filters.metrics.includes('prospects_showed_up')) activityScore += (item.prospects_showed_up || 0) * 15
        if (filters.metrics.includes('prospects_rescheduled')) activityScore += (item.prospects_rescheduled || 0) * 3
        if (filters.metrics.includes('prospects_full_territory')) activityScore += (item.prospects_full_territory || 0) * 20
        if (filters.metrics.includes('performance_score')) activityScore += (item.performance_score || 0) * 1

        // If no metrics selected, show a simple total of key activities
        if (filters.metrics.length === 0) {
          activityScore = (item.dials_today || 0) + (item.pickups_today || 0) + (item.one_min_convos || 0) + (item.dqs_today || 0)
        }
      } else {
        const item = curr as CloserEODSubmission
        if (filters.metrics.includes('appointments_on_calendar')) activityScore += (item.appointments_on_calendar || 0) * 2
        if (filters.metrics.includes('live_calls_today')) activityScore += (item.live_calls_today || 0) * 5
        if (filters.metrics.includes('no_shows_today')) activityScore += (item.no_shows_today || 0) * 1
        if (filters.metrics.includes('follow_up_calls_scheduled')) activityScore += (item.follow_up_calls_scheduled || 0) * 3
        if (filters.metrics.includes('calls_rescheduled')) activityScore += (item.calls_rescheduled || 0) * 2
        if (filters.metrics.includes('offers_made')) activityScore += (item.offers_made || 0) * 10
        if (filters.metrics.includes('deals_closed')) activityScore += (item.deals_closed || 0) * 20
        if (filters.metrics.includes('deposits_collected')) activityScore += (item.deposits_collected || 0) * 15
        if (filters.metrics.includes('cash_collected')) activityScore += (item.cash_collected || 0) * 0.01
        if (filters.metrics.includes('performance_score')) activityScore += (item.performance_score || 0) * 1

        // If no metrics selected, show a simple total of key activities
        if (filters.metrics.length === 0) {
          activityScore = (item.live_calls_today || 0) + (item.offers_made || 0) + (item.deals_closed || 0)
        }
      }

      acc[date].value += activityScore
      return acc
    }, {} as Record<string, { date: string; value: number }>)

    const result = Object.values(dailyActivity)
    console.log('✅ Activity data result:', result.length, 'days with data')
    console.log('📈 Sample activity data:', result.slice(0, 3))

    return result
  }, [kpiData, filters.metrics, currentRole])

  const updateFilters = (updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <div className="p-8 text-center">
          <p className="text-red-500">Error loading data: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          {format(filters.dateRange.from, 'MMM dd')} - {format(filters.dateRange.to, 'MMM dd, yyyy')}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <DateRangePicker
          value={filters.dateRange}
          onChange={(dateRange) => updateFilters({ dateRange })}
        />
        <PeopleSelector
          people={people}
          selectedPeople={filters.people}
          onChange={(people) => updateFilters({ people })}
          role={currentRole}
        />
        <MetricToggles
          selectedMetrics={filters.metrics}
          onChange={(metrics) => updateFilters({ metrics })}
          role={currentRole}
          className="md:w-80"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentRole === 'setter' ? (
          <>
            {/* Setter KPI Cards */}
            {filters.metrics.includes('dials_today') && (
              <KPICard
                title="Total Dials"
                value={(dashboardStats as any).totalDials || 0}
                icon={Phone}
                color="blue"
              />
            )}
            {filters.metrics.includes('pickups_today') && (
              <KPICard
                title="Total Pickups"
                value={(dashboardStats as any).totalPickups || 0}
                subtitle={`${((dashboardStats as any).pickupRate || 0).toFixed(1)}% pickup rate`}
                icon={Users}
                color="green"
                format="number"
              />
            )}
            {filters.metrics.includes('one_min_convos') && (
              <KPICard
                title="1min+ Conversations"
                value={(dashboardStats as any).totalConvos || 0}
                subtitle={`${((dashboardStats as any).convoRate || 0).toFixed(1)}% conversion rate`}
                icon={MessageSquare}
                color="yellow"
              />
            )}
            {filters.metrics.includes('dqs_today') && (
              <KPICard
                title="Total DQs"
                value={(dashboardStats as any).totalDQs || 0}
                icon={CheckCircle}
                color="red"
              />
            )}
            {filters.metrics.includes('qualified_appointments') && (
              <KPICard
                title="Qualified Appointments"
                value={(dashboardStats as any).totalAppointments || 0}
                icon={Calendar}
                color="purple"
              />
            )}
            {filters.metrics.includes('performance_score') && (
              <KPICard
                title="Avg Performance Score"
                value={((dashboardStats as any).averagePerformanceScore || 0).toFixed(1)}
                icon={Star}
                color="yellow"
              />
            )}
            {filters.metrics.includes('follow_ups_today') && (
              <KPICard
                title="Follow Ups"
                value={(dashboardStats as any).totalFollowUps || 0}
                icon={Users}
                color="purple"
              />
            )}
            {filters.metrics.includes('discovery_calls_scheduled') && (
              <KPICard
                title="Discovery Calls"
                value={(dashboardStats as any).totalDiscoveryCalls || 0}
                icon={Calendar}
                color="yellow"
              />
            )}
            {filters.metrics.includes('prospects_showed_up') && (
              <KPICard
                title="Showed Up"
                value={(dashboardStats as any).totalShowedUp || 0}
                icon={CheckCircle}
                color="green"
              />
            )}
            {filters.metrics.includes('prospects_rescheduled') && (
              <KPICard
                title="Rescheduled"
                value={(dashboardStats as any).totalRescheduled || 0}
                icon={Calendar}
                color="yellow"
              />
            )}
            {filters.metrics.includes('prospects_full_territory') && (
              <KPICard
                title="Full Territory"
                value={(dashboardStats as any).totalFullTerritory || 0}
                icon={Target}
                color="purple"
              />
            )}
            {filters.metrics.includes('showRate') && (
              <KPICard
                title="Show Rate"
                value={(dashboardStats as any).showRate || 0}
                format="percentage"
                icon={Target}
                color="green"
              />
            )}
            {filters.metrics.includes('pickupRate') && (
              <KPICard
                title="Pickup Rate"
                value={(dashboardStats as any).pickupRate || 0}
                format="percentage"
                icon={Phone}
                color="green"
              />
            )}
          </>
        ) : (
          <>
            {/* Closer KPI Cards */}
            {filters.metrics.includes('appointments_on_calendar') && (
              <KPICard
                title="Appointments on Calendar"
                value={(dashboardStats as any).totalAppointmentsOnCalendar || 0}
                icon={Calendar}
                color="blue"
              />
            )}
            {filters.metrics.includes('live_calls_today') && (
              <KPICard
                title="Live Calls"
                value={(dashboardStats as any).totalLiveCalls || 0}
                icon={Phone}
                color="green"
              />
            )}
            {filters.metrics.includes('no_shows_today') && (
              <KPICard
                title="No Shows"
                value={(dashboardStats as any).totalNoShows || 0}
                subtitle={`${((dashboardStats as any).noShowRate || 0).toFixed(1)}% no show rate`}
                icon={UserCheck}
                color="red"
              />
            )}
            {filters.metrics.includes('follow_up_calls_scheduled') && (
              <KPICard
                title="Follow-up Calls"
                value={(dashboardStats as any).totalFollowUpCallsScheduled || 0}
                icon={Calendar}
                color="purple"
              />
            )}
            {filters.metrics.includes('calls_rescheduled') && (
              <KPICard
                title="Calls Rescheduled"
                value={(dashboardStats as any).totalCallsRescheduled || 0}
                icon={Calendar}
                color="yellow"
              />
            )}
            {filters.metrics.includes('offers_made') && (
              <KPICard
                title="Offers Made"
                value={(dashboardStats as any).totalOffersMade || 0}
                icon={Target}
                color="purple"
              />
            )}
            {filters.metrics.includes('deals_closed') && (
              <KPICard
                title="Deals Closed"
                value={(dashboardStats as any).totalDealsClosed || 0}
                subtitle={`${((dashboardStats as any).totalDealsClosingRate || 0).toFixed(1)}% closing rate`}
                icon={CheckCircle}
                color="green"
              />
            )}
            {filters.metrics.includes('deposits_collected') && (
              <KPICard
                title="Deposits Collected"
                value={(dashboardStats as any).totalDepositsCollected || 0}
                icon={DollarSign}
                color="green"
              />
            )}
            {filters.metrics.includes('cash_collected') && (
              <KPICard
                title="Cash Collected"
                value={(dashboardStats as any).totalCashCollected || 0}
                subtitle={`$${((dashboardStats as any).averageCashPerDeal || 0).toFixed(0)} avg per deal`}
                icon={DollarSign}
                color="green"
                format="currency"
              />
            )}
            {filters.metrics.includes('performance_score') && (
              <KPICard
                title="Avg Performance Score"
                value={((dashboardStats as any).averagePerformanceScore || 0).toFixed(1)}
                icon={Star}
                color="yellow"
              />
            )}
            {filters.metrics.includes('focus_score') && (
              <KPICard
                title="Avg Focus Score"
                value={((dashboardStats as any).averageFocusScore || 0).toFixed(1)}
                icon={Target}
                color="blue"
              />
            )}
            {filters.metrics.includes('noShowRate') && (
              <KPICard
                title="No Show Rate"
                value={(dashboardStats as any).noShowRate || 0}
                format="percentage"
                icon={UserCheck}
                color="red"
              />
            )}
            {filters.metrics.includes('closingRate') && (
              <KPICard
                title="Closing Rate"
                value={(dashboardStats as any).totalDealsClosingRate || 0}
                format="percentage"
                icon={Target}
                color="green"
              />
            )}
            {filters.metrics.includes('averageCashPerDeal') && (
              <KPICard
                title="Avg Cash Per Deal"
                value={(dashboardStats as any).averageCashPerDeal || 0}
                format="currency"
                icon={DollarSign}
                color="green"
              />
            )}
          </>
        )}
      </div>

      {/* Charts Grid - Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomLineChart
          title="Daily Performance Trend"
          description="Track key metrics over time"
          data={trendData}
          lines={(() => {
            if (currentRole === 'setter') {
              return [
                ...(filters.metrics.includes('dials_today') ? [{ dataKey: 'dials', stroke: '#3B82F6', name: 'Dials' }] : []),
                ...(filters.metrics.includes('pickups_today') ? [{ dataKey: 'pickups', stroke: '#10B981', name: 'Pickups' }] : []),
                ...(filters.metrics.includes('pickupRate') ? [{ dataKey: 'pickupRate', stroke: '#10B981', name: 'Pickup Rate (%)' }] : []),
                ...(filters.metrics.includes('one_min_convos') ? [{ dataKey: 'convos', stroke: '#F59E0B', name: '1min+ Convos' }] : []),
                ...(filters.metrics.includes('dqs_today') ? [{ dataKey: 'dqs', stroke: '#EF4444', name: 'DQs' }] : []),
                ...(filters.metrics.includes('follow_ups_today') ? [{ dataKey: 'followUps', stroke: '#EC4899', name: 'Follow Ups' }] : []),
                ...(filters.metrics.includes('qualified_appointments') ? [{ dataKey: 'appointments', stroke: '#8B5CF6', name: 'Appointments' }] : []),
                ...(filters.metrics.includes('discovery_calls_scheduled') ? [{ dataKey: 'discoveryCalls', stroke: '#F97316', name: 'Discovery Calls' }] : []),
                ...(filters.metrics.includes('showRate') ? [{ dataKey: 'showRate', stroke: '#22C55E', name: 'Show Rate (%)' }] : []),
                ...(filters.metrics.includes('prospects_showed_up') ? [{ dataKey: 'showedUp', stroke: '#22C55E', name: 'Showed Up' }] : []),
                ...(filters.metrics.includes('prospects_rescheduled') ? [{ dataKey: 'rescheduled', stroke: '#F59E0B', name: 'Rescheduled' }] : []),
                ...(filters.metrics.includes('prospects_full_territory') ? [{ dataKey: 'fullTerritory', stroke: '#A855F7', name: 'Full Territory' }] : []),
                ...(filters.metrics.includes('performance_score') ? [{ dataKey: 'performanceScore', stroke: '#84CC16', name: 'Performance Score' }] : []),
              ]
            } else {
              return [
                ...(filters.metrics.includes('appointments_on_calendar') ? [{ dataKey: 'appointments', stroke: '#3B82F6', name: 'Appointments' }] : []),
                ...(filters.metrics.includes('live_calls_today') ? [{ dataKey: 'liveCalls', stroke: '#10B981', name: 'Live Calls' }] : []),
                ...(filters.metrics.includes('no_shows_today') ? [{ dataKey: 'noShows', stroke: '#EF4444', name: 'No Shows' }] : []),
                ...(filters.metrics.includes('follow_up_calls_scheduled') ? [{ dataKey: 'followUps', stroke: '#EC4899', name: 'Follow-up Calls' }] : []),
                ...(filters.metrics.includes('calls_rescheduled') ? [{ dataKey: 'rescheduled', stroke: '#F59E0B', name: 'Rescheduled' }] : []),
                ...(filters.metrics.includes('offers_made') ? [{ dataKey: 'offersMade', stroke: '#8B5CF6', name: 'Offers Made' }] : []),
                ...(filters.metrics.includes('deals_closed') ? [{ dataKey: 'deals', stroke: '#22C55E', name: 'Deals Closed' }] : []),
                ...(filters.metrics.includes('deposits_collected') ? [{ dataKey: 'depositsCollected', stroke: '#F97316', name: 'Deposits' }] : []),
                ...(filters.metrics.includes('cash_collected') ? [{ dataKey: 'cashCollected', stroke: '#06B6D4', name: 'Cash Collected' }] : []),
                ...(filters.metrics.includes('performance_score') ? [{ dataKey: 'performanceScore', stroke: '#84CC16', name: 'Performance Score' }] : []),
                ...(filters.metrics.includes('noShowRate') ? [{ dataKey: 'noShowRate', stroke: '#EF4444', name: 'No Show Rate (%)' }] : []),
                ...(filters.metrics.includes('closingRate') ? [{ dataKey: 'closingRate', stroke: '#22C55E', name: 'Closing Rate (%)' }] : []),
                ...(filters.metrics.includes('averageCashPerDeal') ? [{ dataKey: 'averageCashPerDeal', stroke: '#06B6D4', name: 'Avg Cash/Deal' }] : []),
              ]
            }
          })()}
        />

        <CustomBarChart
          title="Top Performers"
          description={`${currentRole === 'setter' ? 'Setter' : 'Closer'} comparison by selected metrics`}
          data={peoplePerformanceData}
          bars={(() => {
            let availableBars: any[] = []

            if (currentRole === 'setter') {
              availableBars = [
                ...(filters.metrics.includes('dials_today') ? [{ dataKey: 'dials', fill: '#2563eb', name: 'Dials' }] : []),
                ...(filters.metrics.includes('pickups_today') ? [{ dataKey: 'pickups', fill: '#059669', name: 'Pickups' }] : []),
                ...(filters.metrics.includes('pickupRate') ? [{ dataKey: 'pickupRate', fill: '#059669', name: 'Pickup Rate (%)' }] : []),
                ...(filters.metrics.includes('one_min_convos') ? [{ dataKey: 'convos', fill: '#d97706', name: '1min+ Convos' }] : []),
                ...(filters.metrics.includes('dqs_today') ? [{ dataKey: 'dqs', fill: '#dc2626', name: 'DQs' }] : []),
                ...(filters.metrics.includes('follow_ups_today') ? [{ dataKey: 'followUps', fill: '#db2777', name: 'Follow Ups' }] : []),
                ...(filters.metrics.includes('qualified_appointments') ? [{ dataKey: 'appointments', fill: '#7c3aed', name: 'Appointments' }] : []),
                ...(filters.metrics.includes('discovery_calls_scheduled') ? [{ dataKey: 'discoveryCalls', fill: '#ea580c', name: 'Discovery Calls' }] : []),
                ...(filters.metrics.includes('showRate') ? [{ dataKey: 'showRate', fill: '#16a34a', name: 'Show Rate (%)' }] : []),
                ...(filters.metrics.includes('prospects_showed_up') ? [{ dataKey: 'showedUp', fill: '#16a34a', name: 'Showed Up' }] : []),
                ...(filters.metrics.includes('prospects_rescheduled') ? [{ dataKey: 'rescheduled', fill: '#ca8a04', name: 'Rescheduled' }] : []),
                ...(filters.metrics.includes('prospects_full_territory') ? [{ dataKey: 'fullTerritory', fill: '#9333ea', name: 'Full Territory' }] : []),
                ...(filters.metrics.includes('performance_score') ? [{ dataKey: 'performanceScore', fill: '#84cc16', name: 'Performance Score' }] : []),
              ]
            } else {
              availableBars = [
                ...(filters.metrics.includes('appointments_on_calendar') ? [{ dataKey: 'appointments', fill: '#2563eb', name: 'Appointments' }] : []),
                ...(filters.metrics.includes('live_calls_today') ? [{ dataKey: 'liveCalls', fill: '#059669', name: 'Live Calls' }] : []),
                ...(filters.metrics.includes('no_shows_today') ? [{ dataKey: 'noShows', fill: '#dc2626', name: 'No Shows' }] : []),
                ...(filters.metrics.includes('follow_up_calls_scheduled') ? [{ dataKey: 'followUps', fill: '#db2777', name: 'Follow-up Calls' }] : []),
                ...(filters.metrics.includes('calls_rescheduled') ? [{ dataKey: 'rescheduled', fill: '#ca8a04', name: 'Rescheduled' }] : []),
                ...(filters.metrics.includes('offers_made') ? [{ dataKey: 'offersMade', fill: '#7c3aed', name: 'Offers Made' }] : []),
                ...(filters.metrics.includes('deals_closed') ? [{ dataKey: 'deals', fill: '#16a34a', name: 'Deals Closed' }] : []),
                ...(filters.metrics.includes('deposits_collected') ? [{ dataKey: 'depositsCollected', fill: '#ea580c', name: 'Deposits' }] : []),
                ...(filters.metrics.includes('cash_collected') ? [{ dataKey: 'cashCollected', fill: '#06b6d4', name: 'Cash Collected' }] : []),
                ...(filters.metrics.includes('performance_score') ? [{ dataKey: 'performanceScore', fill: '#84cc16', name: 'Performance Score' }] : []),
                ...(filters.metrics.includes('noShowRate') ? [{ dataKey: 'noShowRate', fill: '#dc2626', name: 'No Show Rate (%)' }] : []),
                ...(filters.metrics.includes('closingRate') ? [{ dataKey: 'closingRate', fill: '#16a34a', name: 'Closing Rate (%)' }] : []),
                ...(filters.metrics.includes('averageCashPerDeal') ? [{ dataKey: 'averageCashPerDeal', fill: '#06b6d4', name: 'Avg Cash/Deal' }] : []),
              ]
            }

            // If no bars are selected, show default metric based on role
            const defaultBar = currentRole === 'setter'
              ? [{ dataKey: 'dials', fill: '#2563eb', name: 'Dials' }]
              : [{ dataKey: 'deals', fill: '#16a34a', name: 'Deals Closed' }]

            return availableBars.length > 0 ? availableBars : defaultBar;
          })()}
          xAxisKey="name"
        />
      </div>

      {/* Charts Grid - Bottom Row */}
      <div className="flex flex-col lg:flex-row gap-6 mb-16">
        <div className="flex-1 min-w-0">
          <FunnelChart
            title="Conversion Funnel"
            description="End-to-end conversion rates"
            stages={funnelData}
          />
        </div>

        <div className="flex-1 min-w-0">
          <HeatmapCalendar
            title="Activity Heatmap"
            description="Daily activity intensity based on selected metrics"
            data={activityData}
            month={new Date()}
            colorScheme="blue"
          />
        </div>
      </div>

      {/* Leaderboard - Separate Section */}
      <section className="w-full">
        <LeaderboardTable data={leaderboardData} visibleMetrics={filters.metrics} />
      </section>
    </div>
  )
}