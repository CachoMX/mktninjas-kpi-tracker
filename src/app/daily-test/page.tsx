'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SetterKPISubmission } from '@/types/database'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'

export default function DailyTestPage() {
  const [allData, setAllData] = useState<SetterKPISubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔍 DailyTest: Fetching all data...')
        
        // Get data from last 10 days to see what dates have data
        const tenDaysAgo = startOfDay(subDays(new Date(), 10))
        const today = endOfDay(new Date())
        const fromDate = format(tenDaysAgo, 'yyyy-MM-dd')
        const toDate = format(today, 'yyyy-MM-dd')
        
        console.log('🔍 DailyTest: Querying from', fromDate, 'to', toDate)
        
        const { data, error } = await supabase
          .from('setter_kpi_submissions')
          .select('*')
          .gte('submission_date', fromDate)
          .lte('submission_date', toDate)
          .order('submission_date', { ascending: false })

        if (error) {
          console.error('❌ DailyTest: Error:', error)
          setError(error.message)
          return
        }

        console.log('✅ DailyTest: Fetched', data?.length || 0, 'records')
        setAllData(data || [])

        // Extract unique dates
        if (data && data.length > 0) {
          const dates = (data as SetterKPISubmission[]).map(item => {
            const dateStr = item.submission_date.includes('T') 
              ? item.submission_date.split('T')[0] 
              : item.submission_date
            return dateStr
          })
          const uniqueDates = Array.from(new Set(dates)).sort().reverse()
          console.log('📅 DailyTest: Available dates:', uniqueDates)
          setAvailableDates(uniqueDates)
        }

      } catch (err) {
        console.error('❌ DailyTest: Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Group data by date for easy viewing
  const dataByDate = allData.reduce((acc, item) => {
    const dateStr = item.submission_date.includes('T') 
      ? item.submission_date.split('T')[0] 
      : item.submission_date
    
    if (!acc[dateStr]) {
      acc[dateStr] = []
    }
    acc[dateStr].push(item)
    return acc
  }, {} as Record<string, SetterKPISubmission[]>)

  if (loading) return <div className="p-8">Loading daily test data...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Daily Summary Test Page</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Data Summary</h2>
        <p><strong>Total Records (last 10 days):</strong> {allData.length}</p>
        <p><strong>Available Dates:</strong> {availableDates.length}</p>
        <p><strong>Date Range:</strong> Last 10 days</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Available Dates with Data</h2>
        <div className="space-y-4">
          {availableDates.map(date => {
            const dayData = dataByDate[date] || []
            const dayStats = dayData.reduce((acc, curr) => ({
              totalDials: acc.totalDials + curr.dials_today,
              totalPickups: acc.totalPickups + curr.pickups_today,
              totalConvos: acc.totalConvos + curr.one_min_convos,
              totalAppointments: acc.totalAppointments + curr.qualified_appointments,
              totalDeals: acc.totalDeals + 0, // Setters don't track deals
              setterCount: acc.setterCount + 1
            }), {
              totalDials: 0,
              totalPickups: 0,
              totalConvos: 0,
              totalAppointments: 0,
              totalDeals: 0,
              setterCount: 0
            })

            return (
              <div key={date} className="border rounded p-4 bg-white">
                <h3 className="font-semibold text-lg">{date}</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-2 text-sm">
                  <div><strong>Setters:</strong> {dayStats.setterCount}</div>
                  <div><strong>Dials:</strong> {dayStats.totalDials}</div>
                  <div><strong>Pickups:</strong> {dayStats.totalPickups}</div>
                  <div><strong>Convos:</strong> {dayStats.totalConvos}</div>
                  <div><strong>Appointments:</strong> {dayStats.totalAppointments}</div>
                  <div><strong>Deals:</strong> {dayStats.totalDeals}</div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <strong>Sample setters:</strong> {dayData.slice(0, 3).map(d => d.full_name).join(', ')}
                  {dayData.length > 3 && ` ... and ${dayData.length - 3} more`}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {availableDates.length === 0 && (
        <div className="bg-yellow-100 p-4 rounded">
          <h3 className="font-semibold">No Data Found</h3>
          <p>No submissions found in the last 10 days. The database might be empty or the date format might not match.</p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Raw Data Sample (First 5 Records)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Name</th>
                <th className="border px-2 py-1">Dials</th>
                <th className="border px-2 py-1">Pickups</th>
                <th className="border px-2 py-1">Convos</th>
                <th className="border px-2 py-1">Appointments</th>
                <th className="border px-2 py-1">Deals</th>
              </tr>
            </thead>
            <tbody>
              {allData.slice(0, 5).map((record, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{record.submission_date.split('T')[0]}</td>
                  <td className="border px-2 py-1">{record.full_name}</td>
                  <td className="border px-2 py-1">{record.dials_today}</td>
                  <td className="border px-2 py-1">{record.pickups_today}</td>
                  <td className="border px-2 py-1">{record.one_min_convos}</td>
                  <td className="border px-2 py-1">{record.qualified_appointments}</td>
                  <td className="border px-2 py-1">0</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}