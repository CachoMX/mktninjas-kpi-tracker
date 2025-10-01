'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SetterKPISubmission } from '@/types/database'

export default function SupabaseTestPage() {
  const [testResults, setTestResults] = useState<{ test: string; result: unknown }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const runTests = async () => {
      try {
        console.log('🧪 Running comprehensive Supabase tests...')
        
        // Test 1: Simple count
        console.log('Test 1: Count all records')
        const { count, error: countError } = await supabase
          .from('setter_kpi_submissions')
          .select('*', { count: 'exact', head: true })

        if (countError) {
          console.error('❌ Count error:', countError)
          setError(countError.message)
          return
        }

        console.log('✅ Total records in DB:', count)

        // Test 2: Fetch first 10 records
        console.log('Test 2: Fetch first 10 records')
        const { data: allData, error: fetchError } = await supabase
          .from('setter_kpi_submissions')
          .select('*')
          .limit(10)
          .order('submission_date', { ascending: false })

        if (fetchError) {
          console.error('❌ Fetch error:', fetchError)
          setError(fetchError.message)
          return
        }

        console.log('✅ Fetched records:', allData?.length || 0)
        console.log('📋 Sample data:', allData)

        // Test 3: Check date range
        if (allData && allData.length > 0) {
          const dates = allData.map((r: SetterKPISubmission) => r.submission_date).sort()
          console.log('📅 Date range:', dates[0], 'to', dates[dates.length - 1])
        }

        setTestResults([
          { test: 'Total Records', result: count || 0 },
          { test: 'Fetched Records', result: allData?.length || 0 },
          { test: 'Sample Data', result: allData?.slice(0, 3) || [] },
          { test: 'Connection Status', result: 'Success' }
        ])

      } catch (err) {
        console.error('❌ Test error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    runTests()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Supabase Connection Test</h1>
        <div className="mt-8">Running tests...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Supabase Connection Test</h1>
        <div className="mt-8 text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Supabase Connection Test Results</h1>
      
      <div className="space-y-4">
        {testResults.map((test, idx) => (
          <div key={idx} className="bg-white border p-4 rounded">
            <h3 className="font-semibold">{test.test}</h3>
            <pre className="mt-2 bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(test.result, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}