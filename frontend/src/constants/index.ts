export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  EXECUTIVE_VICE_PRESIDENT: 'executive_vice_president',
  OPERATIONS_MANAGER: 'operations_manager',
  RESERVATION_OFFICER: 'reservation_officer',
  OFFICE_STAFF: 'office_staff',
  ACCOUNTING_EXECUTIVE: 'accounting_executive',
  CORPORATE_SECRETARY: 'corporate_secretary',
  LOGISTICS_IN_CHARGE: 'logistics_in_charge',
  DISPATCHER: 'dispatcher',
  PURCHASING_MANAGER: 'purchasing_manager',
  SERVICE_ADVISER: 'service_adviser',
  HEAD_MECHANIC: 'head_mechanic',
  DRIVER: 'driver',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin (CEO)',
  executive_vice_president: 'Executive Vice President',
  operations_manager: 'Operations Manager',
  reservation_officer: 'Reservation Officer',
  office_staff: 'Office Staff',
  accounting_executive: 'Accounting Executive',
  corporate_secretary: 'Corporate Secretary',
  logistics_in_charge: 'Logistics in Charge',
  dispatcher: 'Booking Officer/Dispatcher',
  purchasing_manager: 'Purchasing Manager',
  service_adviser: 'Service Adviser',
  head_mechanic: 'Head Mechanic',
  driver: 'Coach Captain (Driver)',
};

// ──────────────────────────────────────────
// Status Constants
// ──────────────────────────────────────────

export const PO_STATUS = {
  DRAFT: 'draft',
  PENDING_ACCOUNTING: 'pending_accounting_review',
  VERIFIED: 'verified',
  PENDING_CEO: 'pending_ceo_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const PO_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_accounting_review: 'Pending Accounting',
  verified: 'Verified',
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
  PENDING_APPROVAL: 'pending_approval',
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const WO_STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Pending Approval',
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
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

export const SUPPLIER_ACCREDITATION_STATUS = {
  PENDING: 'pending',
  ACCREDITED: 'accredited',
  SUSPENDED: 'suspended',
  BLACKLISTED: 'blacklisted',
} as const;

export const SUPPLIER_ACCREDITATION_LABELS: Record<string, string> = {
  pending: 'Pending',
  accredited: 'Accredited',
  suspended: 'Suspended',
  blacklisted: 'Blacklisted',
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
