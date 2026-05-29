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
  created_at?: string;
  updated_at?: string;
}
