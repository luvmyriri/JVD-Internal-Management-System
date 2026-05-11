// ──────────────────────────────────────────
// Role Constants
// ──────────────────────────────────────────

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  HUMAN_RESOURCE: 'human_resource',
  ACCOUNTING: 'accounting',
  AGENT: 'agent',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin (CEO)',
  admin: 'Admin',
  human_resource: 'Human Resource',
  accounting: 'Accounting',
  agent: 'Agent / Staff',
};

// ──────────────────────────────────────────
// Status Constants
// ──────────────────────────────────────────

export const PO_STATUS = {
  DRAFT: 'draft',
  PENDING_ACCOUNTING: 'pending_accounting_review',
  PENDING_CEO: 'pending_ceo_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const PO_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_accounting_review: 'Pending Accounting Review',
  pending_ceo_approval: 'Pending CEO Approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const JO_STATUS = {
  CREATED: 'created',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const JO_STATUS_LABELS: Record<string, string> = {
  created: 'Created',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const WO_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export const WO_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export const WO_PRIORITY = {
  ROUTINE: 'routine',
  URGENT: 'urgent',
  CRITICAL: 'critical',
} as const;

export const WO_PRIORITY_LABELS: Record<string, string> = {
  routine: 'Routine',
  urgent: 'Urgent',
  critical: 'Critical',
};

export const PASSPORT_CASE_STATUS = {
  REQUIREMENTS_GATHERING: 'requirements_gathering',
  DOCUMENTS_COMPLETE: 'documents_complete',
  SUBMITTED: 'submitted_for_processing',
  PROCESSING: 'processing',
  DENIED: 'denied',
  READY_FOR_RELEASE: 'ready_for_release',
  RELEASED: 'released',
} as const;

export const BUS_STATUS = {
  AVAILABLE: 'available',
  IN_SERVICE: 'in_service',
  UNDER_MAINTENANCE: 'under_maintenance',
  DECOMMISSIONED: 'decommissioned',
} as const;

export const SERVICE_TYPES = {
  BUS_RENTAL: 'bus_rental',
  FIELD_TRIP: 'field_trip',
  CORPORATE_TRANSPORT: 'corporate_transport',
  TRAVEL_PACKAGE: 'travel_package',
  EVENT: 'event',
} as const;

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  bus_rental: 'Bus Rental',
  field_trip: 'Field Trip',
  corporate_transport: 'Corporate Transport',
  travel_package: 'Travel Package',
  event: 'Event',
};

// ──────────────────────────────────────────
// App Config
// ──────────────────────────────────────────

export const APP_CONFIG = {
  APP_NAME: 'JVD Management System',
  SESSION_TIMEOUT_MINUTES: 30,
  MAX_SESSION_HOURS: 8,
  ITEMS_PER_PAGE: 20,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 15,
} as const;
