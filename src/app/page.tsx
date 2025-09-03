'use client'

import { useState, useMemo } from 'react'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import { Phone, Users, MessageSquare, CheckCircle, Calendar, TrendingUp, Star, Target } from 'lucide-react'

import { DateRangePicker } from '@/components/filters/date-range-picker'
import { SetterSelector } from '@/components/filters/setter-selector'
import { MetricToggles } from '@/components/filters/metric-toggles'
import { KPICard } from '@/components/cards/kpi-card'
import { CustomLineChart } from '@/components/charts/line-chart'
import { CustomBarChart } from '@/components/charts/bar-chart'
import { FunnelChart } from '@/components/charts/funnel-chart'
import { HeatmapCalendar } from '@/components/charts/heatmap-calendar'
import { LeaderboardTable } from '@/components/tables/leaderboard-table'
import { useKPIData, useDashboardStats, useSetters } from '@/hooks/use-kpi-data'
import { FilterState, LeaderboardEntry, TrendData } from '@/types/database'

export default function DashboardPage() {
  const [filters, setFilters] = useState<FilterState>({
    setters: [],
    dateRange: {
      from: startOfDay(subDays(new Date(), 30)),
      to: endOfDay(new Date()),
    },
    metrics: ['dials_today', 'pickups_today', 'one_min_convos', 'dqs_today', 'qualified_appointments', 'deals_closed', 'performance_score'],
  })

  const { data: kpiData, isLoading: isLoadingKPI } = useKPIData(filters)
  const { data: setters, isLoading: isLoadingSetters } = useSetters()
  const dashboardStats = useDashboardStats(kpiData || [])

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
          appointments: 0,
          deals: 0,
        }
      }
      acc[date].dials += curr.dials_today
      acc[date].pickups += curr.pickups_today
      acc[date].convos += curr.one_min_convos
      acc[date].appointments += curr.qualified_appointments
      acc[date].deals += curr.deals_closed
      return acc
    }, {} as Record<string, { date: string; dials: number; pickups: number; convos: number; appointments: number; deals: number }>)

    return Object.values(groupedData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [kpiData])

  const setterPerformanceData = useMemo(() => {
    if (!kpiData) return []

    const grouped = kpiData.reduce((acc, curr) => {
      const name = curr.full_name
      if (!acc[name]) {
        acc[name] = {
          name,
          dials: 0,
          pickups: 0,
          appointments: 0,
          deals: 0,
        }
      }
      acc[name].dials += curr.dials_today
      acc[name].pickups += curr.pickups_today
      acc[name].appointments += curr.qualified_appointments
      acc[name].deals += curr.deals_closed
      return acc
    }, {} as Record<string, { name: string; dials: number; pickups: number; appointments: number; deals: number }>)

    return Object.values(grouped).sort((a, b) => b.dials - a.dials).slice(0, 10)
  }, [kpiData])

  const funnelData = useMemo(() => {
    const stages = [
      ...(filters.metrics.includes('dials_today') ? [{ name: 'Dials', value: dashboardStats.totalDials, color: '#3B82F6' }] : []),
      ...(filters.metrics.includes('pickups_today') ? [{ name: 'Pickups', value: dashboardStats.totalPickups, color: '#10B981' }] : []),
      ...(filters.metrics.includes('one_min_convos') ? [{ name: '1min+ Convos', value: dashboardStats.totalConvos, color: '#F59E0B' }] : []),
      ...(filters.metrics.includes('dqs_today') ? [{ name: 'DQs', value: dashboardStats.totalDQs, color: '#EF4444' }] : []),
      ...(filters.metrics.includes('qualified_appointments') ? [{ name: 'Appointments', value: dashboardStats.totalAppointments, color: '#8B5CF6' }] : []),
      ...(filters.metrics.includes('deals_closed') ? [{ name: 'Deals Closed', value: dashboardStats.totalDeals, color: '#06B6D4' }] : []),
    ]
    return stages.filter(stage => stage.value > 0)
  }, [dashboardStats, filters.metrics])

  const leaderboardData = useMemo((): LeaderboardEntry[] => {
    if (!kpiData) return []

    const aggregated = kpiData.reduce((acc, curr) => {
      const key = curr.full_name
      if (!acc[key]) {
        acc[key] = { ...curr, rank: 0, pickupRate: 0, convoRate: 0 }
      } else {
        acc[key].dials_today += curr.dials_today
        acc[key].pickups_today += curr.pickups_today
        acc[key].one_min_convos += curr.one_min_convos
        acc[key].dqs_today += curr.dqs_today
        acc[key].qualified_appointments += curr.qualified_appointments
        acc[key].deals_closed += curr.deals_closed
        acc[key].performance_score = Math.max(acc[key].performance_score, curr.performance_score)
      }
      return acc
    }, {} as Record<string, LeaderboardEntry>)

    return Object.values(aggregated).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      pickupRate: entry.dials_today > 0 ? (entry.pickups_today / entry.dials_today) * 100 : 0,
      convoRate: entry.pickups_today > 0 ? (entry.one_min_convos / entry.pickups_today) * 100 : 0,
    })).sort((a, b) => b.performance_score - a.performance_score)
  }, [kpiData])

  const activityData = useMemo(() => {
    if (!kpiData) return []
    
    return kpiData.map(item => ({
      date: item.submission_date,
      value: item.dials_today,
    }))
  }, [kpiData])

  const updateFilters = (updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }

  if (isLoadingKPI || isLoadingSetters) {
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
        <SetterSelector
          setters={setters || []}
          selectedSetters={filters.setters}
          onChange={(setters) => updateFilters({ setters })}
        />
        <MetricToggles
          selectedMetrics={filters.metrics}
          onChange={(metrics) => updateFilters({ metrics })}
          className="md:w-80"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filters.metrics.includes('dials_today') && (
          <KPICard
            title="Total Dials"
            value={dashboardStats.totalDials}
            icon={Phone}
            color="blue"
          />
        )}
        {filters.metrics.includes('pickups_today') && (
          <KPICard
            title="Total Pickups"
            value={dashboardStats.totalPickups}
            subtitle={`${dashboardStats.pickupRate.toFixed(1)}% pickup rate`}
            icon={Users}
            color="green"
            format="number"
          />
        )}
        {filters.metrics.includes('one_min_convos') && (
          <KPICard
            title="1min+ Conversations"
            value={dashboardStats.totalConvos}
            subtitle={`${dashboardStats.convoRate.toFixed(1)}% conversion rate`}
            icon={MessageSquare}
            color="yellow"
          />
        )}
        {filters.metrics.includes('dqs_today') && (
          <KPICard
            title="Total DQs"
            value={dashboardStats.totalDQs}
            icon={CheckCircle}
            color="red"
          />
        )}
        {filters.metrics.includes('qualified_appointments') && (
          <KPICard
            title="Qualified Appointments"
            value={dashboardStats.totalAppointments}
            icon={Calendar}
            color="purple"
          />
        )}
        {filters.metrics.includes('deals_closed') && (
          <KPICard
            title="Deals Closed"
            value={dashboardStats.totalDeals}
            icon={TrendingUp}
            color="cyan"
          />
        )}
        {filters.metrics.includes('performance_score') && (
          <KPICard
            title="Avg Performance Score"
            value={dashboardStats.averagePerformanceScore.toFixed(1)}
            icon={Star}
            color="yellow"
          />
        )}
        {(filters.metrics.includes('prospects_showed_up') || filters.metrics.includes('discovery_calls_scheduled')) && (
          <KPICard
            title="Show Rate"
            value={dashboardStats.showRate}
            format="percentage"
            icon={Target}
            color="green"
          />
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomLineChart
          title="Daily Performance Trend"
          description="Track key metrics over time"
          data={trendData}
          lines={[
            ...(filters.metrics.includes('dials_today') ? [{ dataKey: 'dials', stroke: '#3B82F6', name: 'Dials' }] : []),
            ...(filters.metrics.includes('pickups_today') ? [{ dataKey: 'pickups', stroke: '#10B981', name: 'Pickups' }] : []),
            ...(filters.metrics.includes('qualified_appointments') ? [{ dataKey: 'appointments', stroke: '#8B5CF6', name: 'Appointments' }] : []),
            ...(filters.metrics.includes('deals_closed') ? [{ dataKey: 'deals', stroke: '#06B6D4', name: 'Deals' }] : []),
          ]}
        />

        <CustomBarChart
          title="Top Performers"
          description="Setter comparison by selected metrics"
          data={setterPerformanceData}
          bars={[
            ...(filters.metrics.includes('dials_today') ? [{ dataKey: 'dials', fill: '#3B82F6', name: 'Dials' }] : []),
            ...(filters.metrics.includes('pickups_today') ? [{ dataKey: 'pickups', fill: '#10B981', name: 'Pickups' }] : []),
            ...(filters.metrics.includes('qualified_appointments') ? [{ dataKey: 'appointments', fill: '#8B5CF6', name: 'Appointments' }] : []),
            ...(filters.metrics.includes('deals_closed') ? [{ dataKey: 'deals', fill: '#06B6D4', name: 'Deals' }] : []),
          ]}
          xAxisKey="name"
        />

        <FunnelChart
          title="Conversion Funnel"
          description="End-to-end conversion rates"
          stages={funnelData}
        />

        <HeatmapCalendar
          title="Activity Heatmap"
          description="Daily activity intensity"
          data={activityData}
          month={new Date()}
          colorScheme="blue"
        />
      </div>

      {/* Leaderboard */}
      <LeaderboardTable data={leaderboardData} visibleMetrics={filters.metrics} />
    </div>
  )
}
