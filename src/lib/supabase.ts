import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = 'https://oubrqatazrmbxdtqggcq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Validate environment variables in development
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Supabase URL:', supabaseUrl)
  console.log('Supabase key exists:', !!supabaseAnonKey)
  console.log('Supabase key preview:', supabaseAnonKey.substring(0, 20) + '...')
  if (!supabaseAnonKey) {
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing!')
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
})

// Test the connection immediately
if (typeof window !== 'undefined') {
  console.log('🧪 Testing Supabase connection from client...')
  void supabase
    .from('setter_kpi_submissions')
    .select('*')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Client Supabase test failed:', error)
      } else {
        console.log('✅ Client Supabase test successful:', data?.length || 0, 'records')
      }
    })
}