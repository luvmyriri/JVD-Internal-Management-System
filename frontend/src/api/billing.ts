import client from './client';

export interface Service {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  images?: string[];
  is_active: boolean;
  created_by?: number;
  child_discount?: number;
  has_booking_fields?: boolean;
  adult_price?: number;
  child_price?: number;
  is_tour?: boolean;
  bus_price?: number;
  coaster_price?: number;
  tour_kms?: number;
  tour_hours?: number;
  cost_breakdown?: string;
  inclusions?: string;
  exclusions?: string;
  creator?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  max_pax?: number;
  fixed_date?: string | null; // ISO date string YYYY-MM-DD; Joiner packages only
}

export interface InvoiceItem {
  service_id: number;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  adults?: number | null;
  children?: number | null;
  adult_price?: number | null;
  child_price?: number | null;
  service?: Service;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id?: number;
  customer_name?: string;
  customer_address?: string;
  customer_email?: string;
  customer_contact?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_received?: number;
  change?: number;
  payment_method: string;
  payment_type?: string;
  balance?: number;
  due_date?: string;
  status: string;
  notes?: string;
  cash_budget_request_id?: number;
  bus_id?: number | null;
  driver_id?: number | null;
  seat_map?: string[];
  travel_date?: string | null;
  pickup_location?: string | null;
  tour_code?: string | null;
  pax_count?: number | null;
  arrival_datetime?: string | null;
  departure_datetime?: string | null;
  bus?: { id: number; plate_number: string; model: string; seating_capacity?: number } | null;
  driver?: { id: number; first_name: string; last_name: string } | null;
  itineraries?: { id: number; day_number: number; date?: string; location?: string; activity_description?: string }[];
  created_at: string;
  customer?: any;
  items?: InvoiceItem[];
  collection?: any;
}

export const billingApi = {
  getServices: () => client.get('/billing/services'),
  getInvoices: (params: { page?: number; search?: string; status?: string; date_from?: string; date_to?: string; per_page?: number }) =>
    client.get('/billing', { params }),
  getInvoice: (id: number) => client.get(`/billing/${id}`),
  createInvoice: (data: {
    customer_id?: number | null;
    customer_name?: string;
    customer_address?: string;
    customer_email?: string;
    customer_contact?: string;
    payment_method: string;
    payment_type?: string;
    amount_received?: number;
    change?: number;
    items: { service_id: number; quantity: number; unit_price?: number; adults?: number; children?: number; service_date?: string; destination?: string; }[];
    notes?: string;
    bus_id?: number | null;
    driver_id?: number | null;
    seat_map?: any;
    travel_date?: string | null;
    pickup_location?: string | null;
    tour_code?: string | null;
    pax_count?: number | null;
  }) => client.post('/billing', data),
  createService: (data: {
    name: string;
    category: string;
    price: number;
    description: string;
    images?: string[];
    child_discount?: number;
    has_booking_fields?: boolean;
    adult_price?: number;
    child_price?: number;
    is_tour?: boolean;
    bus_price?: number;
    coaster_price?: number;
    tour_kms?: number;
    tour_hours?: number;
    cost_breakdown?: string;
    inclusions?: string;
    exclusions?: string;
    max_pax?: number;
    fixed_date?: string | null;
  }) => client.post('/billing/services', data),
  updateService: (id: number, data: {
    name: string;
    category: string;
    price: number;
    description: string;
    images?: string[];
    is_active?: boolean;
    child_discount?: number;
    has_booking_fields?: boolean;
    adult_price?: number;
    child_price?: number;
    is_tour?: boolean;
    bus_price?: number;
    coaster_price?: number;
    tour_kms?: number;
    tour_hours?: number;
    cost_breakdown?: string;
    inclusions?: string;
    exclusions?: string;
    max_pax?: number;
    fixed_date?: string | null;
  }) => client.put(`/billing/services/${id}`, data),
  deleteService: (id: number) => client.delete(`/billing/services/${id}`),
  updateStatus: (id: number, status: string) => 
    client.patch(`/billing/${id}/status`, { status }),
  getReportsSummary: (range = 'month') => 
    client.get('/billing/reports/summary', { params: { range } }),
  getReportsDetailed: (range = 'month') => 
    client.get('/billing/reports/detailed', { params: { range } }),
  getServiceOccupancy: (id: number, date: string) => 
    client.get(`/billing/services/${id}/occupancy`, { params: { travel_date: date } }),
};
