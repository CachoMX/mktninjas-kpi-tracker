export interface Database {
  public: {
    Tables: {
      setter_kpi_submissions: {
        Row: SetterKPISubmission
        Insert: Omit<SetterKPISubmission, 'id'>
        Update: Partial<Omit<SetterKPISubmission, 'id'>>
      }
      closer_eod_submissions: {
        Row: CloserEODSubmission
        Insert: Omit<CloserEODSubmission, 'id'>
        Update: Partial<Omit<CloserEODSubmission, 'id'>>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at'>
        Update: Partial<Omit<Payment, 'id' | 'created_at'>>
      }
      deal_types: {
        Row: DealType
        Insert: Omit<DealType, 'id' | 'created_at'>
        Update: Partial<Omit<DealType, 'id' | 'created_at'>>
      }
      csms: {
        Row: CSM
        Insert: Omit<CSM, 'id' | 'created_at'>
        Update: Partial<Omit<CSM, 'id' | 'created_at'>>
      }
      commission_calculations: {
        Row: CommissionCalculation
        Insert: Omit<CommissionCalculation, 'created_at'>
        Update: Partial<Omit<CommissionCalculation, 'created_at'>>
      }
    }
  }
}

export interface SetterKPISubmission {
  id?: number
  submission_date: string
  contact_id: string
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
  prospects_full_territory: number
  focus_score: number
  performance_score: number
  hours_of_sleep: number
  what_went_well?: string
  calendar_statuses_updated?: string
  script_training_updated?: string
  email_address?: string
  what_went_bad?: string
  what_will_do_differently?: string
  url?: string
  links_to_recordings?: string
  timezone?: string
}

export interface CloserEODSubmission {
  id?: number
  full_name: string
  email_address?: string
  submission_date: string
  appointments_on_calendar: number
  live_calls_today: number
  no_shows_today: number
  follow_up_calls_scheduled: number
  calls_rescheduled: number
  offers_made: number
  deals_closed: number
  deposits_collected: number
  cash_collected: number
  hours_of_sleep: number
  focus_score: number
  performance_score: number
  what_went_well?: string
  what_went_bad?: string
  what_will_do_differently?: string
  submitted_call_handoff_forms?: string
  service_agreements_updated?: string
  calendar_statuses_updated?: string
  script_training_updated?: string
  links_to_recordings?: string
  timezone?: string
  url?: string
  contact_id?: string
  form_submitted_at?: string
}

// Role types
export type UserRole = 'setter' | 'closer'

// Union type for submissions
export type KPISubmission = SetterKPISubmission | CloserEODSubmission

export interface KPIMetric {
  label: string
  key: string
  color: string
  format?: 'number' | 'percentage' | 'currency'
  calculated?: boolean
  roles?: UserRole[] // Which roles this metric applies to
}

export interface FilterState {
  people: string[] // Generic name for both setters and closers
  dateRange: {
    from: Date
    to: Date
  }
  metrics: string[]
  role: UserRole
}

// Setter-specific dashboard stats
export interface SetterDashboardStats {
  totalDials: number
  totalPickups: number
  pickupRate: number
  totalConvos: number
  convoRate: number
  totalDQs: number
  totalFollowUps: number
  totalAppointments: number
  totalDiscoveryCalls: number
  totalShowedUp: number
  totalRescheduled: number
  totalFullTerritory: number
  averagePerformanceScore: number
  showRate: number
}

// Closer-specific dashboard stats
export interface CloserDashboardStats {
  totalAppointmentsOnCalendar: number
  totalLiveCalls: number
  totalNoShows: number
  noShowRate: number
  totalFollowUpCallsScheduled: number
  totalCallsRescheduled: number
  totalOffersMade: number
  totalDealsClosingRate: number
  totalDealsClosed: number
  totalDepositsCollected: number
  totalCashCollected: number
  averageCashPerDeal: number
  averagePerformanceScore: number
  averageFocusScore: number
}

// Union type for dashboard stats
export type DashboardStats = SetterDashboardStats | CloserDashboardStats

export interface TrendData {
  date: string
  [key: string]: string | number
}

// Generic leaderboard entry that can work for both roles
export interface LeaderboardEntry {
  rank: number
  full_name: string
  submission_date: string
  performance_score: number
  focus_score?: number
  // Role-specific calculated metrics will be added dynamically
  [key: string]: string | number | undefined
}

export type DatePreset = 'today' | 'this-week' | 'this-month' | 'last-30-days' | 'custom'

// Commission System Types

export type ServiceAgreementStatus = 'pending' | 'completed'
export type PaymentType = 'New Deal' | 'Rebill'
export type DealTypeName = 'google_ads' | 'referral_network_6_months' | 'referral_network_3_months' | 'referral_network_4_months' | 'service_upgrade'
export type CSMName = 'Maia' | 'Luiza' | 'Talita' | 'Tamara' | 'Carolina' | 'N/A'

export interface Payment {
  id?: number
  whop_payment_id: string
  whop_user_id: string
  amount: number
  payment_date: string
  payment_type: PaymentType
  deal_type_id: number
  billing_full_name: string
  email: string
  whop_account_name: string
  whop_account_username: string
  setter_assigned: string | null
  closer_assigned: string | null
  service_agreement_status: ServiceAgreementStatus
  assigned_csm: CSMName
  parent_payment_id?: number | null // Links rebills to original "New Deal"
  created_at?: string
}

// Payment with joined deal type information
export interface PaymentWithDealType extends Payment {
  deal_types?: DealType
}

export interface DealType {
  id?: number
  name: DealTypeName
  display_name: string
  conversion_rate: number // How many of this type equals 1 six-month deal
  is_backend: boolean // Service upgrades are backend deals
  created_at?: string
}

export interface CSM {
  id?: number
  name: CSMName
  email?: string
  is_active: boolean
  created_at?: string
}

export interface CommissionTier {
  min_deals: number
  max_deals: number | null
  closer_rate: number
  setter_rate: number
}

export interface CommissionCalculation {
  id?: number
  payment_id: number
  month: string // YYYY-MM format
  deal_count_at_time: number // Database expects decimal/numeric type
  six_month_equivalent: number // Database expects decimal/numeric type
  tier_min_deals: number
  tier_max_deals: number | null
  closer_rate: number
  setter_rate: number
  closer_commission: number // Database expects decimal/numeric type
  setter_commission: number // Database expects decimal/numeric type
  csm_commission: number // Database expects decimal/numeric type
  is_paid: boolean
  created_at?: string
}

export interface TeamMember {
  full_name: string
  email?: string
  role: 'setter' | 'closer'
  is_active: boolean
}

export interface MonthlyCommissionSummary {
  month: string
  total_payments: number
  total_amount: number
  completed_payments: number
  completed_amount: number
  six_month_deals: number
  total_closer_commission: number
  total_setter_commission: number
  total_csm_commission: number
  by_person: {
    name: string
    role: 'setter' | 'closer' | 'csm'
    commission: number
    deals: number
  }[]
}