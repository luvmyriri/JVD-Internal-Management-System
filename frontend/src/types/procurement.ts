// ──────────────────────────────────────────
// Shared API Types
// ──────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

// ──────────────────────────────────────────
// Procurement Types
// ──────────────────────────────────────────

export type POStatus =
  | 'draft'
  | 'pending_accounting_review'
  | 'verified'
  | 'pending_ceo_approval'
  | 'approved'
  | 'rejected';

export interface POLineItem {
  id: number;
  purchase_order_id?: number;
  item_name: string;
  part_number: string | null;     // boss-mandated: cross-check field
  description: string | null;
  quantity: number;
  unit_of_measure: string;        // e.g. 'pcs', 'ltr', 'set'
  unit_price: number;
  total_price: number;
  receipt_number: string | null;  // boss-mandated: audit trail
  item_notes: string | null;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier?: Supplier;
  created_by: number;
  verified_by: number | null;
  approved_by: number | null;
  status: POStatus;
  total_amount: number;
  rejection_notes: string | null;
  approved_at: string | null;
  line_items: POLineItem[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderFormData {
  supplier_id: number;
  items: {
    item_name: string;
    part_number?: string;
    description?: string;
    quantity: number;
    unit_of_measure?: string;
    unit_price: number;
    receipt_number?: string;
    item_notes?: string;
  }[];
  notes?: string;
}

export type JOStatus =
  | 'created'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type ServiceType =
  | 'bus_rental'
  | 'field_trip'
  | 'corporate_transport'
  | 'travel_package'
  | 'event'
  | 'maintenance';

export interface JobOrder {
  id: number;
  jo_number: string;
  customer_id: number;
  customer?: Customer;
  bus_id: number | null;
  bus?: Bus;
  created_by: number;
  service_type: ServiceType;
  status: JOStatus;
  service_date: string;
  destination: string;
  total_cost: number;
  notes: string | null;
  passengers: Passenger[];
  purchase_order_id?: number | null;
  driver_id?: number | null;
  driver?: { id: number; first_name: string; last_name: string } | null;
  trip_ticket?: { id: number; ticket_number: string; status: string } | null;
  purchase_order?: { id: number; po_number: string; status: string } | null;
  work_order?: { id: number; wo_number: string; status: string } | null;
  items?: JobOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface JobOrderItem {
  id: number;
  item_no?: string | null;
  item_description: string;
  quantity: number;
  unit_cost: number;
  amount: number;
}

export interface JobOrderFormData {
  customer_id: number | null;
  bus_id?: number;
  service_type: ServiceType;
  service_date: string;
  destination: string | null;
  total_cost: number;
  notes?: string;
  passenger_ids?: number[];
  items?: {
    item_no?: string;
    item_description: string;
    quantity: number;
    unit_cost: number;
  }[];
}

export type WOStatus =
  | 'pending_validation'
  | 'pending_approval'
  | 'verified'
  | 'open'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type WOPriority =
  | 'routine'
  | 'urgent'
  | 'critical';

export interface WorkOrder {
  id: number;
  wo_number: string;
  bus_id: number;
  bus?: Bus;
  assigned_to: number;
  assignee?: { id: number; first_name: string; last_name: string };
  created_by: number;
  approved_by: number | null;
  approved_at: string | null;
  approval_notes: string | null;
  approver?: { id: number; first_name: string; last_name: string } | null;
  status: WOStatus;
  priority: WOPriority;
  description: string;
  parts_used: string | null;
  cost: number;
  auto_generated: boolean;
  type?: 'maintenance' | 'trip';
  trip_ticket_id?: number | null;
  invoice_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderFormData {
  bus_id: number;
  assigned_to: number;
  priority: WOPriority;
  description: string;
  parts_used?: string;
  cost?: number;
  is_override?: boolean;
}

// ──────────────────────────────────────────
// Supplier Types
// ──────────────────────────────────────────

export type SupplierAccreditationStatus =
  | 'pending'
  | 'accredited'
  | 'suspended'
  | 'blacklisted';

export interface Supplier {
  id: number;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_verified: boolean;
  verified_at: string | null;
  verified_by: number | null;
  accreditation_status: SupplierAccreditationStatus;
  payment_terms: string | null;
  is_consignment: boolean;
  bank_name: string | null;
  bank_account_number: string | null;
  tin_number: string | null;
  purchase_orders_count?: number;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────
// Fleet / Bus Types
// ──────────────────────────────────────────

export type BusStatus =
  | 'available'
  | 'in_service'
  | 'under_maintenance'
  | 'decommissioned';

export interface Bus {
  id: number;
  plate_number: string;
  model: string;
  bus_category?: 'LUXURY' | 'VIP' | 'ECONOMY';
  seating_capacity: number;
  status: BusStatus;
  total_mileage: number;
  last_service_date: string | null;
  next_service_due: string | null;
  assigned_driver: number | null;
}

// ──────────────────────────────────────────
// Customer / Passenger Types
// ──────────────────────────────────────────

export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string | null;
}

export interface Passenger {
  id: number;
  customer_id: number;
  first_name: string;
  last_name: string;
  birth_date: string;
  passport_no: string;
  contact_no: string;
  checklist_status: Record<string, boolean>;
}

// ──────────────────────────────────────────
// Passport / Visa Types
// ──────────────────────────────────────────

export type PassportCaseType = 'passport' | 'visa';

export type PassportCaseStatus =
  | 'requirements_gathering'
  | 'documents_complete'
  | 'submitted_for_processing'
  | 'processing'
  | 'denied'
  | 'ready_for_release'
  | 'released';

export interface PassportCase {
  id: number;
  customer_id: number;
  passenger_id: number;
  handled_by: number;
  case_type: PassportCaseType;
  status: PassportCaseStatus;
  checklist: Record<string, boolean>;
  reference_number: string | null;
  submitted_date: string | null;
  release_date: string | null;
}

// ──────────────────────────────────────────
// Accreditation Types
// ──────────────────────────────────────────

export type AccreditationEntityType = 'company' | 'driver' | 'bus';

export type AccreditationStatus =
  | 'active'
  | 'expired'
  | 'pending_renewal';

export interface Accreditation {
  id: number;
  entity_type: AccreditationEntityType;
  entity_id: number;
  accreditation_type: string;
  issuing_body: string;
  issue_date: string;
  expiry_date: string;
  status: AccreditationStatus;
  document_url: string | null;
}

// ──────────────────────────────────────────
// Inventory Types
// ──────────────────────────────────────────

export interface InventoryItem {
  id: number;
  item_name: string;
  category: string;
  quantity: number;
  reorder_level: number;
  unit: string;
  unit_cost: number;
}

// ──────────────────────────────────────────
// Audit Log Types
// ──────────────────────────────────────────

export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  module: string;
  entity_type: string;
  entity_id: number;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string;
  created_at: string;
}
