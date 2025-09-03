'use client'

import { useState, useMemo } from 'react'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'
import { format, startOfDay, endOfDay, subDays, addDays, isToday, isFuture } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Users, TrendingUp, Target, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { KPICard } from '@/components/cards/kpi-card'
import { useKPIData, useDashboardStats } from '@/hooks/use-kpi-data'

// Mock goals - in a real app, these would come from settings
const DAILY_GOALS = {
  dials: 100,
  pickups: 25,
  conversations: 15,
  appointments: 5,
  deals: 2,
}

export default function DailySummaryPage() {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))

  const dayStart = startOfDay(selectedDate)
  const dayEnd = endOfDay(selectedDate)
  
  const { data: dailyData } = useKPIData({
    setters: [],
    dateRange: { from: dayStart, to: dayEnd },
    metrics: [],
  })

  const dailyStats = useDashboardStats(dailyData || [])

  // Get team average for comparison (last 30 days)
  const { data: averageData } = useKPIData({
    setters: [],
    dateRange: { 
      from: startOfDay(subDays(new Date(), 30)), 
      to: endOfDay(new Date()) 
    },
    metrics: [],
  })

  const teamAverage = useMemo(() => {
    if (!averageData?.length) return { dials: 0, pickups: 0, appointments: 0, deals: 0 }
    
    const days = new Set(averageData.map(item => item.submission_date)).size
    return {
      dials: Math.round(dailyStats.totalDials / Math.max(days, 1)),
      pickups: Math.round(dailyStats.totalPickups / Math.max(days, 1)),
      appointments: Math.round(dailyStats.totalAppointments / Math.max(days, 1)),
      deals: Math.round(dailyStats.totalDeals / Math.max(days, 1)),
    }
  }, [averageData, dailyStats])

  const setterPerformance = useMemo(() => {
    if (!dailyData) return []

    return dailyData.map(setter => ({
      ...setter,
      pickupRate: setter.dials_today > 0 ? (setter.pickups_today / setter.dials_today) * 100 : 0,
      convoRate: setter.pickups_today > 0 ? (setter.one_min_convos / setter.pickups_today) * 100 : 0,
      goalsAchieved: [
        setter.dials_today >= DAILY_GOALS.dials ? 'dials' : null,
        setter.pickups_today >= DAILY_GOALS.pickups ? 'pickups' : null,
        setter.one_min_convos >= DAILY_GOALS.conversations ? 'conversations' : null,
        setter.qualified_appointments >= DAILY_GOALS.appointments ? 'appointments' : null,
        setter.deals_closed >= DAILY_GOALS.deals ? 'deals' : null,
      ].filter(Boolean).length,
    })).sort((a, b) => b.performance_score - a.performance_score)
  }, [dailyData])

  const goalProgress = useMemo(() => {
    return {
      dials: Math.min((dailyStats.totalDials / DAILY_GOALS.dials) * 100, 100),
      pickups: Math.min((dailyStats.totalPickups / DAILY_GOALS.pickups) * 100, 100),
      conversations: Math.min((dailyStats.totalConvos / DAILY_GOALS.conversations) * 100, 100),
      appointments: Math.min((dailyStats.totalAppointments / DAILY_GOALS.appointments) * 100, 100),
      deals: Math.min((dailyStats.totalDeals / DAILY_GOALS.deals) * 100, 100),
    }
  }, [dailyStats])

  const navigateDate = (direction: 'previous' | 'next') => {
    if (direction === 'previous') {
      setSelectedDate(prev => subDays(prev, 1))
    } else if (!isFuture(addDays(selectedDate, 1))) {
      setSelectedDate(prev => addDays(prev, 1))
    }
  }

  const getPerformanceComparison = (actual: number, average: number) => {
    if (average === 0) return { percentage: 0, direction: 'neutral' as const }
    const diff = ((actual - average) / average) * 100
    return {
      percentage: Math.abs(diff),
      direction: diff > 10 ? 'above' as const : diff < -10 ? 'below' as const : 'average' as const,
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Summary</h1>
          <p className="text-muted-foreground">
            {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
            {isToday(selectedDate) && (
              <Badge variant="secondary" className="ml-2">Today</Badge>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate('previous')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Select Date
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(startOfDay(date))}
                disabled={(date) => isFuture(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            onClick={() => setSelectedDate(startOfDay(new Date()))}
            disabled={isToday(selectedDate)}
          >
            Today
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate('next')}
            disabled={isFuture(addDays(selectedDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Daily KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard
          title="Dials"
          value={dailyStats.totalDials}
          subtitle={`Goal: ${DAILY_GOALS.dials}`}
          color="blue"
          icon={Target}
        />
        <KPICard
          title="Pickups"
          value={dailyStats.totalPickups}
          subtitle={`${dailyStats.pickupRate.toFixed(1)}% rate`}
          color="green"
          icon={Users}
        />
        <KPICard
          title="Conversations"
          value={dailyStats.totalConvos}
          subtitle={`${dailyStats.convoRate.toFixed(1)}% rate`}
          color="yellow"
        />
        <KPICard
          title="Appointments"
          value={dailyStats.totalAppointments}
          color="purple"
          icon={Calendar}
        />
        <KPICard
          title="Deals"
          value={dailyStats.totalDeals}
          color="cyan"
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Daily Goals Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(goalProgress).map(([key, progress]) => {
              const goalKey = key as keyof typeof DAILY_GOALS
              const actualValue = {
                dials: dailyStats.totalDials,
                pickups: dailyStats.totalPickups,
                conversations: dailyStats.totalConvos,
                appointments: dailyStats.totalAppointments,
                deals: dailyStats.totalDeals,
              }[goalKey]

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="capitalize font-medium">{key}</span>
                    <span className="text-sm text-muted-foreground">
                      {actualValue} / {DAILY_GOALS[goalKey]}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">
                    {progress.toFixed(0)}% complete
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Team Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              vs Team Average (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'dials', label: 'Dials', actual: dailyStats.totalDials, average: teamAverage.dials },
              { key: 'pickups', label: 'Pickups', actual: dailyStats.totalPickups, average: teamAverage.pickups },
              { key: 'appointments', label: 'Appointments', actual: dailyStats.totalAppointments, average: teamAverage.appointments },
              { key: 'deals', label: 'Deals', actual: dailyStats.totalDeals, average: teamAverage.deals },
            ].map(({ key, label, actual, average }) => {
              const comparison = getPerformanceComparison(actual, average)
              
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-muted-foreground">
                      {actual} vs {average} avg
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        comparison.direction === 'above' ? 'default' : 
                        comparison.direction === 'below' ? 'destructive' : 
                        'secondary'
                      }
                    >
                      {comparison.direction === 'above' && '+'}
                      {comparison.direction === 'below' && '-'}
                      {comparison.percentage.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Individual Setter Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Setter Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {setterPerformance.map((setter, index) => (
              <div key={setter.contact_id}>
                {index > 0 && <Separator />}
                <div className="space-y-3 pt-4 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold">
                          {setter.first_name.charAt(0)}{setter.last_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{setter.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Performance Score: {setter.performance_score.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {setter.goalsAchieved}/5 goals
                      </Badge>
                      <Badge
                        variant={
                          setter.performance_score >= 4 ? 'default' :
                          setter.performance_score >= 3 ? 'secondary' :
                          'destructive'
                        }
                      >
                        {setter.performance_score >= 4 ? 'Excellent' :
                         setter.performance_score >= 3 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Dials:</span>
                      <span className="ml-2 font-mono font-semibold">
                        {setter.dials_today}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pickups:</span>
                      <span className="ml-2 font-mono font-semibold">
                        {setter.pickups_today}
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({setter.pickupRate.toFixed(1)}%)
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Convos:</span>
                      <span className="ml-2 font-mono font-semibold">
                        {setter.one_min_convos}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Appointments:</span>
                      <span className="ml-2 font-mono font-semibold">
                        {setter.qualified_appointments}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deals:</span>
                      <span className="ml-2 font-mono font-semibold">
                        {setter.deals_closed}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Observations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {dailyData && dailyData.length > 0 ? (
              <div className="space-y-2">
                <p>• Total of {dailyData.length} setters active today</p>
                <p>• Average performance score: {dailyStats.averagePerformanceScore.toFixed(1)}</p>
                <p>• Show rate: {dailyStats.showRate.toFixed(1)}%</p>
                {goalProgress.dials >= 100 && <p>• 🎉 Daily dial goal exceeded!</p>}
                {dailyStats.pickupRate > 30 && <p>• 📞 Excellent pickup rate achieved</p>}
                {dailyStats.totalDeals > 0 && <p>• 💰 {dailyStats.totalDeals} deals closed today</p>}
              </div>
            ) : (
              <p>No activity recorded for this date.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}