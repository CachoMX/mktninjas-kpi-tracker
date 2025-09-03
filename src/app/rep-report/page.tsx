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
import { useKPIData, useDashboardStats, useSetters } from '@/hooks/use-kpi-data'

type TimePeriod = 'month' | 'quarter' | 'year'

export default function RepReportPage() {
  const [selectedSetter, setSelectedSetter] = useState<string>('')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')
  
  const { data: setters } = useSetters()

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
    setters: selectedSetter ? [selectedSetter] : [],
    dateRange,
    metrics: [],
  })

  const { data: historicalData } = useKPIData({
    setters: selectedSetter ? [selectedSetter] : [],
    dateRange: {
      from: timePeriod === 'year' ? subYears(dateRange.from, 2) : 
           timePeriod === 'quarter' ? subQuarters(dateRange.from, 7) : 
           subMonths(dateRange.from, 11),
      to: dateRange.to
    },
    metrics: [],
  })

  const currentPeriodStats = useDashboardStats(currentPeriodData || [])

  // Calculate performance trends
  const trendData = useMemo(() => {
    if (!historicalData || !selectedSetter) return []

    const groupBy = timePeriod === 'year' ? 'quarter' : timePeriod === 'quarter' ? 'month' : 'week'
    const grouped: Record<string, { period: string; dials: number; pickups: number; appointments: number; deals: number; performanceScore: number; count: number }> = {}

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
          dials: 0,
          pickups: 0,
          appointments: 0,
          deals: 0,
          performanceScore: 0,
          count: 0,
        }
      }

      grouped[key].dials += item.dials_today
      grouped[key].pickups += item.pickups_today
      grouped[key].appointments += item.qualified_appointments
      grouped[key].deals += item.deals_closed
      grouped[key].performanceScore += item.performance_score
      grouped[key].count += 1
    })

    return Object.values(grouped).map((item) => ({
      date: item.period,
      dials: item.dials,
      pickups: item.pickups,
      appointments: item.appointments,
      deals: item.deals,
      performanceScore: item.count > 0 ? item.performanceScore / item.count : 0,
    })).sort((a, b) => a.date.localeCompare(b.date))
  }, [historicalData, selectedSetter, timePeriod])

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
      dials: bestPerformance.dials,
      deals: bestPerformance.deals,
    }
  }, [trendData])

  // Detailed breakdown by time period
  const detailedBreakdown = useMemo(() => {
    if (!currentPeriodData || !selectedSetter) return []

    return currentPeriodData.map(item => ({
      date: item.submission_date,
      ...item,
      pickupRate: item.dials_today > 0 ? (item.pickups_today / item.dials_today) * 100 : 0,
      convoRate: item.pickups_today > 0 ? (item.one_min_convos / item.pickups_today) * 100 : 0,
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [currentPeriodData, selectedSetter])

  const exportToCSV = () => {
    if (!detailedBreakdown.length) return

    const headers = [
      'Date', 'Dials', 'Pickups', 'Pickup Rate %', 'Conversations', 'Conversation Rate %',
      'DQs', 'Appointments', 'Deals', 'Performance Score', 'Hours of Sleep'
    ]

    const csvContent = [
      headers.join(','),
      ...detailedBreakdown.map(row => [
        row.date,
        row.dials_today,
        row.pickups_today,
        row.pickupRate.toFixed(2),
        row.one_min_convos,
        row.convoRate.toFixed(2),
        row.dqs_today,
        row.qualified_appointments,
        row.deals_closed,
        row.performance_score.toFixed(2),
        row.hours_of_sleep,
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedSetter}-${timePeriod}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!selectedSetter) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Rep Report</h1>
          <p className="text-muted-foreground">Select a setter to view detailed analytics</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select a Setter</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedSetter} onValueChange={setSelectedSetter}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Choose a setter to analyze" />
              </SelectTrigger>
              <SelectContent>
                {setters?.map((setter) => (
                  <SelectItem key={setter} value={setter}>
                    {setter}
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
          <h1 className="text-3xl font-bold">Rep Report: {selectedSetter}</h1>
          <p className="text-muted-foreground">
            {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedSetter} onValueChange={setSelectedSetter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {setters?.map((setter) => (
                <SelectItem key={setter} value={setter}>
                  {setter}
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
        <KPICard
          title="Total Dials"
          value={currentPeriodStats.totalDials}
          color="blue"
          icon={Target}
        />
        <KPICard
          title="Total Appointments"
          value={currentPeriodStats.totalAppointments}
          color="purple"
          icon={Calendar}
        />
        <KPICard
          title="Deals Closed"
          value={currentPeriodStats.totalDeals}
          color="green"
          icon={TrendingUp}
        />
        <KPICard
          title="Consistency Score"
          value={`${consistencyScore.toFixed(0)}%`}
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
          data={[
            { name: 'Dials', value: currentPeriodStats.totalDials, percentage: 100 },
            { name: 'Pickups', value: currentPeriodStats.totalPickups, percentage: currentPeriodStats.pickupRate },
            { name: 'Conversations', value: currentPeriodStats.totalConvos, percentage: currentPeriodStats.convoRate },
            { name: 'Appointments', value: currentPeriodStats.totalAppointments, percentage: (currentPeriodStats.totalAppointments / currentPeriodStats.totalDials) * 100 },
            { name: 'Deals', value: currentPeriodStats.totalDeals, percentage: (currentPeriodStats.totalDeals / currentPeriodStats.totalDials) * 100 },
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
                    <span className="font-mono font-semibold">{bestPeriods.score.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dials Made:</span>
                    <span className="font-mono font-semibold">{bestPeriods.dials}</span>
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
            <div className="flex justify-between">
              <span>Average Daily Dials:</span>
              <span className="font-mono font-semibold">
                {detailedBreakdown.length > 0 ? 
                  Math.round(currentPeriodStats.totalDials / detailedBreakdown.length) : 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Pickup Rate:</span>
              <span className="font-mono font-semibold">
                {currentPeriodStats.pickupRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Conversation Rate:</span>
              <span className="font-mono font-semibold">
                {currentPeriodStats.convoRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Show Rate:</span>
              <span className="font-mono font-semibold">
                {currentPeriodStats.showRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Avg Performance Score:</span>
              <span className="font-mono font-semibold">
                {currentPeriodStats.averagePerformanceScore.toFixed(1)}
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
                  <TableHead className="text-right">Dials</TableHead>
                  <TableHead className="text-right">Pickups</TableHead>
                  <TableHead className="text-right">Pick %</TableHead>
                  <TableHead className="text-right">Convos</TableHead>
                  <TableHead className="text-right">Conv %</TableHead>
                  <TableHead className="text-right">DQs</TableHead>
                  <TableHead className="text-right">Appts</TableHead>
                  <TableHead className="text-right">Deals</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Sleep</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedBreakdown.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell className="font-medium">
                      {format(new Date(row.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-mono">{row.dials_today}</TableCell>
                    <TableCell className="text-right font-mono">{row.pickups_today}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono">
                        {row.pickupRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{row.one_min_convos}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-mono">
                        {row.convoRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{row.dqs_today}</TableCell>
                    <TableCell className="text-right font-mono">{row.qualified_appointments}</TableCell>
                    <TableCell className="text-right font-mono">{row.deals_closed}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          row.performance_score >= 4 ? 'default' :
                          row.performance_score >= 3 ? 'secondary' :
                          'destructive'
                        }
                        className="font-mono"
                      >
                        {row.performance_score.toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{row.hours_of_sleep}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}