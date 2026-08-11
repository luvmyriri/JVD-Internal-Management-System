import client from './client';

export type SalesOrderStatus = 'draft' | 'quoted' | 'awaiting_payment' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface SalesOrderItem {
  id: number;
  line_number: number;
  service_type: string;
  status: string;
  title: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  traveler_count?: number | null;
  service?: { id: number; name: string };
  fulfillment?: Record<string, unknown>;
  details_snapshot?: Record<string, unknown> | null;
}

export interface SalesOrder {
  id: number;
  order_number: string;
  status: SalesOrderStatus;
  customer_id?: number | null;
  invoice_id?: number | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  travel_starts_at?: string | null;
  travel_ends_at?: string | null;
  notes?: string | null;
  customer?: { id: number; first_name: string; middle_name?: string; last_name: string; email?: string; phone?: string };
  invoice?: {
    id: number;
    invoice_number: string;
    status: string;
    payment_url?: string | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_contact?: string | null;
    customer_address?: string | null;
    contract?: { id: number; contract_number: string; status: string } | null;
    trip_tickets?: Array<{
      id: number;
      control_no: string;
      status: string;
      date_of_travel?: string | null;
      pick_up?: string | null;
      drop_off?: string | null;
      no_of_passengers?: number | null;
      bus?: { id: number; plate_number: string; model?: string | null } | null;
      driver?: { id: number; first_name: string; last_name: string } | null;
    }>;
  };
  items: SalesOrderItem[];
}

export interface SalesServiceDetails {
  service: Record<string, any> & { id: number; name: string; description?: string | null; service_type?: string | null; price?: number };
  transactions: Array<{
    id: number;
    service_type: string;
    title: string;
    status: string;
    traveler_count?: number | null;
    scheduled_start?: string | null;
    scheduled_end?: string | null;
    total_amount: number;
    order: SalesOrder;
    fulfillment?: Record<string, unknown> | null;
  }>;
}

export const salesOrderApi = {
  list: (params?: Record<string, unknown>) => client.get('/sales/orders', { params }).then(r => r.data.data),
  get: (id: number) => client.get(`/sales/orders/${id}`).then(r => r.data.data as SalesOrder),
  getByInvoice: (invoiceId: number) => client.get(`/sales/transactions/invoices/${invoiceId}`).then(r => r.data.data as SalesOrder),
  getServiceDetails: (serviceId: number) => client.get(`/sales/services/${serviceId}/details`).then(r => r.data.data as SalesServiceDetails),
  getDocument: (orderId: number, document: SalesDocumentType) =>
    client.get(`/sales/orders/${orderId}/documents/${document}`, { responseType: 'blob' }).then(r => r.data as Blob),
  create: (data: Record<string, unknown>) => client.post('/sales/orders', data).then(r => r.data.data as SalesOrder),
  addItem: (id: number, data: Record<string, unknown>) => client.post(`/sales/orders/${id}/items`, data).then(r => r.data.data),
  removeItem: (orderId: number, itemId: number) => client.delete(`/sales/orders/${orderId}/items/${itemId}`),
  quote: (id: number) => client.post(`/sales/orders/${id}/quote`).then(r => r.data.data as SalesOrder),
  confirm: (id: number, data: Record<string, unknown>) => client.post(`/sales/orders/${id}/confirm`, data).then(r => r.data.data as SalesOrder),
  requestAdjustment: (id: number, data: Record<string, unknown>) => client.post(`/sales/orders/${id}/adjustments`, data).then(r => r.data.data),
};

export type SalesDocumentType = 'invoice' | 'manifest' | 'quotation' | 'contract' | 'joiner-manifest' | 'charter-confirmation' | 'charter-dispatch' | 'educational-manifest';
