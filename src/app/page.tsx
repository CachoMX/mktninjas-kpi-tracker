'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { useDashboardStats } from '@/hooks/use-kpi-data'
import { FilterState, LeaderboardEntry, TrendData, SetterKPISubmission } from '@/types/database'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  console.log('🚀 DashboardPage component initialized')
  
  const [filters, setFilters] = useState<FilterState>({
    setters: [],
    dateRange: {
      from: startOfDay(subDays(new Date(), 30)),
      to: endOfDay(new Date()),
    },
    metrics: ['dials_today', 'pickups_today', 'one_min_convos', 'dqs_today', 'qualified_appointments', 'deals_closed', 'performance_score'],
  })

  // Replace React Query with direct state management
  const [kpiData, setKpiData] = useState<SetterKPISubmission[]>([])
  const [setters, setSetters] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const dashboardStats = useDashboardStats(kpiData)
  
  // Single useEffect to fetch data (copying EXACT working pattern from debug page)
  useEffect(() => {
    console.log('🚀 Main dashboard useEffect triggered')
    
    const fetchData = async () => {
      try {
        console.log('🔍 Fetching all data from Supabase...')
        setLoading(true)
        setError(null)
        
        // Fetch all data without filters first (same as debug page)
        const { data: allData, error: allError } = await supabase
          .from('setter_kpi_submissions')
          .select('*')
          .order('submission_date', { ascending: false })
        
        if (allError) {
          console.error('❌ Error:', allError)
          setError(allError.message)
          setLoading(false)
          return
        }

        console.log('✅ Raw data fetched:', allData?.length || 0, 'records')
        
        // Apply date range filters
        const fromDate = format(filters.dateRange.from, 'yyyy-MM-dd')
        const toDate = format(filters.dateRange.to, 'yyyy-MM-dd')
        
        let filteredData = (allData || []).filter(record => 
          record.submission_date >= fromDate && record.submission_date <= toDate
        )
        
        // Apply setter filters
        if (filters.setters.length > 0) {
          filteredData = filteredData.filter(record => 
            filters.setters.includes(record.full_name)
          )
        }
        
        console.log('✅ Filtered data:', filteredData.length, 'records')
        console.log('📅 Date range:', fromDate, 'to', toDate)
        
        setKpiData(filteredData)
        console.log('📋 kpiData updated, length:', filteredData.length)

        // Get unique setters from all data (same as debug page)
        const uniqueSetters = Array.from(new Set((allData || []).map(item => item.full_name)))
        setSetters(uniqueSetters)
        console.log('✅ Setters loaded:', uniqueSetters.length, 'unique setters')

      } catch (err) {
        console.error('❌ Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
        console.log('🏁 Main dashboard fetchData complete')
      }
    }

    fetchData()
  }, [filters.dateRange.from, filters.dateRange.to, filters.setters])

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
        }
      }
      acc[date].dials += curr.dials_today
      acc[date].pickups += curr.pickups_today
      acc[date].convos += curr.one_min_convos
      acc[date].dqs += curr.dqs_today
      acc[date].followUps += curr.follow_ups_today
      acc[date].appointments += curr.qualified_appointments
      acc[date].discoveryCalls += curr.discovery_calls_scheduled
      acc[date].showedUp += curr.prospects_showed_up
      acc[date].rescheduled += curr.prospects_rescheduled
      acc[date].fullTerritory += (curr.prospects_full_rterritory || 0)
      acc[date].deals += curr.deals_closed
      acc[date].performanceScore = Math.max(acc[date].performanceScore, curr.performance_score)
      return acc
    }, {} as Record<string, { date: string; dials: number; pickups: number; convos: number; dqs: number; followUps: number; appointments: number; discoveryCalls: number; showedUp: number; rescheduled: number; fullTerritory: number; deals: number; performanceScore: number }>)

    // Add calculated metrics to each day
    const dataWithCalculatedMetrics = Object.values(groupedData).map(day => ({
      ...day,
      pickupRate: day.dials > 0 ? (day.pickups / day.dials) * 100 : 0,
      showRate: day.discoveryCalls > 0 ? (day.showedUp / day.discoveryCalls) * 100 : 0,
    }))

    return dataWithCalculatedMetrics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
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
        }
      }
      acc[name].dials += curr.dials_today
      acc[name].pickups += curr.pickups_today
      acc[name].convos += curr.one_min_convos
      acc[name].dqs += curr.dqs_today
      acc[name].followUps += curr.follow_ups_today
      acc[name].appointments += curr.qualified_appointments
      acc[name].discoveryCalls += curr.discovery_calls_scheduled
      acc[name].showedUp += curr.prospects_showed_up
      acc[name].rescheduled += curr.prospects_rescheduled
      acc[name].fullTerritory += (curr.prospects_full_rterritory || 0)
      acc[name].deals += curr.deals_closed
      acc[name].performanceScore = Math.max(acc[name].performanceScore, curr.performance_score)
      return acc
    }, {} as Record<string, { name: string; dials: number; pickups: number; convos: number; dqs: number; followUps: number; appointments: number; discoveryCalls: number; showedUp: number; rescheduled: number; fullTerritory: number; deals: number; performanceScore: number }>)

    // Add calculated metrics to each setter
    const dataWithCalculatedMetrics = Object.values(grouped).map(setter => ({
      ...setter,
      pickupRate: setter.dials > 0 ? (setter.pickups / setter.dials) * 100 : 0,
      showRate: setter.discoveryCalls > 0 ? (setter.showedUp / setter.discoveryCalls) * 100 : 0,
    }))
    
    return dataWithCalculatedMetrics.sort((a, b) => b.dials - a.dials).slice(0, 10)
  }, [kpiData])

  const funnelData = useMemo(() => {
    // Define funnel stages in logical order (highest to lowest volume)
    const allStages = [
      { key: 'dials_today', name: 'Dials', value: dashboardStats.totalDials, color: '#3B82F6' },
      { key: 'pickups_today', name: 'Pickups', value: dashboardStats.totalPickups, color: '#10B981' },
      { key: 'one_min_convos', name: '1min+ Convos', value: dashboardStats.totalConvos, color: '#F59E0B' },
      { key: 'dqs_today', name: 'DQs', value: dashboardStats.totalDQs, color: '#EF4444' },
      { key: 'follow_ups_today', name: 'Follow Ups', value: dashboardStats.totalFollowUps, color: '#EC4899' },
      { key: 'qualified_appointments', name: 'Appointments', value: dashboardStats.totalAppointments, color: '#8B5CF6' },
      { key: 'discovery_calls_scheduled', name: 'Discovery Calls', value: dashboardStats.totalDiscoveryCalls, color: '#F97316' },
      { key: 'prospects_showed_up', name: 'Showed Up', value: dashboardStats.totalShowedUp, color: '#22C55E' },
      { key: 'prospects_rescheduled', name: 'Rescheduled', value: dashboardStats.totalRescheduled, color: '#F59E0B' },
      { key: 'prospects_full_rterritory', name: 'Full Territory', value: dashboardStats.totalFullTerritory, color: '#A855F7' },
      { key: 'deals_closed', name: 'Deals Closed', value: dashboardStats.totalDeals, color: '#06B6D4' },
      { key: 'performance_score', name: 'Performance Score', value: dashboardStats.averagePerformanceScore, color: '#84CC16' },
    ]
    
    // Only include selected metrics, allow zero values to show
    const selectedStages = allStages
      .filter(stage => filters.metrics.includes(stage.key))
      .map(({ key: _, ...stage }) => stage) // Remove the key property
    
    return selectedStages
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
    console.log('📊 Activity data calculation - kpiData length:', kpiData.length)
    console.log('📊 Selected metrics:', filters.metrics)
    
    if (!kpiData || kpiData.length === 0) {
      console.log('❌ No KPI data available for activity heatmap')
      return []
    }
    
    // Group real data by date and calculate activity score based on selected metrics
    const dailyActivity = kpiData.reduce((acc, curr) => {
      // Convert timestamp to simple date format (YYYY-MM-DD) - same fix as test page
      const rawDate = curr.submission_date
      const date = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate
      
      if (!acc[date]) {
        acc[date] = { date, value: 0 }
      }
      
      // Calculate weighted activity score based on selected metrics only
      let activityScore = 0
      
      if (filters.metrics.includes('dials_today')) activityScore += (curr.dials_today || 0) * 1
      if (filters.metrics.includes('pickups_today')) activityScore += (curr.pickups_today || 0) * 3
      if (filters.metrics.includes('one_min_convos')) activityScore += (curr.one_min_convos || 0) * 5
      if (filters.metrics.includes('dqs_today')) activityScore += (curr.dqs_today || 0) * 8
      if (filters.metrics.includes('follow_ups_today')) activityScore += (curr.follow_ups_today || 0) * 2
      if (filters.metrics.includes('qualified_appointments')) activityScore += (curr.qualified_appointments || 0) * 10
      if (filters.metrics.includes('discovery_calls_scheduled')) activityScore += (curr.discovery_calls_scheduled || 0) * 8
      if (filters.metrics.includes('prospects_showed_up')) activityScore += (curr.prospects_showed_up || 0) * 15
      if (filters.metrics.includes('prospects_rescheduled')) activityScore += (curr.prospects_rescheduled || 0) * 3
      if (filters.metrics.includes('prospects_full_rterritory')) activityScore += (curr.prospects_full_rterritory || 0) * 20
      if (filters.metrics.includes('deals_closed')) activityScore += (curr.deals_closed || 0) * 50
      if (filters.metrics.includes('performance_score')) activityScore += (curr.performance_score || 0) * 1
      
      // If no metrics selected, show a simple total of key activities
      if (filters.metrics.length === 0) {
        activityScore = (curr.dials_today || 0) + (curr.pickups_today || 0) + (curr.one_min_convos || 0) + (curr.dqs_today || 0)
      }
      
      acc[date].value += activityScore
      return acc
    }, {} as Record<string, { date: string; value: number }>)
    
    const result = Object.values(dailyActivity)
    console.log('✅ Activity data result:', result.length, 'days with data')
    console.log('📈 Sample activity data:', result.slice(0, 3))
    
    return result
  }, [kpiData, filters.metrics])

  const updateFilters = (updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }

  if (loading || loading) {
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
          setters={setters}
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
        {filters.metrics.includes('follow_ups_today') && (
          <KPICard
            title="Follow Ups"
            value={dashboardStats.totalFollowUps}
            icon={Users}
            color="purple"
          />
        )}
        {filters.metrics.includes('discovery_calls_scheduled') && (
          <KPICard
            title="Discovery Calls"
            value={dashboardStats.totalDiscoveryCalls}
            icon={Calendar}
            color="yellow"
          />
        )}
        {filters.metrics.includes('prospects_showed_up') && (
          <KPICard
            title="Showed Up"
            value={dashboardStats.totalShowedUp}
            icon={CheckCircle}
            color="green"
          />
        )}
        {filters.metrics.includes('prospects_rescheduled') && (
          <KPICard
            title="Rescheduled"
            value={dashboardStats.totalRescheduled}
            icon={Calendar}
            color="yellow"
          />
        )}
        {filters.metrics.includes('prospects_full_rterritory') && (
          <KPICard
            title="Full Territory"
            value={dashboardStats.totalFullTerritory}
            icon={Target}
            color="purple"
          />
        )}
        {filters.metrics.includes('showRate') && (
          <KPICard
            title="Show Rate"
            value={dashboardStats.showRate}
            format="percentage"
            icon={Target}
            color="green"
          />
        )}
        {filters.metrics.includes('pickupRate') && (
          <KPICard
            title="Pickup Rate"
            value={dashboardStats.pickupRate}
            format="percentage"
            icon={Phone}
            color="green"
          />
        )}
      </div>

      {/* Charts Grid - Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomLineChart
          title="Daily Performance Trend"
          description="Track key metrics over time"
          data={trendData}
          lines={[
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
            ...(filters.metrics.includes('prospects_full_rterritory') ? [{ dataKey: 'fullTerritory', stroke: '#A855F7', name: 'Full Territory' }] : []),
            ...(filters.metrics.includes('deals_closed') ? [{ dataKey: 'deals', stroke: '#06B6D4', name: 'Deals' }] : []),
            ...(filters.metrics.includes('performance_score') ? [{ dataKey: 'performanceScore', stroke: '#84CC16', name: 'Performance Score' }] : []),
          ]}
        />

        <CustomBarChart
          title="Top Performers"
          description="Setter comparison by selected metrics"
          data={setterPerformanceData}
          bars={(() => {
            const availableBars = [
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
              ...(filters.metrics.includes('prospects_full_rterritory') ? [{ dataKey: 'fullTerritory', fill: '#9333ea', name: 'Full Territory' }] : []),
              ...(filters.metrics.includes('deals_closed') ? [{ dataKey: 'deals', fill: '#0891b2', name: 'Deals' }] : []),
              ...(filters.metrics.includes('performance_score') ? [{ dataKey: 'performanceScore', fill: '#84cc16', name: 'Performance Score' }] : []),
            ];
            // If no bars are selected, show dials by default
            return availableBars.length > 0 ? availableBars : [{ dataKey: 'dials', fill: '#2563eb', name: 'Dials' }];
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