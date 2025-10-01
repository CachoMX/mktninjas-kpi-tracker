'use client'

import { useState, useMemo } from 'react'
import { format, subMonths } from 'date-fns'
import {
  DollarSign,
  Users,
  Calculator,
  Award,
  Target,
  BarChart3
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { KPICard } from '@/components/cards/kpi-card'
import { CustomBarChart } from '@/components/charts/bar-chart'
import { useMonthlyCommissionSummary, COMMISSION_TIERS } from '@/hooks/use-commission-data'
import { CommissionCalculator } from '@/lib/commission-calculator'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function CommissionDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [isRecalculating, setIsRecalculating] = useState(false)

  const { data: monthlyData, isLoading, refetch } = useMonthlyCommissionSummary(selectedMonth)

  // Generate month options for the last 12 months
  const monthOptions = useMemo(() => {
    const months = []
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i)
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy')
      })
    }
    return months
  }, [])

  // Calculate tier progress
  const tierProgress = useMemo(() => {
    if (!monthlyData) return null

    const currentDeals = monthlyData.six_month_deals
    const currentTier = COMMISSION_TIERS.find(tier =>
      currentDeals >= tier.min_deals &&
      (tier.max_deals === null || currentDeals <= tier.max_deals)
    ) || COMMISSION_TIERS[0]

    const nextTier = COMMISSION_TIERS.find(tier => tier.min_deals > currentDeals)

    return {
      current: currentTier,
      next: nextTier,
      progress: nextTier
        ? Math.min(((currentDeals - currentTier.min_deals) / (nextTier.min_deals - currentTier.min_deals)) * 100, 100)
        : 100,
      dealsToNext: nextTier ? nextTier.min_deals - currentDeals : 0
    }
  }, [monthlyData])

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!monthlyData?.by_person) return []

    return monthlyData.by_person.map((person) => ({
      name: person.name,
      commission: person.commission,
      deals: person.deals,
      role: person.role
    })).slice(0, 10) // Top 10 performers
  }, [monthlyData])

  const handleRecalculateMonth = async () => {
    setIsRecalculating(true)
    try {
      await CommissionCalculator.recalculateMonthCommissions(selectedMonth)
      await refetch()
    } catch (error) {
      console.error('Error recalculating commissions:', error)
    } finally {
      setIsRecalculating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'closer': return 'bg-blue-100 text-blue-800'
      case 'setter': return 'bg-green-100 text-green-800'
      case 'csm': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading commission dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            Commission Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monthly commission breakdown and team performance insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleRecalculateMonth}
            disabled={isRecalculating}
          >
            {isRecalculating ? (
              <>
                <Calculator className="w-4 h-4 mr-2 animate-spin" />
                Recalculating...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Recalculate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Month Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(monthlyData?.completed_amount || 0)}
          subtitle={`${monthlyData?.completed_payments || 0} completed payments`}
          color="green"
          icon={DollarSign}
        />
        <KPICard
          title="Total Commissions"
          value={formatCurrency(
            (monthlyData?.total_closer_commission || 0) +
            (monthlyData?.total_setter_commission || 0) +
            (monthlyData?.total_csm_commission || 0)
          )}
          subtitle={`${monthlyData?.completed_amount ?
            (((monthlyData.total_closer_commission + monthlyData.total_setter_commission + monthlyData.total_csm_commission) / monthlyData.completed_amount) * 100).toFixed(1) : 0}% of revenue`}
          color="purple"
          icon={Calculator}
        />
        <KPICard
          title="Six-Month Deals"
          value={monthlyData?.six_month_deals?.toFixed(1) || '0'}
          subtitle={`Current tier: ${tierProgress?.current.closer_rate}%/${tierProgress?.current.setter_rate}%`}
          color="blue"
          icon={Target}
        />
        <KPICard
          title="Team Members Paid"
          value={monthlyData?.by_person?.length || 0}
          subtitle="Active commission earners"
          color="cyan"
          icon={Users}
        />
      </div>

      {/* Tier Progress */}
      {tierProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Commission Tier Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Current Tier: {tierProgress.current.closer_rate}% Closer / {tierProgress.current.setter_rate}% Setter
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {tierProgress.current.min_deals} - {tierProgress.current.max_deals || '∞'} six-month deals
                  </p>
                </div>
                <Badge variant="default" className="text-lg px-4 py-2">
                  {monthlyData?.six_month_deals?.toFixed(1)} deals
                </Badge>
              </div>

              {tierProgress.next && (
                <>
                  <Progress value={tierProgress.progress} className="h-3" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Progress to next tier ({tierProgress.next.closer_rate}%/{tierProgress.next.setter_rate}%)
                    </span>
                    <span className="font-medium">
                      {tierProgress.dealsToNext.toFixed(1)} deals remaining
                    </span>
                  </div>
                </>
              )}

              {/* Tier breakdown */}
              <div className="mt-6">
                <h4 className="font-medium mb-3">All Commission Tiers</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {COMMISSION_TIERS.map((tier, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        tier === tierProgress.current
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {tier.min_deals} - {tier.max_deals || '∞'} deals
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tier.closer_rate}% / {tier.setter_rate}%
                          </div>
                        </div>
                        {tier === tierProgress.current && (
                          <Badge variant="default">Current</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commission by Role */}
        <Card>
          <CardHeader>
            <CardTitle>Commission by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Closers</span>
                </div>
                <span className="font-mono font-semibold">
                  {formatCurrency(monthlyData?.total_closer_commission || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Setters</span>
                </div>
                <span className="font-mono font-semibold">
                  {formatCurrency(monthlyData?.total_setter_commission || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="font-medium">CSMs</span>
                </div>
                <span className="font-mono font-semibold">
                  {formatCurrency(monthlyData?.total_csm_commission || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <CustomBarChart
                data={chartData}
                title="Commission Earned"
                bars={[
                  {
                    dataKey: "commission",
                    fill: "#8b5cf6",
                    name: "Commission"
                  }
                ]}
                height={300}
                xAxisKey="name"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No commission data available for this month
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Deals</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Avg per Deal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData?.by_person?.map((person, index) => (
                  <TableRow key={`${person.role}_${person.name}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {index === 0 && <Award className="w-4 h-4 text-yellow-500" />}
                        {index === 1 && <Award className="w-4 h-4 text-gray-400" />}
                        {index === 2 && <Award className="w-4 h-4 text-amber-600" />}
                        <span className="font-medium">#{index + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(person.role)}>
                        {person.role.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{person.deals}</TableCell>
                    <TableCell className="font-mono font-semibold">
                      {formatCurrency(person.commission)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {person.deals > 0 ? formatCurrency(person.commission / person.deals) : '$0'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {!monthlyData?.by_person?.length && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No commission data available for this month.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}