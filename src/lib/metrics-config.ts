import { KPIMetric, UserRole } from '@/types/database'

// Setter metrics configuration
export const SETTER_COUNT_METRICS: KPIMetric[] = [
  { label: 'Dials', key: 'dials_today', color: '#3B82F6', roles: ['setter'] },
  { label: 'Pickups', key: 'pickups_today', color: '#10B981', roles: ['setter'] },
  { label: '1min+ Convos', key: 'one_min_convos', color: '#F59E0B', roles: ['setter'] },
  { label: 'DQs', key: 'dqs_today', color: '#EF4444', roles: ['setter'] },
  { label: 'Follow Ups', key: 'follow_ups_today', color: '#EC4899', roles: ['setter'] },
  { label: 'Appointments', key: 'qualified_appointments', color: '#8B5CF6', roles: ['setter'] },
  { label: 'Discovery Calls', key: 'discovery_calls_scheduled', color: '#F97316', roles: ['setter'] },
  { label: 'Showed Up', key: 'prospects_showed_up', color: '#22C55E', roles: ['setter'] },
  { label: 'Rescheduled', key: 'prospects_rescheduled', color: '#F59E0B', roles: ['setter'] },
  { label: 'Full Territory', key: 'prospects_full_territory', color: '#A855F7', roles: ['setter'] },
  { label: 'Performance Score', key: 'performance_score', color: '#84CC16', format: 'number', roles: ['setter'] },
]

export const SETTER_EFFICIENCY_METRICS: KPIMetric[] = [
  { label: 'Pickup Rate', key: 'pickupRate', color: '#10B981', format: 'percentage', calculated: true, roles: ['setter'] },
  { label: 'Conversation Rate', key: 'convoRate', color: '#F59E0B', format: 'percentage', calculated: true, roles: ['setter'] },
  { label: 'Show Rate', key: 'showRate', color: '#22C55E', format: 'percentage', calculated: true, roles: ['setter'] },
]

// Closer metrics configuration
export const CLOSER_COUNT_METRICS: KPIMetric[] = [
  { label: 'Appointments on Calendar', key: 'appointments_on_calendar', color: '#3B82F6', roles: ['closer'] },
  { label: 'Live Calls', key: 'live_calls_today', color: '#10B981', roles: ['closer'] },
  { label: 'No Shows', key: 'no_shows_today', color: '#EF4444', roles: ['closer'] },
  { label: 'Follow-up Calls Scheduled', key: 'follow_up_calls_scheduled', color: '#EC4899', roles: ['closer'] },
  { label: 'Calls Rescheduled', key: 'calls_rescheduled', color: '#F59E0B', roles: ['closer'] },
  { label: 'Offers Made', key: 'offers_made', color: '#8B5CF6', roles: ['closer'] },
  { label: 'Deals Closed', key: 'deals_closed', color: '#22C55E', roles: ['closer'] },
  { label: 'Deposits Collected', key: 'deposits_collected', color: '#F97316', roles: ['closer'] },
  { label: 'Cash Collected', key: 'cash_collected', color: '#06B6D4', format: 'currency', roles: ['closer'] },
  { label: 'Performance Score', key: 'performance_score', color: '#84CC16', format: 'number', roles: ['closer'] },
  { label: 'Focus Score', key: 'focus_score', color: '#A855F7', format: 'number', roles: ['closer'] },
]

export const CLOSER_EFFICIENCY_METRICS: KPIMetric[] = [
  { label: 'No Show Rate', key: 'noShowRate', color: '#EF4444', format: 'percentage', calculated: true, roles: ['closer'] },
  { label: 'Closing Rate', key: 'closingRate', color: '#22C55E', format: 'percentage', calculated: true, roles: ['closer'] },
  { label: 'Average Cash Per Deal', key: 'averageCashPerDeal', color: '#06B6D4', format: 'currency', calculated: true, roles: ['closer'] },
]

// Helper functions to get metrics by role
export function getCountMetrics(role: UserRole): KPIMetric[] {
  return role === 'setter' ? SETTER_COUNT_METRICS : CLOSER_COUNT_METRICS
}

export function getEfficiencyMetrics(role: UserRole): KPIMetric[] {
  return role === 'setter' ? SETTER_EFFICIENCY_METRICS : CLOSER_EFFICIENCY_METRICS
}

export function getAllMetrics(role: UserRole): KPIMetric[] {
  return [...getCountMetrics(role), ...getEfficiencyMetrics(role)]
}

// Default metrics for each role
export function getDefaultMetrics(role: UserRole): string[] {
  if (role === 'setter') {
    return ['dials_today', 'pickups_today', 'one_min_convos', 'dqs_today', 'qualified_appointments', 'performance_score']
  } else {
    return ['appointments_on_calendar', 'live_calls_today', 'offers_made', 'deals_closed', 'cash_collected', 'performance_score']
  }
}