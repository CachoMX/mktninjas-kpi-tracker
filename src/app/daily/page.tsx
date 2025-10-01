'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SetterKPISubmission, CloserEODSubmission, KPISubmission, SetterDashboardStats, CloserDashboardStats } from '@/types/database'
import { useRole } from '@/contexts/role-context'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'
import { format, startOfDay, endOfDay, subDays, addDays, isToday, isFuture } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Users, Target, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { KPICard } from '@/components/cards/kpi-card'
import { useSetterDashboardStats, useCloserDashboardStats } from '@/hooks/use-kpi-data'

// Mock goals - in a real app, these would come from settings
const SETTER_DAILY_GOALS = {
  dials: 100,
  pickups: 25,
  conversations: 15,
  appointments: 5,
  deals: 2,
}

const CLOSER_DAILY_GOALS = {
  appointments: 8,
  liveCalls: 6,
  offers: 3,
  deals: 2,
  cash: 5000,
}

// Helper function to safely format numbers
const safeToFixed = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0'
  }
  return value.toFixed(decimals)
}


export default function DailySummaryPage() {
  const { currentRole, getTableName } = useRole()
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date('2025-09-12')))

  const [dailyData, setDailyData] = useState<KPISubmission[]>([])
  const [averageData, setAverageData] = useState<KPISubmission[]>([])
  const [loading, setLoading] = useState(true)


  // Use useEffect to refetch data when selectedDate changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Use the same approach as the working test page - query all data then filter
        const tableName = getTableName(currentRole)
        const { data: allRecentData, error: dayError } = await supabase
          .from(tableName)
          .select('*')
          .order('submission_date', { ascending: false })
          .limit(50)
          
        let dayData: KPISubmission[] = []
        
        if (!dayError && allRecentData) {
          // Filter for the selected date (same logic as test page)
          const targetDate = format(selectedDate, 'yyyy-MM-dd')
          
          dayData = (allRecentData as KPISubmission[]).filter(item => {
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
            .from(tableName)
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
  }, [selectedDate, averageData.length, currentRole, getTableName]) // Re-run when selectedDate changes

  // Use role-aware dashboard stats - call both hooks unconditionally
  const setterDailyStats = useSetterDashboardStats(dailyData as SetterKPISubmission[])
  const closerDailyStats = useCloserDashboardStats(dailyData as CloserEODSubmission[])
  const dailyStats = currentRole === 'setter' ? setterDailyStats : closerDailyStats

  const teamAverage = useMemo(() => {
    if (!averageData?.length) {
      return currentRole === 'setter'
        ? { dials: 0, pickups: 0, appointments: 0, deals: 0 }
        : { appointments: 0, liveCalls: 0, offers: 0, deals: 0, cash: 0 }
    }

    const days = new Set(averageData.map(item => item.submission_date)).size

    if (currentRole === 'setter') {
      const setterStats = dailyStats as SetterDashboardStats
      return {
        dials: Math.round(setterStats.totalDials / Math.max(days, 1)),
        pickups: Math.round(setterStats.totalPickups / Math.max(days, 1)),
        appointments: Math.round(setterStats.totalAppointments / Math.max(days, 1)),
        deals: 0,
      }
    } else {
      const closerStats = dailyStats as CloserDashboardStats
      return {
        appointments: Math.round(closerStats.totalAppointmentsOnCalendar / Math.max(days, 1)),
        liveCalls: Math.round(closerStats.totalLiveCalls / Math.max(days, 1)),
        offers: Math.round(closerStats.totalOffersMade / Math.max(days, 1)),
        deals: Math.round(closerStats.totalDealsClosed / Math.max(days, 1)),
        cash: Math.round(closerStats.totalCashCollected / Math.max(days, 1)),
      }
    }
  }, [averageData, dailyStats, currentRole])

  const peoplePerformance = useMemo(() => {
    if (!dailyData) return []

    // Group records by person (contact_id) and combine them
    const groupedByPerson = dailyData.reduce((acc, person) => {
      const key = person.contact_id || person.full_name || 'unknown'

      if (!acc[key]) {
        acc[key] = {
          ...person,
          // Initialize all possible fields for both roles
          dials_today: 0,
          pickups_today: 0,
          one_min_convos: 0,
          qualified_appointments: 0,
          dqs_today: 0,
          follow_ups_today: 0,
          discovery_calls_scheduled: 0,
          prospects_showed_up: 0,
          prospects_rescheduled: 0,
          prospects_full_territory: 0,
          appointments_on_calendar: 0,
          live_calls_today: 0,
          no_shows_today: 0,
          follow_up_calls_scheduled: 0,
          calls_rescheduled: 0,
          offers_made: 0,
          deals_closed: 0,
          deposits_collected: 0,
          cash_collected: 0,
          performance_score: 0,
          recordCount: 0
        }
      }

      // Sum all numeric fields based on role
      if (currentRole === 'setter') {
        const item = person as SetterKPISubmission
        acc[key].dials_today += item.dials_today || 0
        acc[key].pickups_today += item.pickups_today || 0
        acc[key].one_min_convos += item.one_min_convos || 0
        acc[key].qualified_appointments += item.qualified_appointments || 0
        acc[key].dqs_today += item.dqs_today || 0
        acc[key].follow_ups_today += item.follow_ups_today || 0
        acc[key].discovery_calls_scheduled += item.discovery_calls_scheduled || 0
        acc[key].prospects_showed_up += item.prospects_showed_up || 0
        acc[key].prospects_rescheduled += item.prospects_rescheduled || 0
        acc[key].prospects_full_territory += item.prospects_full_territory || 0
        acc[key].performance_score += item.performance_score || 0
      } else {
        const item = person as CloserEODSubmission
        acc[key].appointments_on_calendar += item.appointments_on_calendar || 0
        acc[key].live_calls_today += item.live_calls_today || 0
        acc[key].no_shows_today += item.no_shows_today || 0
        acc[key].follow_up_calls_scheduled += item.follow_up_calls_scheduled || 0
        acc[key].calls_rescheduled += item.calls_rescheduled || 0
        acc[key].offers_made += item.offers_made || 0
        acc[key].deals_closed += item.deals_closed || 0
        acc[key].deposits_collected += item.deposits_collected || 0
        acc[key].cash_collected += item.cash_collected || 0
        acc[key].performance_score += item.performance_score || 0
      }
      acc[key].recordCount += 1

      return acc
    }, {} as Record<string, any>)

    // Convert back to array and calculate rates
    return Object.values(groupedByPerson).map(person => {
      // Average the performance score
      const avgPerformanceScore = person.recordCount > 0 ? person.performance_score / person.recordCount : 0

      let goalsAchieved = 0
      let rates: { pickupRate?: number; convoRate?: number; noShowRate?: number; closingRate?: number; averageCashPerDeal?: number } = {}

      if (currentRole === 'setter') {
        const dials = person.dials_today || 0
        const pickups = person.pickups_today || 0
        const convos = person.one_min_convos || 0
        const appointments = person.qualified_appointments || 0
        const deals = 0

        rates = {
          pickupRate: dials > 0 ? (pickups / dials) * 100 : 0,
          convoRate: pickups > 0 ? (convos / pickups) * 100 : 0,
        }

        goalsAchieved = [
          dials >= SETTER_DAILY_GOALS.dials ? 'dials' : null,
          pickups >= SETTER_DAILY_GOALS.pickups ? 'pickups' : null,
          convos >= SETTER_DAILY_GOALS.conversations ? 'conversations' : null,
          appointments >= SETTER_DAILY_GOALS.appointments ? 'appointments' : null,
          deals >= SETTER_DAILY_GOALS.deals ? 'deals' : null,
        ].filter(Boolean).length
      } else {
        const appointments = person.appointments_on_calendar || 0
        const liveCalls = person.live_calls_today || 0
        const offers = person.offers_made || 0
        const deals = person.deals_closed || 0
        const cash = person.cash_collected || 0

        rates = {
          noShowRate: appointments > 0 ? (person.no_shows_today / appointments) * 100 : 0,
          closingRate: offers > 0 ? (deals / offers) * 100 : 0,
          averageCashPerDeal: deals > 0 ? cash / deals : 0,
        }

        goalsAchieved = [
          appointments >= CLOSER_DAILY_GOALS.appointments ? 'appointments' : null,
          liveCalls >= CLOSER_DAILY_GOALS.liveCalls ? 'liveCalls' : null,
          offers >= CLOSER_DAILY_GOALS.offers ? 'offers' : null,
          deals >= CLOSER_DAILY_GOALS.deals ? 'deals' : null,
          cash >= CLOSER_DAILY_GOALS.cash ? 'cash' : null,
        ].filter(Boolean).length
      }

      return {
        ...person,
        performance_score: avgPerformanceScore,
        ...rates,
        goalsAchieved,
      }
    }).sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))
  }, [dailyData, currentRole])

  const goalProgress = useMemo(() => {
    if (currentRole === 'setter') {
      const setterStats = dailyStats as SetterDashboardStats
      return {
        dials: Math.min((setterStats.totalDials / SETTER_DAILY_GOALS.dials) * 100, 100),
        pickups: Math.min((setterStats.totalPickups / SETTER_DAILY_GOALS.pickups) * 100, 100),
        conversations: Math.min((setterStats.totalConvos / SETTER_DAILY_GOALS.conversations) * 100, 100),
        appointments: Math.min((setterStats.totalAppointments / SETTER_DAILY_GOALS.appointments) * 100, 100),
        deals: 0,
      }
    } else {
      const closerStats = dailyStats as CloserDashboardStats
      return {
        appointments: Math.min((closerStats.totalAppointmentsOnCalendar / CLOSER_DAILY_GOALS.appointments) * 100, 100),
        liveCalls: Math.min((closerStats.totalLiveCalls / CLOSER_DAILY_GOALS.liveCalls) * 100, 100),
        offers: Math.min((closerStats.totalOffersMade / CLOSER_DAILY_GOALS.offers) * 100, 100),
        deals: Math.min((closerStats.totalDealsClosed / CLOSER_DAILY_GOALS.deals) * 100, 100),
        cash: Math.min((closerStats.totalCashCollected / CLOSER_DAILY_GOALS.cash) * 100, 100),
      }
    }
  }, [dailyStats, currentRole])

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
          <h1 className="text-3xl font-bold">{currentRole === 'setter' ? 'Setter' : 'Closer'} Daily Summary</h1>
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
        {currentRole === 'setter' ? (
          (() => {
            const setterStats = dailyStats as SetterDashboardStats
            return (
              <>
                {/* Setter KPI Cards */}
                <KPICard
                  title="Total Dials"
                  value={setterStats.totalDials}
                  subtitle={`Goal: ${SETTER_DAILY_GOALS.dials}`}
                  color="blue"
                  icon={Target}
                />
                <KPICard
                  title="Total Pickups"
                  value={setterStats.totalPickups}
                  subtitle={`${safeToFixed(setterStats.pickupRate, 1)}% pickup rate`}
                  color="green"
                  icon={Users}
                />
                <KPICard
                  title="1min+ Conversations"
                  value={setterStats.totalConvos}
                  subtitle={`${safeToFixed(setterStats.convoRate, 1)}% conversion rate`}
                  color="purple"
                />
                <KPICard
                  title="Total DQs"
                  value={setterStats.totalDQs}
                  color="red"
                />
                <KPICard
                  title="Qualified Appointments"
                  value={setterStats.totalAppointments}
                  color="cyan"
                  icon={Calendar}
                />
                <KPICard
                  title="Avg Performance Score"
                  value={safeToFixed(setterStats.averagePerformanceScore, 1)}
                  color="yellow"
                />
                <KPICard
                  title="Follow Ups"
                  value={setterStats.totalFollowUps}
                  color="blue"
                />
                <KPICard
                  title="Discovery Calls"
                  value={setterStats.totalDiscoveryCalls}
                  color="red"
                />
                <KPICard
                  title="Showed Up"
                  value={setterStats.totalShowedUp}
                  subtitle={`${safeToFixed(setterStats.showRate, 1)}% show rate`}
                  color="purple"
                />
                <KPICard
                  title="Rescheduled"
                  value={setterStats.totalRescheduled}
                  color="cyan"
                />
                <KPICard
                  title="Full Territory"
                  value={setterStats.totalFullTerritory}
                  color="blue"
                />
              </>
            )
          })()
        ) : (
          (() => {
            const closerStats = dailyStats as CloserDashboardStats
            return (
              <>
                {/* Closer KPI Cards */}
                <KPICard
                  title="Appointments on Calendar"
                  value={closerStats.totalAppointmentsOnCalendar}
                  subtitle={`Goal: ${CLOSER_DAILY_GOALS.appointments}`}
                  color="blue"
                  icon={Calendar}
                />
                <KPICard
                  title="Live Calls"
                  value={closerStats.totalLiveCalls}
                  subtitle={`Goal: ${CLOSER_DAILY_GOALS.liveCalls}`}
                  color="green"
                  icon={Users}
                />
                <KPICard
                  title="No Shows"
                  value={closerStats.totalNoShows}
                  subtitle={`${safeToFixed(closerStats.noShowRate, 1)}% no show rate`}
                  color="red"
                />
                <KPICard
                  title="Follow-up Calls"
                  value={closerStats.totalFollowUpCallsScheduled}
                  color="purple"
                />
                <KPICard
                  title="Calls Rescheduled"
                  value={closerStats.totalCallsRescheduled}
                  color="cyan"
                />
                <KPICard
                  title="Offers Made"
                  value={closerStats.totalOffersMade}
                  subtitle={`Goal: ${CLOSER_DAILY_GOALS.offers}`}
                  color="blue"
                  icon={Target}
                />
                <KPICard
                  title="Deals Closed"
                  value={closerStats.totalDealsClosed}
                  subtitle={`${safeToFixed(closerStats.totalDealsClosingRate, 1)}% closing rate`}
                  color="green"
                />
                <KPICard
                  title="Deposits Collected"
                  value={closerStats.totalDepositsCollected}
                  color="yellow"
                />
                <KPICard
                  title="Cash Collected"
                  value={closerStats.totalCashCollected}
                  subtitle={`$${safeToFixed(closerStats.averageCashPerDeal, 0)} avg per deal`}
                  format="currency"
                  color="green"
                />
                <KPICard
                  title="Avg Performance Score"
                  value={safeToFixed(closerStats.averagePerformanceScore, 1)}
                  color="yellow"
                />
                <KPICard
                  title="Avg Focus Score"
                  value={safeToFixed(closerStats.averageFocusScore, 1)}
                  color="blue"
                />
              </>
            )
          })()
        )}
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
              let actualValue = 0
              let goalValue = 0

              if (currentRole === 'setter') {
                const setterStats = dailyStats as SetterDashboardStats
                const goals = SETTER_DAILY_GOALS
                const valueMap: Record<string, number> = {
                  dials: setterStats.totalDials || 0,
                  pickups: setterStats.totalPickups || 0,
                  conversations: setterStats.totalConvos || 0,
                  appointments: setterStats.totalAppointments || 0,
                  deals: 0,
                }
                const goalMap: Record<string, number> = {
                  dials: goals.dials,
                  pickups: goals.pickups,
                  conversations: goals.conversations,
                  appointments: goals.appointments,
                  deals: goals.deals,
                }
                actualValue = valueMap[key] || 0
                goalValue = goalMap[key] || 1
              } else {
                const closerStats = dailyStats as CloserDashboardStats
                const goals = CLOSER_DAILY_GOALS
                const valueMap: Record<string, number> = {
                  appointments: closerStats.totalAppointmentsOnCalendar || 0,
                  liveCalls: closerStats.totalLiveCalls || 0,
                  offers: closerStats.totalOffersMade || 0,
                  deals: closerStats.totalDealsClosed || 0,
                  cash: closerStats.totalCashCollected || 0,
                }
                const goalMap: Record<string, number> = {
                  appointments: goals.appointments,
                  liveCalls: goals.liveCalls,
                  offers: goals.offers,
                  deals: goals.deals,
                  cash: goals.cash,
                }
                actualValue = valueMap[key] || 0
                goalValue = goalMap[key] || 1
              }

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="capitalize font-medium">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    <span className="text-sm text-muted-foreground">
                      {key === 'cash' ? `$${actualValue.toLocaleString()}` : actualValue} / {key === 'cash' ? `$${goalValue.toLocaleString()}` : goalValue}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">
                    {safeToFixed(progress, 0)}% complete
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
            {(() => {
              if (currentRole === 'setter') {
                const setterStats = dailyStats as SetterDashboardStats
                return [
                  { key: 'dials', label: 'Dials', actual: setterStats.totalDials, average: teamAverage.dials },
                  { key: 'pickups', label: 'Pickups', actual: setterStats.totalPickups, average: teamAverage.pickups },
                  { key: 'appointments', label: 'Appointments', actual: setterStats.totalAppointments, average: teamAverage.appointments },
                ]
              } else {
                const closerStats = dailyStats as CloserDashboardStats
                return [
                  { key: 'appointments', label: 'Appointments', actual: closerStats.totalAppointmentsOnCalendar, average: teamAverage.appointments },
                  { key: 'liveCalls', label: 'Live Calls', actual: closerStats.totalLiveCalls, average: teamAverage.liveCalls },
                  { key: 'offers', label: 'Offers', actual: closerStats.totalOffersMade, average: teamAverage.offers },
                ]
              }
            })().map(({ key, label, actual, average }) => {
              const comparison = getPerformanceComparison(actual || 0, average || 0)
              
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-muted-foreground">
                      {actual || 0} vs {average || 0} avg
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
                      {safeToFixed(comparison.percentage, 0)}%
                    </Badge>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Individual Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Individual {currentRole === 'setter' ? 'Setter' : 'Closer'} Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {peoplePerformance.map((person, index) => (
              <div key={person.contact_id}>
                {index > 0 && <Separator />}
                <div className="space-y-3 pt-4 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold">
                          {person.full_name.split(' ').map((name: string) => name.charAt(0)).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{person.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Performance Score: {safeToFixed(person.performance_score, 1)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {person.goalsAchieved}/{currentRole === 'setter' ? '5' : '5'} goals
                      </Badge>
                      <Badge
                        variant={
                          person.performance_score >= 4 ? 'default' :
                          person.performance_score >= 3 ? 'secondary' :
                          'destructive'
                        }
                      >
                        {person.performance_score >= 4 ? 'Excellent' :
                         person.performance_score >= 3 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    {currentRole === 'setter' ? (
                      <>
                        <div>
                          <span className="text-muted-foreground">Dials:</span>
                          <span className="ml-2 font-mono font-semibold">
                            {person.dials_today || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pickups:</span>
                          <span className="ml-2 font-mono font-semibold">
                            {person.pickups_today || 0}
                          </span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({safeToFixed(person.pickupRate, 1)}%)
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Convos:</span>
                          <span className="ml-2 font-mono font-semibold">
                            {person.one_min_convos || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Appointments:</span>
                          <span className="ml-2 font-mono font-semibold">
                            {person.qualified_appointments || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Deals:</span>
                          <span className="ml-2 font-mono font-semibold">
                            0
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-muted-foreground">Cal Appts:</span>
                          <span className="ml-2 font-mono font-semibold">
                            {person.appointments_on_calendar || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Live Calls:</span>
                          <span className="ml-2 font-mono font-semibold">
                            {person.live_calls_today || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Offers:</span>
                          <span className="ml-2 font-mono font-semibold">
                            {person.offers_made || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Deals:</span>
                          <span className="ml-2 font-mono font-semibold">
                            {person.deals_closed || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cash:</span>
                          <span className="ml-2 font-mono font-semibold">
                            ${(person.cash_collected || 0).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
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
                <p>• Total of {dailyData.length} {currentRole === 'setter' ? 'setters' : 'closers'} active today</p>
                <p>• Average performance score: {safeToFixed((dailyStats as any).averagePerformanceScore, 1)}</p>
                {currentRole === 'setter' && (
                  <>
                    <p>• Show rate: {safeToFixed((dailyStats as SetterDashboardStats).showRate, 1)}%</p>
                    {goalProgress.dials && goalProgress.dials >= 100 && <p>• 🎉 Daily dial goal exceeded!</p>}
                    {(dailyStats as SetterDashboardStats).pickupRate > 30 && <p>• 📞 Excellent pickup rate achieved</p>}
                  </>
                )}
                {currentRole === 'closer' && (
                  <>
                    <p>• No show rate: {safeToFixed((dailyStats as CloserDashboardStats).noShowRate, 1)}%</p>
                    {goalProgress.cash && goalProgress.cash >= 100 && <p>• 💰 Daily cash goal exceeded!</p>}
                    {(dailyStats as CloserDashboardStats).totalDealsClosingRate > 50 && <p>• 🎯 Excellent closing rate achieved</p>}
                  </>
                )}
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