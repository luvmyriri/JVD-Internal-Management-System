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
  invoice?: { id: number; invoice_number: string; status: string; payment_url?: string | null };
  items: SalesOrderItem[];
}

export const salesOrderApi = {
  list: (params?: Record<string, unknown>) => client.get('/sales/orders', { params }).then(r => r.data.data),
  get: (id: number) => client.get(`/sales/orders/${id}`).then(r => r.data.data as SalesOrder),
  create: (data: Record<string, unknown>) => client.post('/sales/orders', data).then(r => r.data.data as SalesOrder),
  addItem: (id: number, data: Record<string, unknown>) => client.post(`/sales/orders/${id}/items`, data).then(r => r.data.data),
  removeItem: (orderId: number, itemId: number) => client.delete(`/sales/orders/${orderId}/items/${itemId}`),
  quote: (id: number) => client.post(`/sales/orders/${id}/quote`).then(r => r.data.data as SalesOrder),
  confirm: (id: number, data: Record<string, unknown>) => client.post(`/sales/orders/${id}/confirm`, data).then(r => r.data.data as SalesOrder),
  requestAdjustment: (id: number, data: Record<string, unknown>) => client.post(`/sales/orders/${id}/adjustments`, data).then(r => r.data.data),
};
