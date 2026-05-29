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
  creator?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface InvoiceItem {
  service_id: number;
  quantity: number;
  unit_price?: number;
  total_price?: number;
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
  created_at: string;
  customer?: any;
  items?: InvoiceItem[];
  collection?: any;
}

export const billingApi = {
  getServices: () => client.get('/billing/services'),
  getInvoices: (params: { page?: number; search?: string; status?: string }) => 
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
    items: { service_id: number; quantity: number }[];
    notes?: string;
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
  }) => client.put(`/billing/services/${id}`, data),
  deleteService: (id: number) => client.delete(`/billing/services/${id}`),
  updateStatus: (id: number, status: string) => 
    client.patch(`/billing/${id}/status`, { status }),
  getReportsSummary: (range = 'month') => 
    client.get('/billing/reports/summary', { params: { range } }),
  getReportsDetailed: (range = 'month') => 
    client.get('/billing/reports/detailed', { params: { range } }),
};
