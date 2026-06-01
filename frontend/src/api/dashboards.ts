import client from './client';

export interface DashboardKpis {
  // Admin / shared
  total_users?: number;
  total_customers?: number;
  monthly_revenue?: number;
  user_role_count?: number;
  // Accounting
  pending_invoices?: number;
  pending_budgets?: number;
  processed_collections?: number;
  // Agent
  active_bookings?: number;
  processed_passports?: number;
  processed_visas?: number;
  monthly_commission?: number;
  // Driver
  upcoming_trips?: number;
  total_hours?: number;
  driver_rating?: number;
  assigned_vehicle?: string;
  // HR
  total_employees?: number;
  inactive_staff?: number;
  open_applications?: number;
  active_interns?: number;
}

export interface MonthlyChartPoint {
  month: string;
  revenue: number;
  bookings: number;
  utilization: number;
}

export interface TopPerformer {
  rank: number;
  name: string;
  sales?: string;
  bookings?: number;
  trips?: number;
  hours?: number;
  rating: number;
  image: string;
}

export interface RecentBooking {
  'Booking ID': string;
  Date: string;
  Customer: string;
  Destination: string;
  Amount: string;
  Status: 'Confirmed' | 'Pending' | 'Cancelled';
}

export interface UserDistribution {
  name: string;
  value: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  monthly_chart: MonthlyChartPoint[];
  top_agents: TopPerformer[];
  top_drivers: TopPerformer[];
  recent_bookings: RecentBooking[];
  user_distribution?: UserDistribution[];
}

export const dashboardApi = {
  getAdmin: () =>
    client.get<{ success: boolean; data: DashboardData }>('/dashboards/admin').then(r => r.data.data),

  getAccounting: () =>
    client.get<{ success: boolean; data: DashboardData }>('/dashboards/accounting').then(r => r.data.data),

  getAgent: () =>
    client.get<{ success: boolean; data: DashboardData }>('/dashboards/agent').then(r => r.data.data),

  getDriver: () =>
    client.get<{ success: boolean; data: DashboardData }>('/dashboards/driver').then(r => r.data.data),

  getHr: () =>
    client.get<{ success: boolean; data: DashboardData }>('/dashboards/hr').then(r => r.data.data),
};
