import client from './client';

export interface QuotationLineItem {
  service_id?: number | null;
  description: string;
  unit_price: number;
  quantity: number;
  amount: number;
}

export interface CreateQuotationLineItem {
  service_id?: number | null;
  description: string;
  unit_price: number;
  quantity: number;
}

export interface QuotationPricingContext {
  vehicle?: 'bus' | 'coaster';
  extra_days?: number;
  extra_hours?: number;
  adults?: number;
  children?: number;
}

export interface CreateSalesQuotationPayload {
  customer_id?: number | null;
  client_name: string;
  client_company?: string;
  client_address?: string;
  client_contact?: string;
  client_email?: string;
  client_tin?: string;
  service_id?: number | null;
  service_name?: string;
  category?: string;
  line_items?: CreateQuotationLineItem[];
  pricing_context?: QuotationPricingContext;
  description?: string;
  inclusions?: string;
  exclusions?: string;
  travel_date?: string | null;
  valid_days?: number;
  notes?: string;
}

export interface SalesQuotation {
  id: number;
  quotation_number: string;
  client_name: string;
  line_items: QuotationLineItem[];
  subtotal: string | number;
  vat_amount: string | number;
  total: string | number;
  vat_rate: string | number;
  valid_until: string;
  travel_date: string | null;
  preparer?: { first_name: string; last_name: string } | null;
}

export const salesQuotationApi = {
  create: (payload: CreateSalesQuotationPayload) =>
    client.post<{ success: boolean; data: SalesQuotation }>('/sales/quotations', payload).then((r) => r.data),
};
