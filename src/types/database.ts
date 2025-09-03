export interface Database {
  public: {
    Tables: {
      setter_kpi_submissions: {
        Row: SetterKPISubmission
        Insert: Omit<SetterKPISubmission, 'id' | 'created_at'>
        Update: Partial<Omit<SetterKPISubmission, 'id' | 'created_at'>>
      }
    }
  }
}

export interface SetterKPISubmission {
  id?: number
  created_at?: string
  submission_date: string
  contact_id: string
  first_name: string
  last_name: string
  full_name: string
  dials_today: number
  pickups_today: number
  one_min_convos: number
  dqs_today: number
  follow_ups_today: number
  qualified_appointments: number
  discovery_calls_scheduled: number
  prospects_showed_up: number
  prospects_rescheduled: number
  live_calls_today: number
  offers_made: number
  deals_closed: number
  deposits_collected: number
  cash_collected: number
  focus_score: number
  performance_score: number
  hours_of_sleep: number
}

export interface KPIMetric {
  label: string
  key: keyof SetterKPISubmission
  color: string
  format?: 'number' | 'percentage' | 'currency'
}

export interface FilterState {
  setters: string[]
  dateRange: {
    from: Date
    to: Date
  }
  metrics: string[]
}

export interface DashboardStats {
  totalDials: number
  totalPickups: number
  pickupRate: number
  totalConvos: number
  convoRate: number
  totalDQs: number
  totalAppointments: number
  totalDeals: number
  averagePerformanceScore: number
  showRate: number
}

export interface TrendData {
  date: string
  [key: string]: string | number
}

export interface LeaderboardEntry extends SetterKPISubmission {
  rank: number
  pickupRate: number
  convoRate: number
}

export type DatePreset = 'today' | 'this-week' | 'this-month' | 'last-30-days' | 'custom'