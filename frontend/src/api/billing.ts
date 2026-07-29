import client from './client';

export interface Service {
  id: number;
  name: string;
  description: string;
  category: string;
  service_type?: string | null;
  package_config?: {
    destination?: string;
    origin?: string;
    duration_days?: number;
    duration_nights?: number;
    minimum_pax?: number;
    maximum_pax?: number;
    booking_lead_days?: number;
    valid_from?: string;
    valid_until?: string;
    default_itinerary?: string[];
  } | null;
  is_sales_catalog?: boolean;
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
  service_id?: number | null;
  item_name?: string;
  service_type?: string;
  item_description?: string;
  item_metadata?: Record<string, unknown>;
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
    items: { service_id?: number | null; passport_case_id?: number; item_name?: string; service_type?: string; item_description?: string; item_metadata?: Record<string, unknown>; quantity: number; unit_price?: number; adults?: number; children?: number; adult_price?: number; child_price?: number; service_date?: string; destination?: string; }[];
    custom_transaction_detail?: import('./contracts').CustomTransactionDetailInput;
    itinerary?: import('./contracts').ItineraryDayInput[];
    passengers?: import('./contracts').PassengerInput[];
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
    bus_id?: number | null;
    driver_id?: number | null;
    service_type?: string | null;
    package_config?: Service['package_config'];
    is_sales_catalog?: boolean;
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
    bus_id?: number | null;
    driver_id?: number | null;
    service_type?: string | null;
    package_config?: Service['package_config'];
    is_sales_catalog?: boolean;
  }) => client.put(`/billing/services/${id}`, data),
  uploadServiceImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return client.post<{ success: boolean; path: string; url: string }>('/billing/services/upload-image', formData);
  },
  deleteService: (id: number) => client.delete(`/billing/services/${id}`),
  updateStatus: (id: number, status: string) => 
    client.patch(`/billing/${id}/status`, { status }),
  getReportsSummary: (range = 'month') => 
    client.get('/billing/reports/summary', { params: { range } }),
  getReportsDetailed: (range = 'month') => 
    client.get('/billing/reports/detailed', { params: { range } }),
  getServiceOccupancy: (id: number, date: string) => 
    client.get(`/billing/services/${id}/occupancy`, { params: { travel_date: date } }),
  processRefund: (invoiceId: number, data: {
    amount: number;
    reason: string;
    refund_type: 'online' | 'offline';
    cancellation_fee?: number;
    policy_terms?: string;
  }) => client.post(`/invoices/${invoiceId}/refund`, data),
};
