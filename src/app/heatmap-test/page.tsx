'use client'

import { useState, useEffect, useMemo } from 'react'
import { HeatmapCalendar } from '@/components/charts/heatmap-calendar'
import { supabase } from '@/lib/supabase'

interface TestRecord {
  submission_date: string
  full_name: string
  dials_today: number
  pickups_today: number
  one_min_convos: number
  dqs_today: number
  qualified_appointments: number
  0 /*deals_closed removed*/: number
  performance_score: number
}

export default function HeatmapTestPage() {
  const [realData, setRealData] = useState<TestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        console.log('🔍 Fetching REAL data from Supabase for heatmap test...')
        
        // Fetch all data without filters (same as debug page)
        const { data: allData, error: allError } = await supabase
          .from('setter_kpi_submissions')
          .select('*')
          .order('submission_date', { ascending: false })
        
        if (allError) {
          console.error('❌ Error fetching real data:', allError)
          setError(allError.message)
          return
        }

        console.log('✅ REAL data fetched:', allData?.length || 0, 'records')
        console.log('📋 Sample real records:', allData?.slice(0, 3))
        setRealData(allData || [])

      } catch (err) {
        console.error('❌ Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchRealData()
  }, [])
  
  console.log('🔥 Real data loaded:', realData.length, 'records')

  const activityData = useMemo(() => {
    console.log('🎯 Processing REAL activity data, realData length:', realData.length)
    
    if (!realData || realData.length === 0) {
      console.log('❌ No real data available')
      return []
    }

    // Calculate activity scores for each day using REAL data
    const dailyActivity = realData.reduce((acc: Record<string, { date: string; value: number }>, curr: TestRecord) => {
      // Convert timestamp to simple date format (YYYY-MM-DD)
      const rawDate = curr.submission_date
      const date = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate
      
      if (!acc[date]) {
        acc[date] = { date, value: 0 }
      }
      
      // Calculate weighted activity score with REAL data
      let activityScore = 0
      activityScore += (curr.dials_today || 0) * 1
      activityScore += (curr.pickups_today || 0) * 3
      activityScore += (curr.one_min_convos || 0) * 5
      activityScore += (curr.dqs_today || 0) * 8
      activityScore += (curr.qualified_appointments || 0) * 10
      // Deals are not tracked for setters, so this is removed
      activityScore += (curr.performance_score || 0) * 1
      
      acc[date].value += activityScore
      return acc
    }, {})
    
    const result = Object.values(dailyActivity)
    console.log('✅ Final REAL activity data:', result.length, 'days')
    console.log('📊 Sample activity scores:', result.slice(0, 5))
    return result
  }, [realData])

  console.log('🚀 HeatmapTestPage rendering, activityData:', activityData)

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Activity Heatmap Test</h1>
        <div className="mt-8 text-center">Loading real data from Supabase...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Activity Heatmap Test</h1>
        <div className="mt-8 text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Activity Heatmap Test - REAL DATA</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Debug Info</h2>
        <p><strong>Real Data Records:</strong> {realData.length}</p>
        <p><strong>Activity Data Days:</strong> {activityData.length}</p>
        <p><strong>Date Range in Data:</strong> {realData.length > 0 ? `${realData[realData.length - 1]?.submission_date} to ${realData[0]?.submission_date}` : 'No data'}</p>
        
        {activityData.length > 0 && (
          <div className="mt-4">
            <p><strong>Top Activity Days:</strong></p>
            <div className="max-h-48 overflow-y-auto">
              {activityData
                .sort((a, b) => b.value - a.value)
                .slice(0, 10)
                .map((day) => (
                  <div key={day.date} className="ml-4 text-sm">
                    {day.date}: <span className="font-bold">{day.value}</span> activity points
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border p-4 rounded">
        <HeatmapCalendar
          title="Activity Heatmap - REAL DATA"
          description="Real Supabase data with weighted activity scores"
          data={activityData}
          month={new Date()}
          colorScheme="blue"
        />
      </div>
      
      <div className="bg-blue-50 p-4 rounded">
        <h3 className="font-semibold">Activity Score Formula:</h3>
        <ul className="list-disc pl-5 mt-2 text-sm">
          <li>Dials × 1</li>
          <li>Pickups × 3</li>
          <li>1min+ Convos × 5</li>
          <li>DQs × 8</li>
          <li>Appointments × 10</li>
          <li>Deals × 50</li>
          <li>Performance Score × 1</li>
        </ul>
      </div>
    </div>
  )
}