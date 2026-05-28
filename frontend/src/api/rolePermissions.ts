import client from './client';
import type { UserRole } from '../types/auth';

export interface ModulePermission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

/** Map of all keys (module or module.page) → permissions */
export type PermissionsMap = Record<string, ModulePermission>;

/** Pages within a module: { 'module.page_key': 'Display Label' } */
export type PagesMap = Record<string, Record<string, string>>;

export interface RolePermissionMeta {
  modules: Record<string, string>;   // { 'accounting': 'Accounting', ... }
  pages: PagesMap;                   // { 'accounting': { 'accounting.pos': 'POS', ... } }
  roles: string[];
  all_keys: string[];
}

export interface RolePermissionConfig {
  role: UserRole;
  permissions: PermissionsMap;
}

export const rolePermissionsApi = {
  // Get all roles and their current permissions (module + page level)
  index: () => client.get<{
    success: boolean;
    data: Record<string, PermissionsMap>;
    meta: RolePermissionMeta;
  }>('/role-permissions'),

  // Get permissions for a specific role
  show: (role: UserRole) => client.get<{
    success: boolean;
    data: PermissionsMap;
    meta: RolePermissionMeta & { role: string };
  }>(`/role-permissions/${role}`),

  // Update permissions for a specific role (accepts module + page keys)
  update: (role: UserRole, permissions: PermissionsMap) =>
    client.put<{ success: boolean; data: PermissionsMap; message: string }>(
      `/role-permissions/${role}`,
      { permissions }
    ),

  // Reset a role to default permissions
  reset: (role: UserRole) =>
    client.post<{ success: boolean; data: PermissionsMap; message: string }>(
      `/role-permissions/${role}/reset`
    ),
};
