import client from './client';

export interface Account {
  id: number;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  created_at?: string;
}

export interface LiquidationItem {
  id?: number;
  liquidation_id?: number;
  expense_category: 'Fuel' | 'Toll' | 'Meals' | 'Parts' | 'Other';
  amount: number;
  receipt_number?: string;
  status: 'pending' | 'approved' | 'rejected' | 'disputed';
  notes?: string;
  created_at?: string;
}

export interface Liquidation {
  id: number;
  trip_ticket_id: number;
  employee_id: number;
  status: 'pending' | 'under_review' | 'settled' | 'disputed';
  total_advanced: number;
  total_spent: number;
  total_returned: number;
  shortage_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: LiquidationItem[];
  trip_ticket?: {
    id: number;
    control_no: string;
    route?: string;
    trip_date?: string;
    bus?: {
      id: number;
      plate_number: string;
    };
  };
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
    email: string;
    role: string;
  };
}

export interface EmployeeSoa {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  email: string;
  role: string;
  total_advanced: number;
  total_spent: number;
  total_returned: number;
  shortage_amount: number;
  liquidations_count: number;
  liquidations: Liquidation[];
}

export const accountingApi = {
  getAccounts: () => 
    client.get<{ success: boolean; data: Account[] }>('/accounts').then((res) => res.data),
  
  getLiquidations: () => 
    client.get<{ success: boolean; data: Liquidation[] }>('/liquidations').then((res) => res.data),
  
  getLiquidation: (id: number) => 
    client.get<{ success: boolean; data: Liquidation }>(`/liquidations/${id}`).then((res) => res.data),
  
  settleLiquidation: (id: number, data: {
    items: Partial<LiquidationItem>[];
    total_returned: number;
    notes?: string;
  }) => 
    client.post<{ success: boolean; data: Liquidation }>(`/liquidations/${id}/settle`, data).then((res) => res.data),
  
  getEmployeeSoa: () => 
    client.get<{ success: boolean; data: EmployeeSoa[] }>('/accounting/employee-soa').then((res) => res.data),
};
