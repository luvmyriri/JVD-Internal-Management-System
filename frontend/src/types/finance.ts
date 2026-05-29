export interface CollectionPayment {
  id: number;
  collection_id: number;
  payment_date: string;
  payment_method: string;
  amount: number;
  balance?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Collection {
  id: number;
  client_name: string;
  date: string;
  travel_date: string;
  pick_up?: string;
  drop_off?: string;
  rate?: number;
  customer_id?: number;
  status: 'open' | 'completed';
  payments?: CollectionPayment[];
  service_type?: string;
  other_service_type?: string;
  
  // Billing tracking fields
  invoice_id?: number;
  billing_amount?: number;
  paid_amount?: number;
  remaining_balance?: number;
  due_date?: string;
  collection_status?: 'pending' | 'partial' | 'overdue' | 'completed';
  remarks?: string;
  auto_generated?: boolean;
  invoice?: any;

  created_at?: string;
  updated_at?: string;
}
