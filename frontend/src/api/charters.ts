import client from './client';

export interface CharterRatePlan {
  id: number;
  service_id: number;
  name: string;
  vehicle_class: 'bus' | 'van' | 'coaster';
  base_price: number;
  included_hours: number;
  included_kilometers: number;
  extra_hour_rate: number;
  extra_kilometer_rate: number;
  overnight_rate: number;
  includes_driver: boolean;
  includes_fuel: boolean;
  includes_tolls: boolean;
  includes_parking: boolean;
  service: { id: number; name: string; description?: string };
}

export interface CharterPricing {
  duration_hours: number;
  estimated_kilometers: number;
  extra_hours: number;
  extra_kilometers: number;
  overnights: number;
  base_price: number;
  extra_hours_amount: number;
  extra_kilometers_amount: number;
  overnight_amount: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

export interface CharterResources {
  buses: Array<{ id: number; plate_number: string; model: string; vehicle_type: string; bus_category?: string; seating_capacity: number; status: string; available: boolean }>;
  drivers: Array<{ id: number; first_name: string; last_name: string; available: boolean }>;
}

export interface CharterBooking {
  id: number;
  reference: string;
  lead_name: string;
  starts_at: string;
  ends_at: string;
  pickup_location: string;
  destination: string;
  passenger_count: number;
  subtotal: number;
  status: string;
  rate_plan: CharterRatePlan;
  bus: CharterResources['buses'][number];
  driver?: CharterResources['drivers'][number] | null;
  invoice: { id: number; invoice_number: string; status: string; balance: number };
}

export const charterApi = {
  ratePlans: () => client.get('/sales/charter-rate-plans').then(res => res.data.data as CharterRatePlan[]),
  bookings: () => client.get('/sales/charter-bookings').then(res => res.data.data as CharterBooking[]),
  resources: (startsAt: string, endsAt: string) => client.get('/sales/charter-resources', { params: { starts_at: startsAt, ends_at: endsAt } }).then(res => res.data.data as CharterResources),
  quote: (data: { rate_plan_id: number; starts_at: string; ends_at: string; estimated_kilometers: number }) => client.post('/sales/charter-quote', data).then(res => res.data.data as CharterPricing),
  createRatePlan: (data: Record<string, unknown>) => client.post('/sales/charter-rate-plans', data).then(res => res.data.data as CharterRatePlan),
  createBooking: (data: Record<string, unknown>) => client.post('/sales/charter-bookings', data).then(res => res.data.data as CharterBooking),
};
