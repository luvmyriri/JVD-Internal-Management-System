import client from './client';

export interface CatalogFieldSchema {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'datetime-local' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
}

export interface ServiceCategory {
  id: number;
  name: string;
  pricing_model: 'per_pax' | 'per_day' | 'flat' | 'per_head_min_pax';
  field_schema: CatalogFieldSchema[];
}

export interface ServiceType {
  code: string;
  name: string;
  description: string;
}

export interface CatalogService {
  id: number;
  name: string;
  description?: string | null;
  category: string;
  service_type?: string | null;
  price: number;
  max_pax?: number | null;
}

export interface JoinerDeparture {
  id: number;
  code: string;
  starts_at: string;
  ends_at: string;
  booking_cutoff_at: string;
  timezone: string;
  capacity: number;
  held_count: number;
  confirmed_count: number;
  available_seats_count: number;
  status: 'draft' | 'published' | 'closed' | 'cancelled' | 'departed' | 'completed';
  pickup_instructions?: string | null;
  service?: { id: number; name: string; description?: string; price?: number; adult_price?: number; child_price?: number; images?: string[] } | null;
  bus?: { id: number; plate_number: string; model: string; seating_capacity: number } | null;
  driver?: { id: number; first_name: string; last_name: string } | null;
  seats?: JoinerDepartureSeat[];
  reservations?: JoinerReservationDetail[];
}

export interface JoinerDepartureSeat {
  id: number;
  seat_code: string;
  status: 'available' | 'held' | 'confirmed' | 'blocked';
  held_until?: string | null;
}

export interface JoinerReservationResult {
  id: number;
  reference: string;
  status: string;
  hold_expires_at?: string | null;
  invoice?: { id: number; invoice_number: string; total_amount: number; balance: number; status: string };
}

export interface JoinerReservationDetail {
  id: number;
  reference: string;
  lead_name: string;
  lead_contact?: string | null;
  passenger_count: number;
  status: string;
  invoice?: { id: number; invoice_number: string; status: string; balance: number } | null;
  passengers: Array<{ id: number; first_name: string; last_name: string; passenger_type: 'adult' | 'child'; date_of_birth?: string | null; emergency_contact?: string | null; special_needs?: string | null; seat?: JoinerDepartureSeat }>;
}

export interface JoinerResources {
  buses: Array<{ id: number; plate_number: string; model: string; seating_capacity: number; status: string; available: boolean }>;
  drivers: Array<{ id: number; first_name: string; last_name: string; available: boolean }>;
}

export const catalogApi = {
  getCategories: () => client.get('/sales/catalog').then(res => res.data.categories as ServiceCategory[]),
  getWorkspaceCatalog: () => client.get('/sales/catalog').then(res => res.data as { service_types: ServiceType[]; legacy_categories: ServiceCategory[]; services: CatalogService[] }),
  getJoinerDepartures: () => client.get('/sales/joiner-departures', { params: { upcoming: true } }).then(res => res.data.data as JoinerDeparture[]),
  getJoinerDeparture: (id: number) => client.get(`/sales/joiner-departures/${id}`).then(res => res.data.data as JoinerDeparture),
  createJoinerDeparture: (data: Record<string, unknown>) => client.post('/sales/joiner-departures', data).then(res => res.data.data as JoinerDeparture),
  getJoinerResources: (startsAt: string, endsAt: string) => client.get('/sales/joiner-departure-resources', { params: { starts_at: startsAt, ends_at: endsAt } }).then(res => res.data.data as JoinerResources),
  getJoinerManifest: (departureId: number) => client.get(`/sales/joiner-departures/${departureId}/manifest`, { responseType: 'blob' }).then(res => res.data as Blob),
  holdJoinerSeats: (departureId: number, data: Record<string, unknown>) => client.post(`/sales/joiner-departures/${departureId}/holds`, data).then(res => res.data.data as JoinerReservationResult),
  confirmJoinerReservation: (reservationId: number, data: Record<string, unknown>) => client.post(`/sales/joiner-reservations/${reservationId}/confirm`, data).then(res => res.data.data as JoinerReservationResult),
};
