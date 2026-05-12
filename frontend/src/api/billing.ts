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
  getInvoices: (page = 1) => client.get(`/billing?page=${page}`),
  getInvoice: (id: number) => client.get(`/billing/${id}`),
  createInvoice: (data: {
    customer_id?: number | null;
    customer_name?: string;
    payment_method: string;
    items: { service_id: number; quantity: number }[];
    notes?: string;
  }) => client.post('/billing', data),
};
