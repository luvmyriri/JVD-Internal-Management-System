import client from './client';

export type TransactionKind = 'sales' | 'cash_budget_disbursement';
export type TransactionEngine = 'fixed_package' | 'joiner' | 'charter' | 'educational' | 'custom' | 'cash_budget';

export interface TransactionNavigationTarget {
  path: string;
  route?: string | null;
  params?: Record<string, string | number | null>;
}

export interface TransactionDocumentNavigation {
  route: string;
  path_template: string;
  params: { order_id: number };
  available: string[];
}

export interface TransactionProductItem {
  id: number;
  service_id?: number | null;
  name: string;
  service_type?: string | null;
  description?: string | null;
  quantity: number;
  unit_amount?: number;
  total_amount: number;
  operational_summary?: Record<string, unknown> | null;
}

export interface TransactionProduct {
  primary_name: string;
  item_count: number;
  service_types: string[];
  items: TransactionProductItem[];
}

export interface TransactionBooking {
  type: string;
  id: number;
  reference?: string | null;
  status?: string | null;
  parent_id?: number | null;
  parent_reference?: string | null;
  product_id?: number | null;
  context?: Record<string, unknown> | null;
}

export interface TransactionMoney {
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  gross_collected: number;
  net_collected: number;
  credited: number;
  refunded: number;
  balance: number;
  payment_state: string;
  payment_type?: string | null;
  payment_methods: string[];
  due_date?: string | null;
  evidence_source?: string | null;
}

export interface TransactionCollectionSummary {
  id: number;
  status: string;
  is_overdue: boolean;
}

export interface TransactionContractSummary {
  required: boolean;
  gate_status?: string | null;
  id?: number | null;
  number?: string | null;
  status?: string | null;
}

export interface TransactionSchedule {
  starts_at?: string | null;
  ends_at?: string | null;
  travel_date?: string | null;
  traveler_count?: number | null;
}

export interface TransactionRefundSummary {
  count: number;
  latest_status?: string | null;
  available_amount: number;
}

export interface TransactionDocumentAvailability {
  invoice: boolean;
  quotation: boolean;
  manifest: boolean;
  contract: boolean;
  joiner_manifest: boolean;
  charter_confirmation: boolean;
  charter_dispatch: boolean;
  educational_manifest: boolean;
}

export interface TransactionPayment {
  id: number;
  date?: string | null;
  method: string;
  amount: number;
  balance_after?: number | null;
  paymongo_payment_id?: string | null;
  created_at?: string | null;
}

export interface TransactionPassenger {
  id?: number | string;
  source?: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  type?: string | null;
  seat_code?: string | null;
  date_of_birth?: string | null;
  passport_number?: string | null;
  emergency_contact?: string | null;
  dietary_restrictions?: string | null;
  special_needs?: string | null;
}

export interface TransactionCredit {
  id: number;
  number?: string | null;
  amount: number;
  status: string;
  reason?: string | null;
  issued_at?: string | null;
  posted_at?: string | null;
}

export interface TransactionRefund {
  id: number;
  number?: string | null;
  credit_note_id?: number | null;
  amount: number;
  status: string;
  method?: string | null;
  reason?: string | null;
  provider_refund_id?: string | null;
  provider_status?: string | null;
  approved_at?: string | null;
  processed_at?: string | null;
  created_at?: string | null;
}

export interface TransactionTripTicket {
  id: number;
  control_no: string;
  status: string;
  date_of_travel?: string | null;
  pick_up?: string | null;
  drop_off?: string | null;
  no_of_passengers?: number | null;
  sales_order_item_id?: number | null;
  assignment_index?: number;
  duration?: string | null;
  vehicle?: { id?: number; plate_number: string; model?: string | null; capacity?: number | null } | null;
  driver?: { id?: number; name: string; phone?: string | null; email?: string | null } | null;
}

export interface TransactionDetailedBookingContext extends TransactionBooking {
  details?: Record<string, unknown> | null;
}

export interface TransactionItemDetail {
  id: number;
  line_number?: number | null;
  service_id?: number | null;
  service_type?: string | null;
  title: string;
  description?: string | null;
  status?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax?: number | null;
  total: number;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  traveler_count?: number | null;
  fulfillment?: { type?: string | null; id?: number | null } | null;
  operational_summary?: Record<string, unknown> | null;
}

export interface TransactionPaymentScheduleItem {
  id: number;
  installment_number: number;
  due_date?: string | null;
  amount_due: number;
  status: string;
  notes?: string | null;
}

export interface TransactionItineraryDay {
  id: number;
  day_number: number;
  date?: string | null;
  location?: string | null;
  activity?: string | null;
  meal_plan?: string | null;
  accommodation?: string | null;
}

export interface TransactionRecord {
  /** Invoice identity; this is the canonical transaction route key. */
  id: number;
  transaction_number: string;
  kind: TransactionKind;
  payment_state: 'unpaid' | 'partial' | 'paid' | 'refunded' | 'overdue' | string;
  identifiers: {
    transaction_id: string;
    invoice_id: number;
    invoice_number: string;
    sales_order_id?: number | null;
    order_number?: string | null;
    collection_id?: number | null;
    customer_id?: number | null;
    booking_type?: string | null;
    booking_id?: number | null;
    booking_reference?: string | null;
  };
  invoice: { id: number; number: string; status: string };
  order?: { id: number; number: string; status: string } | null;
  customer: {
    id?: number | null;
    name: string;
    email?: string | null;
    contact?: string | null;
  };
  product: TransactionProduct;
  booking?: TransactionBooking | null;
  money: TransactionMoney;
  collection?: TransactionCollectionSummary | null;
  contract: TransactionContractSummary;
  schedule: TransactionSchedule;
  refund: TransactionRefundSummary;
  documents: TransactionDocumentAvailability;
  navigation: {
    transaction?: TransactionNavigationTarget | null;
    billing?: TransactionNavigationTarget | null;
    collection?: TransactionNavigationTarget | null;
    customer?: TransactionNavigationTarget | null;
    engine?: TransactionNavigationTarget | null;
    product?: TransactionNavigationTarget | null;
    documents?: TransactionDocumentNavigation | null;
  };
  created_at: string;
  updated_at?: string;
  payments?: TransactionPayment[];
  provider?: { invoice_payment_id?: string | null } | null;
  credits?: TransactionCredit[];
  refunds?: TransactionRefund[];
  passengers?: TransactionPassenger[];
  trip_tickets?: TransactionTripTicket[];
  booking_contexts?: TransactionDetailedBookingContext[];
  items_detail?: TransactionItemDetail[];
  payment_schedule?: TransactionPaymentScheduleItem[];
  itinerary?: TransactionItineraryDay[];
  notes?: string | null;
  created_by?: { id: number; name: string; email?: string | null } | null;
}

export interface TransactionListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
}

export interface TransactionStats {
  transaction_count: number;
  total_billed: number;
  gross_collected: number;
  net_collected: number;
  outstanding: number;
  credited: number;
  refunded: number;
  status_counts?: Record<string, number>;
}

export interface TransactionListResponse {
  success: boolean;
  data: TransactionRecord[];
  meta: TransactionListMeta;
  stats: TransactionStats;
}

export interface TransactionListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  payment_state?: string;
  service_type?: string;
  payment_method?: string;
  payment_type?: string;
  collection_status?: string;
  contract_status?: string;
  date_from?: string;
  date_to?: string;
  kind?: 'sales' | 'cash_budget_disbursement' | 'all';
}

export const transactionsApi = {
  list: (params: TransactionListParams) =>
    client.get<TransactionListResponse>('/transactions', { params }).then((response) => response.data),
  get: (invoiceId: number) =>
    client.get<{ success: boolean; data: TransactionRecord }>(`/transactions/${invoiceId}`).then((response) => response.data.data),
};
