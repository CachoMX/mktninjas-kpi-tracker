'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SetterKPISubmission } from '@/types/database'
import { CustomBarChart } from '@/components/charts/bar-chart'
import { format } from 'date-fns'

interface TopPerformerData {
  name: string
  dials: number
  pickups: number
  convos: number
  dqs: number
  followUps: number
  appointments: number
  discoveryCalls: number
  showedUp: number
  rescheduled: number
  fullTerritory: number
  deals: number
  performanceScore: number
  pickupRate: number
  showRate: number
}

export default function TopPerformersTestPage() {
  const [data, setData] = useState<SetterKPISubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [topPerformersData, setTopPerformersData] = useState<TopPerformerData[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔍 Fetching data for Top Performers test...')
        
        const { data: allData, error } = await supabase
          .from('setter_kpi_submissions')
          .select('*')
          .order('submission_date', { ascending: false })
        
        if (error) {
          console.error('❌ Error:', error)
          setError(error.message)
          return
        }

        console.log('✅ Raw data fetched:', allData?.length || 0, 'records')
        setData(allData || [])

        // Calculate Top Performers data
        if (allData && allData.length > 0) {
          // For testing, let's use last 30 days
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          const fromDate = format(thirtyDaysAgo, 'yyyy-MM-dd')
          const toDate = format(new Date(), 'yyyy-MM-dd')
          
          console.log('📅 Date range for filtering:', fromDate, 'to', toDate)
          
          // Filter data by date range
          const filteredData = allData.filter(item => {
            const itemDate = item.submission_date.includes('T') ? item.submission_date.split('T')[0] : item.submission_date
            return itemDate >= fromDate && itemDate <= toDate
          })
          
          console.log('📊 Filtered data:', filteredData.length, 'records')
          
          // Group by setter name
          const grouped = filteredData.reduce((acc, curr) => {
            const name = curr.full_name
            if (!acc[name]) {
              acc[name] = {
                name,
                dials: 0,
                pickups: 0,
                convos: 0,
                dqs: 0,
                followUps: 0,
                appointments: 0,
                discoveryCalls: 0,
                showedUp: 0,
                rescheduled: 0,
                fullTerritory: 0,
                deals: 0,
                performanceScore: 0,
              }
            }
            acc[name].dials += curr.dials_today
            acc[name].pickups += curr.pickups_today
            acc[name].convos += curr.one_min_convos
            acc[name].dqs += curr.dqs_today
            acc[name].followUps += curr.follow_ups_today
            acc[name].appointments += curr.qualified_appointments
            acc[name].discoveryCalls += curr.discovery_calls_scheduled
            acc[name].showedUp += curr.prospects_showed_up
            acc[name].rescheduled += curr.prospects_rescheduled
            acc[name].fullTerritory += (curr.prospects_full_rterritory || 0)
            acc[name].deals += curr.deals_closed
            acc[name].performanceScore = Math.max(acc[name].performanceScore, curr.performance_score)
            return acc
          }, {} as Record<string, TopPerformerData>)

          // Add calculated metrics and sort
          const dataWithCalculatedMetrics = Object.values(grouped).map(setter => ({
            ...setter,
            pickupRate: setter.dials > 0 ? (setter.pickups / setter.dials) * 100 : 0,
            showRate: setter.discoveryCalls > 0 ? (setter.showedUp / setter.discoveryCalls) * 100 : 0,
          }))
          
          // Sort by dials and take top 10
          const sortedData = dataWithCalculatedMetrics.sort((a, b) => b.dials - a.dials).slice(0, 10)
          
          console.log('🏆 Top Performers:', sortedData)
          setTopPerformersData(sortedData)
        }

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

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Top Performers Test Page</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Summary</h2>
        <p><strong>Total Records:</strong> {data.length}</p>
        <p><strong>Top Performers Found:</strong> {topPerformersData.length}</p>
        <p><strong>Date Range:</strong> Last 30 days</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Top Performers Chart</h2>
        <div className="bg-white border rounded p-4">
          <CustomBarChart
            title="Top Performers"
            subtitle="Sorted by total dials"
            data={topPerformersData}
            xAxisDataKey="name"
            yAxisDataKey="dials"
            height={400}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Top Performers (Sorted by Dials)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-2 py-1">Rank</th>
                <th className="border px-2 py-1">Name</th>
                <th className="border px-2 py-1">Dials</th>
                <th className="border px-2 py-1">Pickups</th>
                <th className="border px-2 py-1">Pickup Rate</th>
                <th className="border px-2 py-1">Convos</th>
                <th className="border px-2 py-1">DQs</th>
                <th className="border px-2 py-1">Appointments</th>
                <th className="border px-2 py-1">Deals</th>
                <th className="border px-2 py-1">Performance Score</th>
              </tr>
            </thead>
            <tbody>
              {topPerformersData.map((performer, idx) => (
                <tr key={performer.name} className="hover:bg-gray-50">
                  <td className="border px-2 py-1 text-center font-bold">{idx + 1}</td>
                  <td className="border px-2 py-1 font-semibold">{performer.name}</td>
                  <td className="border px-2 py-1 text-center">{performer.dials}</td>
                  <td className="border px-2 py-1 text-center">{performer.pickups}</td>
                  <td className="border px-2 py-1 text-center">{performer.pickupRate.toFixed(1)}%</td>
                  <td className="border px-2 py-1 text-center">{performer.convos}</td>
                  <td className="border px-2 py-1 text-center">{performer.dqs}</td>
                  <td className="border px-2 py-1 text-center">{performer.appointments}</td>
                  <td className="border px-2 py-1 text-center">{performer.deals}</td>
                  <td className="border px-2 py-1 text-center">{performer.performanceScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Top Performers Data for Chart</h2>
        <div className="bg-blue-50 p-4 rounded">
          <p><strong>Chart Data Structure:</strong></p>
          <pre className="mt-2 text-sm overflow-auto">
            {JSON.stringify(topPerformersData.slice(0, 5), null, 2)}
          </pre>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Expected Chart Visualization</h2>
        <div className="bg-green-50 p-4 rounded">
          <p><strong>What the bar chart should show:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>X-axis: Setter names</li>
            <li>Y-axis: Number of dials (primary metric)</li>
            <li>Bars sorted from highest to lowest dials</li>
            <li>Top 10 performers only</li>
            <li>Additional metrics available in tooltips</li>
          </ul>
        </div>
      </div>
    </div>
  )
}