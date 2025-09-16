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
import { useKPIData, useDashboardStats } from '@/hooks/use-kpi-data'
import { cn } from '@/lib/utils'

export default function WeeklySummaryPage() {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const previousWeekStart = startOfWeek(subWeeks(currentWeek, 1), { weekStartsOn: 1 })
  const previousWeekEnd = endOfWeek(subWeeks(currentWeek, 1), { weekStartsOn: 1 })

  const { data: currentWeekData } = useKPIData({
    setters: [],
    dateRange: { from: weekStart, to: weekEnd },
    metrics: [],
  })

  const { data: previousWeekData } = useKPIData({
    setters: [],
    dateRange: { from: previousWeekStart, to: previousWeekEnd },
    metrics: [],
  })

  const currentWeekStats = useDashboardStats(currentWeekData || [])
  const previousWeekStats = useDashboardStats(previousWeekData || [])

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

      const dayStats = dayData.reduce((acc, curr) => ({
        dials: acc.dials + curr.dials_today,
        pickups: acc.pickups + curr.pickups_today,
        convos: acc.convos + curr.one_min_convos,
        appointments: acc.appointments + curr.qualified_appointments,
        deals: acc.deals + curr.deals_closed,
      }), { dials: 0, pickups: 0, convos: 0, appointments: 0, deals: 0 })

      return {
        day: format(day, 'EEEE'),
        date: format(day, 'MMM dd'),
        ...dayStats,
        pickupRate: dayStats.dials > 0 ? (dayStats.pickups / dayStats.dials) * 100 : 0,
      }
    })
  }, [currentWeekData, weekStart, weekEnd])

  const bestPerformingDay = useMemo(() => {
    if (!dailyBreakdown.length) return null
    return dailyBreakdown.reduce((best, current) => 
      current.dials > best.dials ? current : best
    )
  }, [dailyBreakdown])

  const teamAchievements = useMemo(() => {
    if (!currentWeekData) return []

    const achievements = []
    
    if (currentWeekStats.totalDials > 1000) {
      achievements.push({ 
        title: '1000+ Dials', 
        description: 'Team reached over 1000 dials this week',
        icon: Target,
        color: 'blue'
      })
    }

    if (currentWeekStats.pickupRate > 30) {
      achievements.push({
        title: 'High Pickup Rate',
        description: `${currentWeekStats.pickupRate.toFixed(1)}% pickup rate achieved`,
        icon: TrendingUp,
        color: 'green'
      })
    }

    if (currentWeekStats.totalDeals >= 10) {
      achievements.push({
        title: 'Double Digit Deals',
        description: `${currentWeekStats.totalDeals} deals closed this week`,
        icon: Trophy,
        color: 'yellow'
      })
    }

    return achievements
  }, [currentWeekStats, currentWeekData])

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
          <h1 className="text-3xl font-bold">Weekly Summary</h1>
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
        <KPICard
          title="Total Dials"
          value={currentWeekStats.totalDials}
          trend={calculateTrend(currentWeekStats.totalDials, previousWeekStats.totalDials)}
          color="blue"
        />
        <KPICard
          title="Total Pickups"
          value={currentWeekStats.totalPickups}
          subtitle={`${currentWeekStats.pickupRate.toFixed(1)}% pickup rate`}
          trend={calculateTrend(currentWeekStats.totalPickups, previousWeekStats.totalPickups)}
          color="green"
        />
        <KPICard
          title="1min+ Conversations"
          value={currentWeekStats.totalConvos}
          subtitle={`${currentWeekStats.convoRate.toFixed(1)}% conversion rate`}
          trend={calculateTrend(currentWeekStats.totalConvos, previousWeekStats.totalConvos)}
          color="orange"
        />
        <KPICard
          title="Total DQs"
          value={currentWeekStats.totalDQs}
          trend={calculateTrend(currentWeekStats.totalDQs, previousWeekStats.totalDQs)}
          color="red"
        />
        <KPICard
          title="Qualified Appointments"
          value={currentWeekStats.totalAppointments}
          trend={calculateTrend(currentWeekStats.totalAppointments, previousWeekStats.totalAppointments)}
          color="purple"
        />
        <KPICard
          title="Deals Closed"
          value={currentWeekStats.totalDeals}
          trend={calculateTrend(currentWeekStats.totalDeals, previousWeekStats.totalDeals)}
          color="cyan"
        />
        <KPICard
          title="Avg Performance Score"
          value={currentWeekStats.averagePerformanceScore.toFixed(1)}
          trend={calculateTrend(currentWeekStats.averagePerformanceScore, previousWeekStats.averagePerformanceScore)}
          color="yellow"
        />
        <KPICard
          title="Follow Ups"
          value={currentWeekStats.totalFollowUps}
          trend={calculateTrend(currentWeekStats.totalFollowUps, previousWeekStats.totalFollowUps)}
          color="pink"
        />
        <KPICard
          title="Discovery Calls"
          value={currentWeekStats.totalDiscoveryCalls}
          trend={calculateTrend(currentWeekStats.totalDiscoveryCalls, previousWeekStats.totalDiscoveryCalls)}
          color="indigo"
        />
        <KPICard
          title="Showed Up"
          value={currentWeekStats.totalShowedUp}
          subtitle={`${currentWeekStats.showRate.toFixed(1)}% show rate`}
          trend={calculateTrend(currentWeekStats.totalShowedUp, previousWeekStats.totalShowedUp)}
          color="emerald"
        />
        <KPICard
          title="Rescheduled"
          value={currentWeekStats.totalRescheduled}
          trend={calculateTrend(currentWeekStats.totalRescheduled, previousWeekStats.totalRescheduled)}
          color="amber"
        />
        <KPICard
          title="Full Territory"
          value={currentWeekStats.totalFullTerritory}
          trend={calculateTrend(currentWeekStats.totalFullTerritory, previousWeekStats.totalFullTerritory)}
          color="slate"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Breakdown Chart */}
        <CustomBarChart
          title="Daily Performance Breakdown"
          description={dailyBreakdown.length > 0 ? "Performance metrics for each day of the week" : "No data available for this week"}
          data={dailyBreakdown.length > 0 ? dailyBreakdown : [
            { day: 'Monday', dials: 0, pickups: 0, appointments: 0 },
            { day: 'Tuesday', dials: 0, pickups: 0, appointments: 0 },
            { day: 'Wednesday', dials: 0, pickups: 0, appointments: 0 },
            { day: 'Thursday', dials: 0, pickups: 0, appointments: 0 },
            { day: 'Friday', dials: 0, pickups: 0, appointments: 0 },
            { day: 'Saturday', dials: 0, pickups: 0, appointments: 0 },
            { day: 'Sunday', dials: 0, pickups: 0, appointments: 0 },
          ]}
          bars={[
            { dataKey: 'dials', fill: '#3B82F6', name: 'Dials' },
            { dataKey: 'pickups', fill: '#10B981', name: 'Pickups' },
            { dataKey: 'appointments', fill: '#8B5CF6', name: 'Appointments' },
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
                    <div>
                      <span className="text-muted-foreground">Dials:</span>
                      <span className="ml-2 font-mono">{bestPerformingDay.dials}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pickups:</span>
                      <span className="ml-2 font-mono">{bestPerformingDay.pickups}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pickup Rate:</span>
                      <span className="ml-2 font-mono">{bestPerformingDay.pickupRate.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Appointments:</span>
                      <span className="ml-2 font-mono">{bestPerformingDay.appointments}</span>
                    </div>
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
                <TableHead className="text-right">Dials</TableHead>
                <TableHead className="text-right">Pickups</TableHead>
                <TableHead className="text-right">Pickup %</TableHead>
                <TableHead className="text-right">Conversations</TableHead>
                <TableHead className="text-right">Appointments</TableHead>
                <TableHead className="text-right">Deals</TableHead>
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
                  <TableCell className="text-right font-mono">{day.dials}</TableCell>
                  <TableCell className="text-right font-mono">{day.pickups}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="font-mono">
                      {day.pickupRate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{day.convos}</TableCell>
                  <TableCell className="text-right font-mono">{day.appointments}</TableCell>
                  <TableCell className="text-right font-mono">{day.deals}</TableCell>
                </TableRow>
              ))}
              {/* Weekly Totals Row */}
              <TableRow className="border-t-2 font-bold">
                <TableCell>Weekly Total</TableCell>
                <TableCell className="text-right font-mono">{currentWeekStats.totalDials}</TableCell>
                <TableCell className="text-right font-mono">{currentWeekStats.totalPickups}</TableCell>
                <TableCell className="text-right">
                  <Badge className="font-mono">
                    {currentWeekStats.pickupRate.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{currentWeekStats.totalConvos}</TableCell>
                <TableCell className="text-right font-mono">{currentWeekStats.totalAppointments}</TableCell>
                <TableCell className="text-right font-mono">{currentWeekStats.totalDeals}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}