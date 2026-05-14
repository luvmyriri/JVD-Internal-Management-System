export interface Driver {
  id: number;
  first_name: string;
  last_name: string;
}

export interface Bus {
  id: number;
  plate_number: string;
  model: string;
  seating_capacity: number;
  status: 'available' | 'in_service' | 'under_maintenance' | 'decommissioned';
  total_mileage: number;
  last_service_date: string | null;
  next_service_due: string | null;
  is_service_overdue: boolean;
  driver?: Driver | null;
  created_at: string;
  updated_at: string;
}

export interface BusFormData {
  plate_number: string;
  model: string;
  seating_capacity: number;
  status: 'available' | 'in_service' | 'under_maintenance' | 'decommissioned';
  total_mileage: number;
  last_service_date?: string;
  next_service_due?: string;
  assigned_driver?: number | null;
}

export interface InventoryItem {
  id: number;
  item_name: string;
  category: string;
  quantity: number;
  reorder_level: number;
  unit: string;
  unit_cost: number;
  total_value: number;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItemFormData {
  item_name: string;
  category: string;
  quantity: number;
  reorder_level: number;
  unit: string;
  unit_cost: number;
}
