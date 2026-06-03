export interface CommissionItem {
  id: number;
  commission_id: number;
  travel_date: string;
  destination: string;
  quantity: number;
  amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface Commission {
  id: number;
  commissioner_name: string;
  serial_no: string;
  date: string;
  status: 'draft' | 'approved' | 'released';
  received_by?: number;
  released_by?: number;
  approved_by?: number;
  items?: CommissionItem[];
  created_at?: string;
  updated_at?: string;
  
  receivedBy?: { id: number; name: string };
  releasedBy?: { id: number; name: string };
  approvedBy?: { id: number; name: string };
}

export interface TripTicket {
  id: number;
  control_no: string;
  issue_date: string;
  date_of_travel: string;
  duration?: string;
  pick_up: string;
  drop_off: string;
  bus_id?: number;
  plate_no?: string;
  no_of_passengers: number;
  driver_id?: number;
  
  meal_allowance?: number;
  diesel?: number;
  sop?: number;
  easy_trip?: number;
  autosweep?: number;
  
  fuel_consumed?: number;
  fuel_gauge_before?: string;
  fuel_gauge_after?: string;
  odometer_reading?: number;
  
  passenger_rating?: 'outstanding' | 'satisfactory' | 'needs_improvement' | 'poor';
  passenger_name?: string;
  
  status: 'draft' | 'approved' | 'completed';
  requested_by?: number;
  approved_by?: number;
  
  created_at?: string;
  updated_at?: string;
  
  bus?: { id: number; plate_number: string };
  driver?: { id: number; name: string };
  requestedBy?: { id: number; name: string };
  approvedBy?: { id: number; name: string };
  cash_budget_request?: CashBudgetRequest;
  work_orders?: Array<{
    id: number;
    wo_number: string;
    status: 'pending_approval' | 'verified' | 'open' | 'in_progress' | 'completed' | 'cancelled';
    priority: string;
    description: string;
    job_orders?: Array<{
      id: number;
      jo_number: string;
      status: 'created' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    }>;
  }>;
}

export interface CashBudgetRequest {
  id: number;
  date: string;
  travel_date?: string;
  plate_number?: string;
  destination?: string;
  purchase_order_id?: number;
  trip_ticket_id?: number;
  
  diesel?: number;
  meal_allowance?: number;
  sop?: number;
  autosweep?: number;
  easytrip?: number;
  coach_captain_salary?: number;
  spare_driver_salary?: number;
  
  total_amount?: number;
  disbursed_amount?: number;
  status: 'draft' | 'pending_accounting' | 'approved' | 'disbursed';
  
  prepared_by: number;
  approved_by?: number;
  disbursed_by?: number;
  
  created_at?: string;
  updated_at?: string;
  
  preparedBy?: { id: number; name: string; first_name?: string; last_name?: string };
  approvedBy?: { id: number; name: string };
  disbursedBy?: { id: number; name: string };
  purchaseOrder?: {
    id: number;
    po_number: string;
    total_amount: number;
    lineItems?: Array<{
      id: number;
      item_name: string;
      description?: string;
      quantity: number;
      unit_price: number;
    }>;
  };
  tripTicket?: TripTicket;
  invoice?: {
    id: number;
    invoice_number: string;
    status: string;
    total_amount: number;
    created_at?: string;
  };
}

