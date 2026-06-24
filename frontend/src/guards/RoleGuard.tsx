import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';

interface RoleGuardProps {
  roles: UserRole[];
  /**
   * Optional module key (e.g. 'hr', 'accounting.billing') to check via
   * hasPermission() in addition to the hardcoded role list. When provided,
   * a user who has been granted this module permission via custom_permissions
   * or the role_permissions table will also pass the guard — even if their
   * role is not in the `roles` array.
   */
  module?: string;
  /**
   * Which permission action to verify. Defaults to 'can_view'.
   * Only relevant when `module` is also provided.
   */
  action?: 'can_view' | 'can_create' | 'can_edit' | 'can_delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Role-based rendering guard.
 *
 * A user passes this guard when ANY of the following is true:
 *  1. Their role is in the `roles` list.
 *  2. `module` is provided and `hasPermission(module, action)` returns true
 *     (covers dynamic custom_permissions / role_permissions grants).
 *
 * Usage:
 *   <RoleGuard roles={['admin','super_admin']}>...</RoleGuard>
 *   <RoleGuard roles={['admin']} module="hr" action="can_view">...</RoleGuard>
 *
 * If the user does not pass:
 *  - Renders `fallback` if provided, otherwise redirects to /dashboard.
 */
export function RoleGuard({ roles, module, action = 'can_view', children, fallback }: RoleGuardProps) {
  const { user, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasRole = roles.includes(user.role);
  const hasModulePermission = module ? hasPermission(module, action) : false;

  if (!hasRole && !hasModulePermission) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

