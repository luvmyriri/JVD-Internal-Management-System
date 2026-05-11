import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';

interface RoleGuardProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Role-based rendering guard.
 * Usage: <RoleGuard roles={['admin','super_admin']}><AdminPanel /></RoleGuard>
 * 
 * If the user's role is not in the allowed list:
 *  - If fallback is provided, render fallback
 *  - Otherwise redirect to /dashboard
 */
export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
