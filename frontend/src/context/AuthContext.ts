import { createContext, useContext } from 'react';
import type { User, RolePermissions } from '../types/auth';

export interface AuthContextType {
  user: User | null;
  permissions: RolePermissions | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, permissions?: RolePermissions) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  hasPermission: (module: string, action?: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export { AuthProvider } from './AuthProvider';
