'use client'

import { useState, useMemo } from 'react'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns'
import { Download, TrendingUp, Award, Calendar, Target, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/cards/kpi-card'
import { CustomLineChart } from '@/components/charts/line-chart'
import { CustomBarChart } from '@/components/charts/bar-chart'
import { useKPIData, useSetterDashboardStats, useCloserDashboardStats, usePeople } from '@/hooks/use-kpi-data'
import { useRole } from '@/contexts/role-context'
import { SetterKPISubmission, CloserEODSubmission } from '@/types/database'

type TimePeriod = 'month' | 'quarter' | 'year'

// Helper function to safely format numbers
const safeToFixed = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0'
  }
  return value.toFixed(decimals)
}

export default function RepReportPage() {
  const [selectedPerson, setSelectedPerson] = useState<string>('')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')

  const { currentRole, getRoleLabel } = useRole()
  const { data: people } = usePeople(currentRole)

  // Calculate date ranges based on time period
  const getDateRange = (period: TimePeriod) => {
    const now = new Date()
    switch (period) {
      case 'month':
        return { from: startOfMonth(now), to: endOfMonth(now) }
      case 'quarter':
        return { from: startOfQuarter(now), to: endOfQuarter(now) }
      case 'year':
        return { from: startOfYear(now), to: endOfYear(now) }
      default:
        return { from: startOfMonth(now), to: endOfMonth(now) }
    }
  }

  const dateRange = getDateRange(timePeriod)

  const { data: currentPeriodData } = useKPIData({
    people: selectedPerson ? [selectedPerson] : [],
    dateRange,
    metrics: [],
    role: currentRole,
  }, currentRole)

  const { data: historicalData } = useKPIData({
    people: selectedPerson ? [selectedPerson] : [],
    dateRange: {
      from: timePeriod === 'year' ? subYears(dateRange.from, 2) :
           timePeriod === 'quarter' ? subQuarters(dateRange.from, 7) :
           subMonths(dateRange.from, 11),
      to: dateRange.to
    },
    metrics: [],
    role: currentRole,
  }, currentRole)

  const setterStats = useSetterDashboardStats((currentPeriodData || []) as SetterKPISubmission[])
  const closerStats = useCloserDashboardStats((currentPeriodData || []) as CloserEODSubmission[])
  const currentPeriodStats = currentRole === 'setter' ? setterStats : closerStats

  // Calculate performance trends
  const trendData = useMemo(() => {
    if (!historicalData || !selectedPerson) return []

    const groupBy = timePeriod === 'year' ? 'quarter' : timePeriod === 'quarter' ? 'month' : 'week'
    const grouped: Record<string, { period: string; metric1: number; metric2: number; metric3: number; deals: number; performanceScore: number; count: number }> = {}

    historicalData.forEach(item => {
      const date = new Date(item.submission_date)
      let key: string

      if (groupBy === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1
        key = `${date.getFullYear()}-Q${quarter}`
      } else if (groupBy === 'month') {
        key = format(date, 'yyyy-MM')
      } else {
        key = format(date, 'yyyy-ww')
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          metric1: 0,
          metric2: 0,
          metric3: 0,
          deals: 0,
          performanceScore: 0,
          count: 0,
        }
      }

      if (currentRole === 'setter') {
        const setterItem = item as any
        grouped[key].metric1 += setterItem.dials_today || 0
        grouped[key].metric2 += setterItem.pickups_today || 0
        grouped[key].metric3 += setterItem.qualified_appointments || 0
        grouped[key].deals += 0
      } else {
        const closerItem = item as any
        grouped[key].metric1 += closerItem.appointments_on_calendar || 0
        grouped[key].metric2 += closerItem.live_calls_today || 0
        grouped[key].metric3 += closerItem.offers_made || 0
        grouped[key].deals += closerItem.deals_closed || 0
      }
      grouped[key].performanceScore += item.performance_score || 0
      grouped[key].count += 1
    })

    return Object.values(grouped).map((item) => ({
      date: item.period,
      metric1: item.metric1,
      metric2: item.metric2,
      metric3: item.metric3,
      deals: item.deals,
      performanceScore: item.count > 0 ? item.performanceScore / item.count : 0,
    })).sort((a, b) => a.date.localeCompare(b.date))
  }, [historicalData, selectedPerson, timePeriod, currentRole])

  // Calculate consistency score
  const consistencyScore = useMemo(() => {
    if (!trendData.length) return 0
    
    const performances = trendData.map(item => item.performanceScore)
    const avg = performances.reduce((sum, score) => sum + score, 0) / performances.length
    const variance = performances.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / performances.length
    const stdDev = Math.sqrt(variance)
    
    // Convert to consistency score (lower variance = higher consistency)
    return Math.max(0, Math.min(100, 100 - (stdDev * 25)))
  }, [trendData])

  // Best periods
  const bestPeriods = useMemo(() => {
    if (!trendData.length) return { day: null, week: null, month: null }

    const bestPerformance = trendData.reduce((best, current) => 
      current.performanceScore > best.performanceScore ? current : best
    )

    return {
      period: bestPerformance.date,
      score: bestPerformance.performanceScore,
      metric1: bestPerformance.metric1,
      deals: bestPerformance.deals,
    }
  }, [trendData])

  // Detailed breakdown by time period
  const detailedBreakdown = useMemo(() => {
    if (!currentPeriodData || !selectedPerson) return []

    return currentPeriodData.map(item => {
      const itemAny = item as any
      if (currentRole === 'setter') {
        return {
          date: item.submission_date,
          ...item,
          pickupRate: itemAny.dials_today > 0 ? (itemAny.pickups_today / itemAny.dials_today) * 100 : 0,
          convoRate: itemAny.pickups_today > 0 ? (itemAny.one_min_convos / itemAny.pickups_today) * 100 : 0,
        }
      } else {
        return {
          date: item.submission_date,
          ...item,
          noShowRate: itemAny.appointments_on_calendar > 0 ? (itemAny.no_shows_today / itemAny.appointments_on_calendar) * 100 : 0,
          closingRate: itemAny.live_calls_today > 0 ? (itemAny.deals_closed / itemAny.live_calls_today) * 100 : 0,
        }
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [currentPeriodData, selectedPerson, currentRole])

  const exportToCSV = () => {
    if (!detailedBreakdown.length) return

    const headers = currentRole === 'setter' ?
      ['Date', 'Dials', 'Pickups', 'Pickup Rate %', 'Conversations', 'Conversation Rate %', 'DQs', 'Appointments', 'Performance Score', 'Hours of Sleep'] :
      ['Date', 'Appointments', 'Live Calls', 'No Show Rate %', 'Offers', 'Deals', 'Closing Rate %', 'Cash Collected', 'Performance Score', 'Focus Score']

    const csvContent = [
      headers.join(','),
      ...detailedBreakdown.map(row => {
        const rowAny = row as any
        if (currentRole === 'setter') {
          return [
            row.date,
            rowAny.dials_today || 0,
            rowAny.pickups_today || 0,
            safeToFixed(rowAny.pickupRate, 2),
            rowAny.one_min_convos || 0,
            safeToFixed(rowAny.convoRate, 2),
            rowAny.dqs_today || 0,
            rowAny.qualified_appointments || 0,
            safeToFixed(rowAny.performance_score, 2),
            rowAny.hours_of_sleep || 0,
          ].join(',')
        } else {
          return [
            row.date,
            rowAny.appointments_on_calendar || 0,
            rowAny.live_calls_today || 0,
            safeToFixed(rowAny.noShowRate, 2),
            rowAny.offers_made || 0,
            rowAny.deals_closed || 0,
            safeToFixed(rowAny.closingRate, 2),
            rowAny.cash_collected || 0,
            safeToFixed(rowAny.performance_score, 2),
            rowAny.focus_score || 0,
          ].join(',')
        }
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedPerson}-${timePeriod}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!selectedPerson) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Rep Report</h1>
          <p className="text-muted-foreground">Select a {getRoleLabel(currentRole).slice(0, -1).toLowerCase()} to view detailed analytics</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select a {getRoleLabel(currentRole).slice(0, -1)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedPerson} onValueChange={setSelectedPerson}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder={`Choose a ${getRoleLabel(currentRole).slice(0, -1).toLowerCase()} to analyze`} />
              </SelectTrigger>
              <SelectContent>
                {people?.map((person) => (
                  <SelectItem key={person} value={person}>
                    {person}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rep Report: {selectedPerson}</h1>
          <p className="text-muted-foreground">
            {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPerson} onValueChange={setSelectedPerson}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {people?.map((person) => (
                <SelectItem key={person} value={person}>
                  {person}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} disabled={!detailedBreakdown.length}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentRole === 'setter' ? (
          <>
            <KPICard
              title="Total Dials"
              value={(currentPeriodStats as any).totalDials || 0}
              color="blue"
              icon={Target}
            />
            <KPICard
              title="Total Appointments"
              value={(currentPeriodStats as any).totalAppointments || 0}
              color="purple"
              icon={Calendar}
            />
            <KPICard
              title="Deals Closed"
              value={0}
              color="green"
              icon={TrendingUp}
            />
          </>
        ) : (
          <>
            <KPICard
              title="Live Calls"
              value={(currentPeriodStats as any).totalLiveCalls || 0}
              color="blue"
              icon={Target}
            />
            <KPICard
              title="Offers Made"
              value={(currentPeriodStats as any).totalOffersMade || 0}
              color="purple"
              icon={Calendar}
            />
            <KPICard
              title="Deals Closed"
              value={(currentPeriodStats as any).totalDealsClosed || 0}
              color="green"
              icon={TrendingUp}
            />
          </>
        )}
        <KPICard
          title="Consistency Score"
          value={`${safeToFixed(consistencyScore, 0)}%`}
          color="cyan"
          icon={Award}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Evolution */}
        <CustomLineChart
          title={`Performance Evolution (${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)}ly)`}
          description="Track performance trends over time"
          data={trendData}
          lines={[
            { dataKey: 'performanceScore', stroke: '#8B5CF6', name: 'Performance Score' },
            { dataKey: 'deals', stroke: '#10B981', name: 'Deals Closed' },
          ]}
          height={350}
        />

        {/* Activity Distribution */}
        <CustomBarChart
          title="Activity Distribution"
          description="Breakdown of key metrics"
          data={currentRole === 'setter' ? [
            { name: 'Dials', value: (currentPeriodStats as any).totalDials || 0, percentage: 100 },
            { name: 'Pickups', value: (currentPeriodStats as any).totalPickups || 0, percentage: (currentPeriodStats as any).pickupRate || 0 },
            { name: 'Conversations', value: (currentPeriodStats as any).totalConvos || 0, percentage: (currentPeriodStats as any).convoRate || 0 },
            { name: 'Appointments', value: (currentPeriodStats as any).totalAppointments || 0, percentage: (((currentPeriodStats as any).totalAppointments || 0) / ((currentPeriodStats as any).totalDials || 1)) * 100 },
          ] : [
            { name: 'Calendar Appts', value: (currentPeriodStats as any).totalAppointmentsOnCalendar || 0, percentage: 100 },
            { name: 'Live Calls', value: (currentPeriodStats as any).totalLiveCalls || 0, percentage: (((currentPeriodStats as any).totalLiveCalls || 0) / ((currentPeriodStats as any).totalAppointmentsOnCalendar || 1)) * 100 },
            { name: 'Offers Made', value: (currentPeriodStats as any).totalOffersMade || 0, percentage: (((currentPeriodStats as any).totalOffersMade || 0) / ((currentPeriodStats as any).totalLiveCalls || 1)) * 100 },
            { name: 'Deals Closed', value: (currentPeriodStats as any).totalDealsClosed || 0, percentage: (((currentPeriodStats as any).totalDealsClosed || 0) / ((currentPeriodStats as any).totalOffersMade || 1)) * 100 },
          ]}
          bars={[
            { dataKey: 'value', fill: '#3B82F6', name: 'Total' },
          ]}
          height={350}
        />
      </div>

      {/* Highlights & Best Periods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Best Performance Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestPeriods.period ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Period:</span>
                  <Badge variant="secondary">{bestPeriods.period}</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Performance Score:</span>
                    <span className="font-mono font-semibold">{safeToFixed(bestPeriods.score, 1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{currentRole === 'setter' ? 'Dials Made:' : 'Primary Metric:'}</span>
                    <span className="font-mono font-semibold">{bestPeriods.metric1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deals Closed:</span>
                    <span className="font-mono font-semibold">{bestPeriods.deals}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No data available for this period</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Key Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentRole === 'setter' ? (
              <>
                <div className="flex justify-between">
                  <span>Average Daily Dials:</span>
                  <span className="font-mono font-semibold">
                    {detailedBreakdown.length > 0 ?
                      Math.round(((currentPeriodStats as any).totalDials || 0) / detailedBreakdown.length) : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pickup Rate:</span>
                  <span className="font-mono font-semibold">
                    {safeToFixed((currentPeriodStats as any).pickupRate, 1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Conversation Rate:</span>
                  <span className="font-mono font-semibold">
                    {safeToFixed((currentPeriodStats as any).convoRate, 1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Show Rate:</span>
                  <span className="font-mono font-semibold">
                    {safeToFixed((currentPeriodStats as any).showRate, 1)}%
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>Average Daily Live Calls:</span>
                  <span className="font-mono font-semibold">
                    {detailedBreakdown.length > 0 ?
                      Math.round(((currentPeriodStats as any).totalLiveCalls || 0) / detailedBreakdown.length) : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>No Show Rate:</span>
                  <span className="font-mono font-semibold">
                    {safeToFixed((currentPeriodStats as any).noShowRate, 1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Closing Rate:</span>
                  <span className="font-mono font-semibold">
                    {safeToFixed((currentPeriodStats as any).closingRate, 1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Cash Per Deal:</span>
                  <span className="font-mono font-semibold">
                    ${safeToFixed((currentPeriodStats as any).averageCashPerDeal, 0)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span>Avg Performance Score:</span>
              <span className="font-mono font-semibold">
                {safeToFixed((currentPeriodStats as any).averagePerformanceScore, 1)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {currentRole === 'setter' ? (
                    <>
                      <TableHead className="text-right">Dials</TableHead>
                      <TableHead className="text-right">Pickups</TableHead>
                      <TableHead className="text-right">Pick %</TableHead>
                      <TableHead className="text-right">Convos</TableHead>
                      <TableHead className="text-right">Conv %</TableHead>
                      <TableHead className="text-right">DQs</TableHead>
                      <TableHead className="text-right">Appts</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Sleep</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-right">Cal Appts</TableHead>
                      <TableHead className="text-right">Live Calls</TableHead>
                      <TableHead className="text-right">No Show %</TableHead>
                      <TableHead className="text-right">Offers</TableHead>
                      <TableHead className="text-right">Deals</TableHead>
                      <TableHead className="text-right">Close %</TableHead>
                      <TableHead className="text-right">Cash</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Focus</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedBreakdown.map((row) => {
                  const rowAny = row as any
                  return (
                    <TableRow key={row.date}>
                      <TableCell className="font-medium">
                        {format(new Date(row.date), 'MMM dd, yyyy')}
                      </TableCell>
                      {currentRole === 'setter' ? (
                        <>
                          <TableCell className="text-right font-mono">{rowAny.dials_today || 0}</TableCell>
                          <TableCell className="text-right font-mono">{rowAny.pickups_today || 0}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="font-mono">
                              {safeToFixed(rowAny.pickupRate, 1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{rowAny.one_min_convos || 0}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="font-mono">
                              {safeToFixed(rowAny.convoRate, 1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{rowAny.dqs_today || 0}</TableCell>
                          <TableCell className="text-right font-mono">{rowAny.qualified_appointments || 0}</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                rowAny.performance_score >= 4 ? 'default' :
                                rowAny.performance_score >= 3 ? 'secondary' :
                                'destructive'
                              }
                              className="font-mono"
                            >
                              {safeToFixed(rowAny.performance_score, 1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{rowAny.hours_of_sleep || 0}h</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-right font-mono">{rowAny.appointments_on_calendar || 0}</TableCell>
                          <TableCell className="text-right font-mono">{rowAny.live_calls_today || 0}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="font-mono">
                              {safeToFixed(rowAny.noShowRate, 1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{rowAny.offers_made || 0}</TableCell>
                          <TableCell className="text-right font-mono">{rowAny.deals_closed || 0}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="font-mono">
                              {safeToFixed(rowAny.closingRate, 1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">${(rowAny.cash_collected || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                rowAny.performance_score >= 4 ? 'default' :
                                rowAny.performance_score >= 3 ? 'secondary' :
                                'destructive'
                              }
                              className="font-mono"
                            >
                              {safeToFixed(rowAny.performance_score, 1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{rowAny.focus_score || 0}</TableCell>
                        </>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}