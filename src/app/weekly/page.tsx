'use client'

import { useState, useMemo } from 'react'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, eachDayOfInterval } from 'date-fns'
import { ChevronLeft, ChevronRight, TrendingUp, Trophy, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/cards/kpi-card'
import { CustomBarChart } from '@/components/charts/bar-chart'
import { useKPIData, useSetterDashboardStats, useCloserDashboardStats } from '@/hooks/use-kpi-data'
import { useRole } from '@/contexts/role-context'
import { cn } from '@/lib/utils'

export default function WeeklySummaryPage() {
  const { currentRole } = useRole()
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const previousWeekStart = startOfWeek(subWeeks(currentWeek, 1), { weekStartsOn: 1 })
  const previousWeekEnd = endOfWeek(subWeeks(currentWeek, 1), { weekStartsOn: 1 })

  const { data: currentWeekData } = useKPIData({
    people: [],
    dateRange: { from: weekStart, to: weekEnd },
    metrics: [],
    role: currentRole,
  }, currentRole)

  const { data: previousWeekData } = useKPIData({
    people: [],
    dateRange: { from: previousWeekStart, to: previousWeekEnd },
    metrics: [],
    role: currentRole,
  }, currentRole)

  const currentSetterStats = useSetterDashboardStats((currentWeekData || []) as any)
  const currentCloserStats = useCloserDashboardStats((currentWeekData || []) as any)
  const previousSetterStats = useSetterDashboardStats((previousWeekData || []) as any)
  const previousCloserStats = useCloserDashboardStats((previousWeekData || []) as any)

  const currentWeekStats = currentRole === 'setter' ? currentSetterStats : currentCloserStats
  const previousWeekStats = currentRole === 'setter' ? previousSetterStats : previousCloserStats

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, direction: 'neutral' as const, period: 'last week' }
    const change = ((current - previous) / previous) * 100
    return {
      value: Math.abs(change),
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
      period: 'last week',
    }
  }

  const dailyBreakdown = useMemo(() => {
    if (!currentWeekData) return []

    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    return weekDays.map(day => {
      const dayData = currentWeekData.filter(item =>
        format(new Date(item.submission_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      )

      let dayStats: any = {}

      if (currentRole === 'setter') {
        dayStats = dayData.reduce((acc, curr: any) => ({
          dials: acc.dials + (curr.dials_today || 0),
          pickups: acc.pickups + (curr.pickups_today || 0),
          convos: acc.convos + (curr.one_min_convos || 0),
          appointments: acc.appointments + (curr.qualified_appointments || 0),
          deals: acc.deals + 0,
        }), { dials: 0, pickups: 0, convos: 0, appointments: 0, deals: 0 })

        dayStats.pickupRate = dayStats.dials > 0 ? (dayStats.pickups / dayStats.dials) * 100 : 0
      } else {
        dayStats = dayData.reduce((acc, curr: any) => ({
          appointments: acc.appointments + (curr.appointments_on_calendar || 0),
          liveCalls: acc.liveCalls + (curr.live_calls_today || 0),
          offers: acc.offers + (curr.offers_made || 0),
          deals: acc.deals + (curr.deals_closed || 0),
          cash: acc.cash + (curr.cash_collected || 0),
        }), { appointments: 0, liveCalls: 0, offers: 0, deals: 0, cash: 0 })

        dayStats.closingRate = dayStats.offers > 0 ? (dayStats.deals / dayStats.offers) * 100 : 0
      }

      return {
        day: format(day, 'EEEE'),
        date: format(day, 'MMM dd'),
        ...dayStats,
      }
    })
  }, [currentWeekData, weekStart, weekEnd, currentRole])

  const bestPerformingDay = useMemo(() => {
    if (!dailyBreakdown.length) return null
    const sortKey = currentRole === 'setter' ? 'dials' : 'deals'
    return dailyBreakdown.reduce((best, current) =>
      (current[sortKey] || 0) > (best[sortKey] || 0) ? current : best
    )
  }, [dailyBreakdown, currentRole])

  const teamAchievements = useMemo(() => {
    if (!currentWeekData) return []

    const achievements = []
    
    if (currentRole === 'setter') {
      const stats = currentWeekStats as any
      if (stats.totalDials > 1000) {
        achievements.push({
          title: '1000+ Dials',
          description: 'Team reached over 1000 dials this week',
          icon: Target,
          color: 'blue'
        })
      }

      if (stats.pickupRate > 30) {
        achievements.push({
          title: 'High Pickup Rate',
          description: `${stats.pickupRate.toFixed(1)}% pickup rate achieved`,
          icon: TrendingUp,
          color: 'green'
        })
      }
    } else {
      const stats = currentWeekStats as any
      if (stats.totalDealsClosed > 20) {
        achievements.push({
          title: '20+ Deals Closed',
          description: 'Team closed over 20 deals this week',
          icon: Target,
          color: 'blue'
        })
      }

      if (stats.totalDealsClosingRate > 50) {
        achievements.push({
          title: 'High Closing Rate',
          description: `${stats.totalDealsClosingRate.toFixed(1)}% closing rate achieved`,
          icon: TrendingUp,
          color: 'green'
        })
      }
    }


    return achievements
  }, [currentWeekStats, currentWeekData, currentRole])

  const navigateWeek = (direction: 'previous' | 'next') => {
    if (direction === 'previous') {
      setCurrentWeek(prev => subWeeks(prev, 1))
    } else {
      setCurrentWeek(prev => addWeeks(prev, 1))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Week Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{currentRole === 'setter' ? 'Setter' : 'Closer'} Weekly Summary</h1>
          <p className="text-muted-foreground">
            {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('previous')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            This Week
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateWeek('next')}
            disabled={weekStart >= startOfWeek(new Date(), { weekStartsOn: 1 })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week-over-Week Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentRole === 'setter' ? (
          <>
            {/* Setter KPI Cards */}
            <KPICard
              title="Total Dials"
              value={(currentWeekStats as any).totalDials || 0}
              trend={calculateTrend((currentWeekStats as any).totalDials || 0, (previousWeekStats as any).totalDials || 0)}
              color="blue"
            />
            <KPICard
              title="Total Pickups"
              value={(currentWeekStats as any).totalPickups || 0}
              subtitle={`${((currentWeekStats as any).pickupRate || 0).toFixed(1)}% pickup rate`}
              trend={calculateTrend((currentWeekStats as any).totalPickups || 0, (previousWeekStats as any).totalPickups || 0)}
              color="green"
            />
            <KPICard
              title="1min+ Conversations"
              value={(currentWeekStats as any).totalConvos || 0}
              subtitle={`${((currentWeekStats as any).convoRate || 0).toFixed(1)}% conversion rate`}
              trend={calculateTrend((currentWeekStats as any).totalConvos || 0, (previousWeekStats as any).totalConvos || 0)}
              color="yellow"
            />
            <KPICard
              title="Total DQs"
              value={(currentWeekStats as any).totalDQs || 0}
              trend={calculateTrend((currentWeekStats as any).totalDQs || 0, (previousWeekStats as any).totalDQs || 0)}
              color="red"
            />
            <KPICard
              title="Qualified Appointments"
              value={(currentWeekStats as any).totalAppointments || 0}
              trend={calculateTrend((currentWeekStats as any).totalAppointments || 0, (previousWeekStats as any).totalAppointments || 0)}
              color="purple"
            />
            <KPICard
              title="Avg Performance Score"
              value={((currentWeekStats as any).averagePerformanceScore || 0).toFixed(1)}
              trend={calculateTrend((currentWeekStats as any).averagePerformanceScore || 0, (previousWeekStats as any).averagePerformanceScore || 0)}
              color="yellow"
            />
            <KPICard
              title="Follow Ups"
              value={(currentWeekStats as any).totalFollowUps || 0}
              trend={calculateTrend((currentWeekStats as any).totalFollowUps || 0, (previousWeekStats as any).totalFollowUps || 0)}
              color="purple"
            />
            <KPICard
              title="Discovery Calls"
              value={(currentWeekStats as any).totalDiscoveryCalls || 0}
              trend={calculateTrend((currentWeekStats as any).totalDiscoveryCalls || 0, (previousWeekStats as any).totalDiscoveryCalls || 0)}
              color="blue"
            />
            <KPICard
              title="Showed Up"
              value={(currentWeekStats as any).totalShowedUp || 0}
              subtitle={`${((currentWeekStats as any).showRate || 0).toFixed(1)}% show rate`}
              trend={calculateTrend((currentWeekStats as any).totalShowedUp || 0, (previousWeekStats as any).totalShowedUp || 0)}
              color="green"
            />
            <KPICard
              title="Rescheduled"
              value={(currentWeekStats as any).totalRescheduled || 0}
              trend={calculateTrend((currentWeekStats as any).totalRescheduled || 0, (previousWeekStats as any).totalRescheduled || 0)}
              color="red"
            />
            <KPICard
              title="Full Territory"
              value={(currentWeekStats as any).totalFullTerritory || 0}
              trend={calculateTrend((currentWeekStats as any).totalFullTerritory || 0, (previousWeekStats as any).totalFullTerritory || 0)}
              color="cyan"
            />
          </>
        ) : (
          <>
            {/* Closer KPI Cards */}
            <KPICard
              title="Appointments on Calendar"
              value={(currentWeekStats as any).totalAppointmentsOnCalendar || 0}
              trend={calculateTrend((currentWeekStats as any).totalAppointmentsOnCalendar || 0, (previousWeekStats as any).totalAppointmentsOnCalendar || 0)}
              color="blue"
            />
            <KPICard
              title="Live Calls"
              value={(currentWeekStats as any).totalLiveCalls || 0}
              trend={calculateTrend((currentWeekStats as any).totalLiveCalls || 0, (previousWeekStats as any).totalLiveCalls || 0)}
              color="green"
            />
            <KPICard
              title="No Shows"
              value={(currentWeekStats as any).totalNoShows || 0}
              subtitle={`${((currentWeekStats as any).noShowRate || 0).toFixed(1)}% no show rate`}
              trend={calculateTrend((currentWeekStats as any).totalNoShows || 0, (previousWeekStats as any).totalNoShows || 0)}
              color="red"
            />
            <KPICard
              title="Follow-up Calls"
              value={(currentWeekStats as any).totalFollowUpCallsScheduled || 0}
              trend={calculateTrend((currentWeekStats as any).totalFollowUpCallsScheduled || 0, (previousWeekStats as any).totalFollowUpCallsScheduled || 0)}
              color="purple"
            />
            <KPICard
              title="Calls Rescheduled"
              value={(currentWeekStats as any).totalCallsRescheduled || 0}
              trend={calculateTrend((currentWeekStats as any).totalCallsRescheduled || 0, (previousWeekStats as any).totalCallsRescheduled || 0)}
              color="cyan"
            />
            <KPICard
              title="Offers Made"
              value={(currentWeekStats as any).totalOffersMade || 0}
              trend={calculateTrend((currentWeekStats as any).totalOffersMade || 0, (previousWeekStats as any).totalOffersMade || 0)}
              color="blue"
            />
            <KPICard
              title="Deals Closed"
              value={(currentWeekStats as any).totalDealsClosed || 0}
              subtitle={`${((currentWeekStats as any).totalDealsClosingRate || 0).toFixed(1)}% closing rate`}
              trend={calculateTrend((currentWeekStats as any).totalDealsClosed || 0, (previousWeekStats as any).totalDealsClosed || 0)}
              color="green"
            />
            <KPICard
              title="Deposits Collected"
              value={(currentWeekStats as any).totalDepositsCollected || 0}
              trend={calculateTrend((currentWeekStats as any).totalDepositsCollected || 0, (previousWeekStats as any).totalDepositsCollected || 0)}
              color="yellow"
            />
            <KPICard
              title="Cash Collected"
              value={(currentWeekStats as any).totalCashCollected || 0}
              subtitle={`$${((currentWeekStats as any).averageCashPerDeal || 0).toFixed(0)} avg per deal`}
              trend={calculateTrend((currentWeekStats as any).totalCashCollected || 0, (previousWeekStats as any).totalCashCollected || 0)}
              format="currency"
              color="green"
            />
            <KPICard
              title="Avg Performance Score"
              value={((currentWeekStats as any).averagePerformanceScore || 0).toFixed(1)}
              trend={calculateTrend((currentWeekStats as any).averagePerformanceScore || 0, (previousWeekStats as any).averagePerformanceScore || 0)}
              color="yellow"
            />
            <KPICard
              title="Avg Focus Score"
              value={((currentWeekStats as any).averageFocusScore || 0).toFixed(1)}
              trend={calculateTrend((currentWeekStats as any).averageFocusScore || 0, (previousWeekStats as any).averageFocusScore || 0)}
              color="blue"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Breakdown Chart */}
        <CustomBarChart
          title="Daily Performance Breakdown"
          description={dailyBreakdown.length > 0 ? "Performance metrics for each day of the week" : "No data available for this week"}
          data={dailyBreakdown.length > 0 ? dailyBreakdown : (
            currentRole === 'setter' ? [
              { day: 'Monday', dials: 0, pickups: 0, appointments: 0 },
              { day: 'Tuesday', dials: 0, pickups: 0, appointments: 0 },
              { day: 'Wednesday', dials: 0, pickups: 0, appointments: 0 },
              { day: 'Thursday', dials: 0, pickups: 0, appointments: 0 },
              { day: 'Friday', dials: 0, pickups: 0, appointments: 0 },
              { day: 'Saturday', dials: 0, pickups: 0, appointments: 0 },
              { day: 'Sunday', dials: 0, pickups: 0, appointments: 0 },
            ] : [
              { day: 'Monday', appointments: 0, liveCalls: 0, deals: 0 },
              { day: 'Tuesday', appointments: 0, liveCalls: 0, deals: 0 },
              { day: 'Wednesday', appointments: 0, liveCalls: 0, deals: 0 },
              { day: 'Thursday', appointments: 0, liveCalls: 0, deals: 0 },
              { day: 'Friday', appointments: 0, liveCalls: 0, deals: 0 },
              { day: 'Saturday', appointments: 0, liveCalls: 0, deals: 0 },
              { day: 'Sunday', appointments: 0, liveCalls: 0, deals: 0 },
            ]
          )}
          bars={currentRole === 'setter' ? [
            { dataKey: 'dials', fill: '#3B82F6', name: 'Dials' },
            { dataKey: 'pickups', fill: '#10B981', name: 'Pickups' },
            { dataKey: 'appointments', fill: '#8B5CF6', name: 'Appointments' },
          ] : [
            { dataKey: 'appointments', fill: '#3B82F6', name: 'Appointments' },
            { dataKey: 'liveCalls', fill: '#10B981', name: 'Live Calls' },
            { dataKey: 'deals', fill: '#22C55E', name: 'Deals Closed' },
          ]}
          xAxisKey="day"
          height={350}
        />

        {/* Best Performing Day & Achievements */}
        <div className="space-y-6">
          {/* Best Day Highlight */}
          {bestPerformingDay && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Best Performing Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{bestPerformingDay.day}</span>
                    <Badge variant="secondary">{bestPerformingDay.date}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {currentRole === 'setter' ? (
                      <>
                        <div>
                          <span className="text-muted-foreground">Dials:</span>
                          <span className="ml-2 font-mono">{bestPerformingDay.dials || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pickups:</span>
                          <span className="ml-2 font-mono">{bestPerformingDay.pickups || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pickup Rate:</span>
                          <span className="ml-2 font-mono">{(bestPerformingDay.pickupRate || 0).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Appointments:</span>
                          <span className="ml-2 font-mono">{bestPerformingDay.appointments || 0}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-muted-foreground">Appointments:</span>
                          <span className="ml-2 font-mono">{bestPerformingDay.appointments || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Live Calls:</span>
                          <span className="ml-2 font-mono">{bestPerformingDay.liveCalls || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Deals Closed:</span>
                          <span className="ml-2 font-mono">{bestPerformingDay.deals || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Closing Rate:</span>
                          <span className="ml-2 font-mono">{(bestPerformingDay.closingRate || 0).toFixed(1)}%</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Achievements */}
          {teamAchievements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Team Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamAchievements.map((achievement, index) => {
                    const Icon = achievement.icon
                    return (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                        <Icon className={cn('h-5 w-5', {
                          'text-blue-500': achievement.color === 'blue',
                          'text-green-500': achievement.color === 'green',
                          'text-yellow-500': achievement.color === 'yellow',
                        })} />
                        <div>
                          <div className="font-medium">{achievement.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {achievement.description}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Metrics Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                {currentRole === 'setter' ? (
                  <>
                    <TableHead className="text-right">Dials</TableHead>
                    <TableHead className="text-right">Pickups</TableHead>
                    <TableHead className="text-right">Pickup %</TableHead>
                    <TableHead className="text-right">Conversations</TableHead>
                    <TableHead className="text-right">Appointments</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-right">Appointments</TableHead>
                    <TableHead className="text-right">Live Calls</TableHead>
                    <TableHead className="text-right">Offers</TableHead>
                    <TableHead className="text-right">Deals</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyBreakdown.map((day) => (
                <TableRow key={day.day}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{day.day}</div>
                      <div className="text-sm text-muted-foreground">{day.date}</div>
                    </div>
                  </TableCell>
                  {currentRole === 'setter' ? (
                    <>
                      <TableCell className="text-right font-mono">{day.dials || 0}</TableCell>
                      <TableCell className="text-right font-mono">{day.pickups || 0}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono">
                          {(day.pickupRate || 0).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{day.convos || 0}</TableCell>
                      <TableCell className="text-right font-mono">{day.appointments || 0}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-right font-mono">{day.appointments || 0}</TableCell>
                      <TableCell className="text-right font-mono">{day.liveCalls || 0}</TableCell>
                      <TableCell className="text-right font-mono">{day.offers || 0}</TableCell>
                      <TableCell className="text-right font-mono">{day.deals || 0}</TableCell>
                      <TableCell className="text-right font-mono">${(day.cash || 0).toLocaleString()}</TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {/* Weekly Totals Row */}
              <TableRow className="border-t-2 font-bold">
                <TableCell>Weekly Total</TableCell>
                {currentRole === 'setter' ? (
                  <>
                    <TableCell className="text-right font-mono">{(currentWeekStats as any).totalDials || 0}</TableCell>
                    <TableCell className="text-right font-mono">{(currentWeekStats as any).totalPickups || 0}</TableCell>
                    <TableCell className="text-right">
                      <Badge className="font-mono">
                        {((currentWeekStats as any).pickupRate || 0).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{(currentWeekStats as any).totalConvos || 0}</TableCell>
                    <TableCell className="text-right font-mono">{(currentWeekStats as any).totalAppointments || 0}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-right font-mono">{(currentWeekStats as any).totalAppointmentsOnCalendar || 0}</TableCell>
                    <TableCell className="text-right font-mono">{(currentWeekStats as any).totalLiveCalls || 0}</TableCell>
                    <TableCell className="text-right font-mono">{(currentWeekStats as any).totalOffersMade || 0}</TableCell>
                    <TableCell className="text-right font-mono">{(currentWeekStats as any).totalDealsClosed || 0}</TableCell>
                    <TableCell className="text-right font-mono">${((currentWeekStats as any).totalCashCollected || 0).toLocaleString()}</TableCell>
                  </>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}