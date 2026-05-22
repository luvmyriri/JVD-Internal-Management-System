import client from './client';
import type { UserRole } from '../types/auth';

export interface ModulePermission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface RolePermissionConfig {
  role: UserRole;
  permissions: Record<string, ModulePermission>;
}

export const rolePermissionsApi = {
  // Get all roles and their current permissions
  index: () => client.get('/role-permissions'),
  
  // Get permissions for a specific role
  show: (role: UserRole) => client.get(`/role-permissions/${role}`),
  
  // Update permissions for a specific role
  update: (role: UserRole, permissions: Record<string, ModulePermission>) =>
    client.put(`/role-permissions/${role}`, { permissions }),
    
  // Reset a role to default permissions
  reset: (role: UserRole) => client.post(`/role-permissions/${role}/reset`),
};
