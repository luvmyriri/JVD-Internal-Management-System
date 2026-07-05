import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import type { User, RolePermissions } from '../types/auth';

interface AuthContextType {
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.me();
      setUser(response.data.data);
      setPermissions(response.data.permissions || null);
      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setPermissions(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    // Attempt to fetch user on initial load
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback((userData: User, perms?: RolePermissions) => {
    setUser(userData);
    setIsAuthenticated(true);
    if (perms) setPermissions(perms);
  }, []);

  const queryClient = useQueryClient();

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setPermissions(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const hasPermission = useCallback((module: string, action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' = 'can_view') => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;

    const moduleKey = module.replace(/\./g, '_');

    // 1. Check explicit module tags first (e.g. access:accounting_commissions:general)
    if (user.tags) {
      if (user.tags.includes(`access:${moduleKey}:general`)) return true;
      if (user.tags.includes(`access:${moduleKey}:personal`)) {
        return action === 'can_view' || action === 'can_create';
      }
    }

    // 2. Check global tag overrides
    if (user.tags?.includes('access:general')) {
      // access:general allows everything EXCEPT admin modules which require explicit role checks
      if (!module.startsWith('admin.')) {
        return true;
      }
    }

    // 3. Check access:personalized tag (only allows view/create on personalized modules)
    if (user.tags?.includes('access:personalized')) {
      const personalizedModules = [
        'accounting.commissions',
        'accounting.cash_budgets',
        'accounting.liquidations',
        'driver.overview',
        'driver.scheduled_trips',
        'driver.my_fleet'
      ];
      if (personalizedModules.includes(module)) {
        return action === 'can_view' || action === 'can_create';
      }
    }

    // 4. Check for custom overrides first
    if (user.custom_permissions && user.custom_permissions[module]) {
      return user.custom_permissions[module][action] === true;
    }

    // 5. Fall back to role permissions
    if (!permissions || !permissions[module]) return false;
    return permissions[module][action] === true;
  }, [user, permissions]);

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshUser,
        setUser,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
