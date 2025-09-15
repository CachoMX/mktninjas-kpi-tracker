'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activityData, setActivityData] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔍 Fetching all data from Supabase...')
        
        // Fetch all data without filters
        const { data: allData, error: allError } = await supabase
          .from('setter_kpi_submissions')
          .select('*')
          .order('submission_date', { ascending: false })
        
        if (allError) {
          console.error('❌ Error:', allError)
          setError(allError.message)
          return
        }

        console.log('✅ Raw data fetched:', allData?.length || 0, 'records')
        setData(allData || [])

        // Calculate activity scores for each record
        const calculatedActivity = (allData || []).map(record => {
          // Default selected metrics for testing
          const selectedMetrics = ['dials_today', 'pickups_today', 'one_min_convos', 'dqs_today', 'qualified_appointments', 'deals_closed', 'performance_score']
          
          let activityScore = 0
          
          if (selectedMetrics.includes('dials_today')) activityScore += (record.dials_today || 0) * 1
          if (selectedMetrics.includes('pickups_today')) activityScore += (record.pickups_today || 0) * 3
          if (selectedMetrics.includes('one_min_convos')) activityScore += (record.one_min_convos || 0) * 5
          if (selectedMetrics.includes('dqs_today')) activityScore += (record.dqs_today || 0) * 8
          if (selectedMetrics.includes('qualified_appointments')) activityScore += (record.qualified_appointments || 0) * 10
          if (selectedMetrics.includes('deals_closed')) activityScore += (record.deals_closed || 0) * 50
          if (selectedMetrics.includes('performance_score')) activityScore += (record.performance_score || 0) * 1

          return {
            ...record,
            calculated_activity_score: activityScore
          }
        })

        setActivityData(calculatedActivity)

      } catch (err) {
        console.error('❌ Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  // Group by date for heatmap calculation
  const dailyActivity = activityData.reduce((acc, curr) => {
    const date = curr.submission_date
    if (!acc[date]) {
      acc[date] = { date, totalScore: 0, records: [] }
    }
    acc[date].totalScore += curr.calculated_activity_score
    acc[date].records.push(curr)
    return acc
  }, {} as Record<string, { date: string; totalScore: number; records: any[] }>)

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Debug: Supabase Data & Activity Scores</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Summary</h2>
        <p><strong>Total Records:</strong> {data.length}</p>
        <p><strong>Date Range:</strong> {data.length > 0 ? `${data[data.length - 1]?.submission_date} to ${data[0]?.submission_date}` : 'No data'}</p>
        <p><strong>Unique Dates:</strong> {Object.keys(dailyActivity).length}</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Daily Activity Scores (for Heatmap)</h2>
        <div className="grid gap-4">
          {Object.values(dailyActivity).map(day => (
            <div key={day.date} className="bg-white border p-4 rounded">
              <h3 className="font-semibold">📅 {day.date}</h3>
              <p><strong>Total Activity Score:</strong> {day.totalScore}</p>
              <p><strong>Records:</strong> {day.records.length}</p>
              <div className="mt-2 space-y-1">
                {day.records.map((record, idx) => (
                  <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                    <strong>{record.full_name}:</strong> Score = {record.calculated_activity_score} 
                    (Dials: {record.dials_today}, Pickups: {record.pickups_today}, Convos: {record.one_min_convos}, DQs: {record.dqs_today}, Appointments: {record.qualified_appointments}, Deals: {record.deals_closed})
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Raw Data (All Records)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Name</th>
                <th className="border px-2 py-1">Dials</th>
                <th className="border px-2 py-1">Pickups</th>
                <th className="border px-2 py-1">Convos</th>
                <th className="border px-2 py-1">DQs</th>
                <th className="border px-2 py-1">Appointments</th>
                <th className="border px-2 py-1">Deals</th>
                <th className="border px-2 py-1">Performance Score</th>
                <th className="border px-2 py-1">Activity Score</th>
              </tr>
            </thead>
            <tbody>
              {activityData.map((record, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{record.submission_date}</td>
                  <td className="border px-2 py-1">{record.full_name}</td>
                  <td className="border px-2 py-1">{record.dials_today}</td>
                  <td className="border px-2 py-1">{record.pickups_today}</td>
                  <td className="border px-2 py-1">{record.one_min_convos}</td>
                  <td className="border px-2 py-1">{record.dqs_today}</td>
                  <td className="border px-2 py-1">{record.qualified_appointments}</td>
                  <td className="border px-2 py-1">{record.deals_closed}</td>
                  <td className="border px-2 py-1">{record.performance_score}</td>
                  <td className="border px-2 py-1 font-bold bg-yellow-100">{record.calculated_activity_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Activity Score Calculation Formula</h2>
        <div className="bg-blue-50 p-4 rounded">
          <p><strong>Formula:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Dials × 1</li>
            <li>Pickups × 3</li>
            <li>1min+ Convos × 5</li>
            <li>DQs × 8</li>
            <li>Appointments × 10</li>
            <li>Deals × 50</li>
            <li>Performance Score × 1</li>
          </ul>
          <p className="mt-2"><strong>Example:</strong> If someone has 78 dials, 18 pickups, 8 convos, 1 DQ, 5 appointments, 0 deals, performance score 4:</p>
          <p className="font-mono">Activity Score = (78×1) + (18×3) + (8×5) + (1×8) + (5×10) + (0×50) + (4×1) = 78 + 54 + 40 + 8 + 50 + 0 + 4 = <strong>234</strong></p>
        </div>
      </div>
    </div>
  )
}