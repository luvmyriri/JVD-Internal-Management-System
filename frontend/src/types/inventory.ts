export interface Driver {
  id: number;
  first_name: string;
  last_name: string;
}

export interface Bus {
  id: number;
  plate_number: string;
  model: string;
  bus_category?: 'LUXURY' | 'VIP' | 'ECONOMY';
  chassis_number?: string;
  engine_number?: string;
  year?: number;
  color?: string;
  body_type?: string;
  fuel_type?: string;
  seating_capacity: number;
  status: 'available' | 'in_service' | 'under_maintenance' | 'decommissioned';
  total_mileage: number;
  last_service_date: string | null;
  next_service_due: string | null;
  is_service_overdue: boolean;
  driver?: Driver | null;
  custom_seats?: any[] | null;
  created_at: string;
  updated_at: string;
}

// ── Bus Profiling Types (boss requirements) ──────────────────────────────────
export interface BusDocument {
  id: number;
  type: 'or_cr' | 'lto_registration' | 'insurance' | 'franchise' | 'inspection' | 'other';
  label: string;
  issue_date: string;
  expiry_date: string;
  file_url?: string;
  status: 'valid' | 'expiring_soon' | 'expired';
}

export interface MaintenanceRecord {
  id: number;
  pms_type: string;          // 'First PMS' | 'PMS 1' … 'PMS 4'
  service_date: string;
  mileage_at_service: number;
  performed_by: string;
  cost: number;
  parts_replaced: string[];
  notes: string;
}

export interface MileageLog {
  id: number;
  log_date: string;
  mileage: number;
  trip_description?: string;
  logged_by?: string;
}

export interface ConsumptionRecord {
  id: number;
  record_date: string;
  category: 'engine_oil' | 'fuel' | 'tire' | 'brake_parts' | 'filters' | 'grease' | 'other';
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  notes?: string;
}

export interface BusProfile {
  bus: Bus;
  documents: BusDocument[];
  maintenance_history: MaintenanceRecord[];
  mileage_logs: MileageLog[];
  consumption_records: ConsumptionRecord[];
}

export interface BusFormData {
  plate_number: string;
  model: string;
  bus_category?: 'LUXURY' | 'VIP' | 'ECONOMY';
  seating_capacity: number;
  status: 'available' | 'in_service' | 'under_maintenance' | 'decommissioned';
  total_mileage: number;
  last_service_date?: string;
  next_service_due?: string;
  assigned_driver?: number | null;
  custom_seats?: any[] | null;
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
