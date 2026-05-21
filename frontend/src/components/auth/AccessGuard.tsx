import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';

interface AccessGuardProps {
  module: string;
  action?: 'can_view' | 'can_create' | 'can_edit' | 'can_delete';
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * AccessGuard prevents rendering of its children if the current user
 * does not have the specified permission for the specified module.
 * 
 * @example
 * <AccessGuard module="users" action="can_edit">
 *   <button>Edit User</button>
 * </AccessGuard>
 */
export function AccessGuard({ 
  module, 
  action = 'can_view', 
  children, 
  fallback = null 
}: AccessGuardProps) {
  const { hasPermission, isLoading } = useAuth();
  
  // While loading auth state, we might want to return nothing to prevent flickering
  if (isLoading) {
    return null; 
  }
  
  if (hasPermission(module, action)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}
