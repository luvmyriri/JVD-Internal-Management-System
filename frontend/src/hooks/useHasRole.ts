import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';

/**
 * Hook to check if the current user has the required role(s).
 * Usage: const canApprove = useHasRole(['super_admin', 'accounting']);
 */
export function useHasRole(allowedRoles: UserRole[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return allowedRoles.includes(user.role);
}
