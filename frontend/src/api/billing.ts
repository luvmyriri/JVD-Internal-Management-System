import client from './client';

export interface Service {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  is_active: boolean;
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
  payment_method: string;
  status: string;
  notes?: string;
  created_at: string;
  customer?: any;
  items?: InvoiceItem[];
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
    items: { service_id: number; quantity: number }[];
    notes?: string;
  }) => client.post('/billing', data),
  createService: (data: {
    name: string;
    category: string;
    price: number;
    description: string;
  }) => client.post('/billing/services', data),
  updateStatus: (id: number, status: string) => 
    client.patch(`/billing/${id}/status`, { status }),
  getReportsSummary: (range = 'month') => 
    client.get('/billing/reports/summary', { params: { range } }),
  getReportsDetailed: (range = 'month') => 
    client.get('/billing/reports/detailed', { params: { range } }),
};
