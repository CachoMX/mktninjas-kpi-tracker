'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, Crown, Medal, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LeaderboardEntry } from '@/types/database'

interface LeaderboardTableProps {
  data: LeaderboardEntry[]
  title?: string
  visibleMetrics?: string[]
}

type SortableKeys = keyof LeaderboardEntry | 'pickupRate' | 'convoRate'

const safeNumber = (value: number | string | null | undefined): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value ?? 0
  return numValue.toLocaleString()
}

export function LeaderboardTable({ data, title = 'Performance Leaderboard', visibleMetrics = [] }: LeaderboardTableProps) {
  const [sortKey, setSortKey] = useState<SortableKeys>('performance_score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (key: SortableKeys) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    let aValue: number
    let bValue: number

    switch (sortKey) {
      case 'pickupRate':
        aValue = Number(a.pickupRate) || 0
        bValue = Number(b.pickupRate) || 0
        break
      case 'convoRate':
        aValue = Number(a.convoRate) || 0
        bValue = Number(b.convoRate) || 0
        break
      default:
        aValue = (a[sortKey as keyof LeaderboardEntry] as number) || 0
        bValue = (b[sortKey as keyof LeaderboardEntry] as number) || 0
    }

    if (sortDirection === 'desc') {
      return bValue - aValue
    }
    return aValue - bValue
  })

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />
      case 3:
        return <Award className="h-4 w-4 text-orange-600" />
      default:
        return <span className="text-muted-foreground">{rank}</span>
    }
  }

  const getPerformanceTier = (score: number) => {
    if (score >= 4) return { label: 'Excellent', color: 'bg-green-500' }
    if (score >= 3) return { label: 'Good', color: 'bg-blue-500' }
    if (score >= 2) return { label: 'Fair', color: 'bg-yellow-500' }
    return { label: 'Needs Improvement', color: 'bg-red-500' }
  }

  const SortableHeader = ({ label, sortKey: key }: { label: string; sortKey: SortableKeys }) => (
    <Button
      variant="ghost"
      className="h-8 px-2 font-semibold text-left justify-start"
      onClick={() => handleSort(key)}
    >
      {label}
      <ArrowUpDown className="ml-2 h-3 w-3" />
    </Button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>
                  <SortableHeader label="Setter" sortKey="full_name" />
                </TableHead>
                {(visibleMetrics.includes('dials_today') || visibleMetrics.length === 0) && (
                  <TableHead className="text-right">
                    <SortableHeader label="Dials" sortKey="dials_today" />
                  </TableHead>
                )}
                {(visibleMetrics.includes('pickups_today') || visibleMetrics.length === 0) && (
                  <>
                    <TableHead className="text-right">
                      <SortableHeader label="Pickups" sortKey="pickups_today" />
                    </TableHead>
                    <TableHead className="text-right">
                      <SortableHeader label="Pick %" sortKey="pickupRate" />
                    </TableHead>
                  </>
                )}
                {(visibleMetrics.includes('one_min_convos') || visibleMetrics.length === 0) && (
                  <>
                    <TableHead className="text-right">
                      <SortableHeader label="Convos" sortKey="one_min_convos" />
                    </TableHead>
                    <TableHead className="text-right">
                      <SortableHeader label="Conv %" sortKey="convoRate" />
                    </TableHead>
                  </>
                )}
                {(visibleMetrics.includes('dqs_today') || visibleMetrics.length === 0) && (
                  <TableHead className="text-right">
                    <SortableHeader label="DQs" sortKey="dqs_today" />
                  </TableHead>
                )}
                {(visibleMetrics.includes('qualified_appointments') || visibleMetrics.length === 0) && (
                  <TableHead className="text-right">
                    <SortableHeader label="Appts" sortKey="qualified_appointments" />
                  </TableHead>
                )}
                {(visibleMetrics.includes('performance_score') || visibleMetrics.length === 0) && (
                  <TableHead className="text-right">
                    <SortableHeader label="Performance" sortKey="performance_score" />
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((entry, index) => {
                const tier = getPerformanceTier(entry.performance_score)
                const rank = index + 1
                
                return (
                  <TableRow
                    key={entry.contact_id}
                    className={cn(
                      'hover:bg-muted/50',
                      rank <= 3 && 'bg-muted/30'
                    )}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center justify-center">
                        {getRankIcon(rank)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <span>{entry.full_name}</span>
                        {rank <= 3 && (
                          <Badge variant="secondary" className="text-xs">
                            Top {rank}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {(visibleMetrics.includes('dials_today') || visibleMetrics.length === 0) && (
                      <TableCell className="text-right font-mono">
                        {safeNumber(entry.dials_today)}
                      </TableCell>
                    )}
                    {(visibleMetrics.includes('pickups_today') || visibleMetrics.length === 0) && (
                      <>
                        <TableCell className="text-right font-mono">
                          {safeNumber(entry.pickups_today)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono">
                            {Number(entry.pickupRate || 0).toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </>
                    )}
                    {(visibleMetrics.includes('one_min_convos') || visibleMetrics.length === 0) && (
                      <>
                        <TableCell className="text-right font-mono">
                          {safeNumber(entry.one_min_convos)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono">
                            {Number(entry.convoRate || 0).toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </>
                    )}
                    {(visibleMetrics.includes('dqs_today') || visibleMetrics.length === 0) && (
                      <TableCell className="text-right font-mono">
                        {safeNumber(entry.dqs_today)}
                      </TableCell>
                    )}
                    {(visibleMetrics.includes('qualified_appointments') || visibleMetrics.length === 0) && (
                      <TableCell className="text-right font-mono">
                        {safeNumber(entry.qualified_appointments)}
                      </TableCell>
                    )}
                    {(visibleMetrics.includes('performance_score') || visibleMetrics.length === 0) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span className="font-mono">
                            {Number(entry.performance_score || 0).toFixed(1)}
                          </span>
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              tier.color
                            )}
                            title={tier.label}
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}