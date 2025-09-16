'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SetterKPISubmission } from '@/types/database'

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
import { useDashboardStats } from '@/hooks/use-kpi-data'

// Mock goals - in a real app, these would come from settings
const DAILY_GOALS = {
  dials: 100,
  pickups: 25,
  conversations: 15,
  appointments: 5,
  deals: 2,
}

// Helper function to safely format numbers
const safeToFixed = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0'
  }
  return value.toFixed(decimals)
}

export default function DailySummaryPage() {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date('2025-09-12')))
  
  const [dailyData, setDailyData] = useState<SetterKPISubmission[]>([])
  const [averageData, setAverageData] = useState<SetterKPISubmission[]>([])
  const [loading, setLoading] = useState(true)

  const dayStart = startOfDay(selectedDate)
  const dayEnd = endOfDay(selectedDate)

  // Use useEffect to refetch data when selectedDate changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Use the same approach as the working test page - query all data then filter
        const { data: allRecentData, error: dayError } = await supabase
          .from('setter_kpi_submissions')
          .select('*')
          .order('submission_date', { ascending: false })
          .limit(50)
          
        let dayData: SetterKPISubmission[] = []
        
        if (!dayError && allRecentData) {
          // Filter for the selected date (same logic as test page)
          const targetDate = format(selectedDate, 'yyyy-MM-dd')
          
          dayData = allRecentData.filter(item => {
            const itemDate = item.submission_date.includes('T') 
              ? item.submission_date.split('T')[0] 
              : item.submission_date
            return itemDate === targetDate
          })
        }

        if (dayError) {
          console.error('❌ Daily data error:', dayError)
        } else {
          setDailyData(dayData || [])
        }

        // Fetch team average data (last 30 days) - only on first load
        if (averageData.length === 0) {
          const thirtyDaysAgo = startOfDay(subDays(new Date(), 30))
          const today = endOfDay(new Date())
          const avgFromDate = format(thirtyDaysAgo, 'yyyy-MM-dd')
          const avgToDate = format(today, 'yyyy-MM-dd')
          
          const { data: avgData, error: avgError } = await supabase
            .from('setter_kpi_submissions')
            .select('*')
            .gte('submission_date', avgFromDate)
            .lte('submission_date', avgToDate)
            .order('submission_date', { ascending: false })

          if (avgError) {
            console.error('❌ Average data error:', avgError)
          } else {
            setAverageData(avgData || [])
          }
        }

      } catch (err) {
        console.error('❌ Daily page fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedDate]) // Re-run when selectedDate changes

  const dailyStats = useDashboardStats(dailyData || [])

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

    // Group records by setter (contact_id) and combine them
    const groupedBySetter = dailyData.reduce((acc, setter) => {
      const key = setter.contact_id
      
      if (!acc[key]) {
        acc[key] = {
          ...setter,
          dials_today: 0,
          pickups_today: 0,
          one_min_convos: 0,
          qualified_appointments: 0,
          deals_closed: 0,
          dqs_today: 0,
          follow_ups_today: 0,
          discovery_calls_scheduled: 0,
          prospects_showed_up: 0,
          prospects_rescheduled: 0,
          prospects_full_rterritory: 0,
          performance_score: 0,
          recordCount: 0
        }
      }
      
      // Sum all numeric fields
      acc[key].dials_today += setter.dials_today || 0
      acc[key].pickups_today += setter.pickups_today || 0
      acc[key].one_min_convos += setter.one_min_convos || 0
      acc[key].qualified_appointments += setter.qualified_appointments || 0
      acc[key].deals_closed += setter.deals_closed || 0
      acc[key].dqs_today += setter.dqs_today || 0
      acc[key].follow_ups_today += setter.follow_ups_today || 0
      acc[key].discovery_calls_scheduled += setter.discovery_calls_scheduled || 0
      acc[key].prospects_showed_up += setter.prospects_showed_up || 0
      acc[key].prospects_rescheduled += setter.prospects_rescheduled || 0
      acc[key].prospects_full_rterritory += setter.prospects_full_rterritory || 0
      acc[key].performance_score += setter.performance_score || 0
      acc[key].recordCount += 1
      
      return acc
    }, {} as Record<string, any>)

    // Convert back to array and calculate rates
    return Object.values(groupedBySetter).map(setter => {
      const dials = setter.dials_today || 0
      const pickups = setter.pickups_today || 0
      const convos = setter.one_min_convos || 0
      const appointments = setter.qualified_appointments || 0
      const deals = setter.deals_closed || 0
      // Average the performance score
      const avgPerformanceScore = setter.recordCount > 0 ? setter.performance_score / setter.recordCount : 0
      
      return {
        ...setter,
        performance_score: avgPerformanceScore,
        pickupRate: dials > 0 ? (pickups / dials) * 100 : 0,
        convoRate: pickups > 0 ? (convos / pickups) * 100 : 0,
        goalsAchieved: [
          dials >= DAILY_GOALS.dials ? 'dials' : null,
          pickups >= DAILY_GOALS.pickups ? 'pickups' : null,
          convos >= DAILY_GOALS.conversations ? 'conversations' : null,
          appointments >= DAILY_GOALS.appointments ? 'appointments' : null,
          deals >= DAILY_GOALS.deals ? 'deals' : null,
        ].filter(Boolean).length,
      }
    }).sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading daily data...</p>
        </div>
      </div>
    )
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Dials"
          value={dailyStats.totalDials}
          subtitle={`Goal: ${DAILY_GOALS.dials}`}
          color="blue"
          icon={Target}
        />
        <KPICard
          title="Total Pickups"
          value={dailyStats.totalPickups}
          subtitle={`${dailyStats.pickupRate.toFixed(1)}% pickup rate`}
          color="green"
          icon={Users}
        />
        <KPICard
          title="1min+ Conversations"
          value={dailyStats.totalConvos}
          subtitle={`${dailyStats.convoRate.toFixed(1)}% conversion rate`}
          color="purple"
        />
        <KPICard
          title="Total DQs"
          value={dailyStats.totalDQs}
          color="red"
        />
        <KPICard
          title="Qualified Appointments"
          value={dailyStats.totalAppointments}
          color="cyan"
          icon={Calendar}
        />
        <KPICard
          title="Deals Closed"
          value={dailyStats.totalDeals}
          color="green"
          icon={TrendingUp}
        />
        <KPICard
          title="Avg Performance Score"
          value={dailyStats.averagePerformanceScore.toFixed(1)}
          color="yellow"
        />
        <KPICard
          title="Follow Ups"
          value={dailyStats.totalFollowUps}
          color="blue"
        />
        <KPICard
          title="Discovery Calls"
          value={dailyStats.totalDiscoveryCalls}
          color="red"
        />
        <KPICard
          title="Showed Up"
          value={dailyStats.totalShowedUp}
          subtitle={`${dailyStats.showRate.toFixed(1)}% show rate`}
          color="purple"
        />
        <KPICard
          title="Rescheduled"
          value={dailyStats.totalRescheduled}
          color="cyan"
        />
        <KPICard
          title="Full Territory"
          value={dailyStats.totalFullTerritory}
          color="blue"
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
                          Performance Score: {safeToFixed(setter.performance_score, 1)}
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
                        ({safeToFixed(setter.pickupRate, 1)}%)
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