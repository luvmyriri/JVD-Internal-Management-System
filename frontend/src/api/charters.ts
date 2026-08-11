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
  garage_location?: string;
  pickup_location?: string | null;
  destination?: string | null;
  garage_distance_km?: number;
  route_distance_km?: number;
  total_distance_km?: number;
  fuel_efficiency_km_per_liter?: number;
  estimated_liters?: number;
  diesel_price_per_liter?: number;
  diesel_cost?: number;
  driver_meals?: number;
  toll_gate_fees?: number;
  easytrip?: number;
  autosweep?: number;
  commission?: number;
  desired_profit?: number;
  total_expenses?: number;
  projected_profit?: number;
  auto_adjust_rate?: boolean;
  pricing_metadata?: {
    toll_pricing_mode?: 'route' | 'matrix' | 'manual';
    include_garage_travel?: boolean;
  };
  service: { id: number; name: string; description?: string; images?: string[] };
}

export interface LocationSuggestion {
  label: string;
  latitude?: number;
  longitude?: number;
  provider: string;
  psgc_code?: string | null;
  geographic_level?: string | null;
  version?: string;
}

export interface TollEstimate {
  provider: 'TollGuru' | 'Toll Regulatory Board';
  mode: 'automatic' | 'manual_reference';
  currency: string;
  vehicle_type?: string;
  toll_gate_fees: number;
  easytrip: number;
  autosweep: number;
  total: number;
  tolls: Array<{ name: string; road?: string | null; cost: number; currency: string }>;
  url: string;
  message: string;
}

export interface TollMatrixPoint {
  id: number;
  name: string;
  expressway: string;
  sequence: number;
}

export interface TollMatrixNetwork {
  id: string;
  name: string;
  rfid: 'easytrip' | 'autosweep' | 'toll_gate_fees';
  points: TollMatrixPoint[];
}

export interface TollMatrixCatalog {
  vehicle_class: number;
  vehicle_description: string;
  source_name: string;
  source_url: string;
  official_verification_url: string;
  synced_at: string;
  networks: TollMatrixNetwork[];
}

export interface TollMatrixCalculation {
  provider: string;
  mode: 'matrix';
  currency: 'PHP';
  toll_gate_fees: number;
  easytrip: number;
  autosweep: number;
  total: number;
  segments: Array<{ network_id: string; network: string; entry_point: string; exit_point: string; rfid: string; fee: number }>;
  source_url: string;
  official_verification_url: string;
  synced_at: string;
}

export interface RouteEstimate {
  garage_location: string;
  pickup_location: string;
  destination: string;
  garage_distance_km: number;
  route_distance_km: number;
  total_distance_km: number;
  garage_coordinates?: LocationSuggestion & { latitude: number; longitude: number };
  pickup_coordinates: LocationSuggestion & { latitude: number; longitude: number };
  destination_coordinates: LocationSuggestion & { latitude: number; longitude: number };
  geometry: [number, number][];
  routing_provider: string;
  geocoding_provider: string;
  toll_estimate: TollEstimate;
  toll_source: TollEstimate;
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
  lead_email?: string | null;
  lead_contact?: string | null;
  starts_at: string;
  ends_at: string;
  pickup_location: string;
  destination: string;
  stops?: string[];
  passenger_count: number;
  booking_mode?: 'entire_vehicle' | 'selected_seats';
  selected_seats?: string[];
  passengers?: Array<Record<string, unknown>>;
  fleet_assignments?: Array<{ bus_id: number; driver_id?: number | null; plate_number?: string; model?: string; seating_capacity?: number }>;
  operations_notes?: string | null;
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
  searchLocations: (q: string) => client.get('/sales/location-search', { params: { q } }).then(res => res.data.data as LocationSuggestion[]),
  searchOfficialLocations: (q: string) => client.get('/sales/official-location-search', { params: { q } }).then(res => res.data.data as LocationSuggestion[]),
  reverseLocation: (latitude: number, longitude: number) => client.get('/sales/reverse-location', { params: { latitude, longitude } }).then(res => res.data.data as LocationSuggestion),
  estimateRoute: (data: Record<string, unknown>) => client.post('/sales/charter-route-estimate', data).then(res => res.data.data as RouteEstimate),
  tollMatrix: () => client.get('/sales/toll-matrix').then(res => res.data.data as TollMatrixCatalog),
  calculateTolls: (segments: Array<{ network_id: string; entry_point_id: number; exit_point_id: number }>) => client.post('/sales/toll-matrix/calculate', { segments }).then(res => res.data.data as TollMatrixCalculation),
  createRatePlan: (data: Record<string, unknown>) => client.post('/sales/charter-rate-plans', data).then(res => res.data.data as CharterRatePlan),
  updateRatePlan: (id: number, data: Record<string, unknown>) => client.put(`/sales/charter-rate-plans/${id}`, data).then(res => res.data.data as CharterRatePlan),
  deleteRatePlan: (id: number) => client.delete(`/sales/charter-rate-plans/${id}`).then(res => res.data),
  createBooking: (data: Record<string, unknown>) => client.post('/sales/charter-bookings', data).then(res => res.data.data as CharterBooking),
  updateBooking: (id: number, data: Record<string, unknown>) => client.put(`/sales/charter-bookings/${id}`, data).then(res => res.data.data as CharterBooking),
  cancelBooking: (id: number, reason: string) => client.post(`/sales/charter-bookings/${id}/cancel`, { reason }).then(res => res.data),
};

