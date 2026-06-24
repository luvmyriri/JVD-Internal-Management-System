// ──────────────────────────────────────────
// Auth Types
// ──────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TwoFactorRequest {
  user_id: number;
  code: string;
}

export interface ConfirmTwoFactorRequest extends TwoFactorRequest {
  secret: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
    requires_2fa: boolean;
    requires_2fa_setup?: boolean;
    requires_password_change: boolean;
    permissions?: RolePermissions;
    setup_data?: {
      qr_code_url: string;
      secret: string;
    };
  };
  message: string;
}

export interface SetupTwoFactorResponse {
  success: boolean;
  data: {
    qr_code_url: string;
    secret: string;
  };
}

// ──────────────────────────────────────────
// User / Account Types
// ──────────────────────────────────────────

export type UserRole =
  | 'super_admin'
  | 'executive_vice_president'
  | 'operations_manager'
  | 'reservation_officer'
  | 'office_staff'
  | 'accounting_executive'
  | 'corporate_secretary'
  | 'logistics_in_charge'
  | 'dispatcher'
  | 'purchasing_manager'
  | 'service_adviser'
  | 'head_mechanic'
  | 'driver';


export interface User {
  id: number;
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  role: UserRole;
  department: string;
  is_active: boolean;
  is_online?: boolean;
  custom_permissions?: {
    [module: string]: {
      can_view?: boolean;
      can_create?: boolean;
      can_edit?: boolean;
      can_delete?: boolean;
    };
  } | null;
  effective_permissions?: RolePermissions;
  tags?: string[];
  must_change_password: boolean;
  last_login: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface RolePermissions {
  [module: string]: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}
