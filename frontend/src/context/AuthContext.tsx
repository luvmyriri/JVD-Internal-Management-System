import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User, RolePermissions } from '../types/auth';

interface AuthContextType {
  user: User | null;
  permissions: RolePermissions | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User, permissions?: RolePermissions) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  hasPermission: (module: string, action?: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.me();
      setUser(response.data.data);
      setPermissions(response.data.permissions || null);
    } catch {
      setUser(null);
      setPermissions(null);
      setToken(null);
      localStorage.removeItem('auth_token');
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token, refreshUser]);

  const login = useCallback((newToken: string, userData: User, perms?: RolePermissions) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(userData);
    if (perms) setPermissions(perms);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
      setPermissions(null);
    }
  }, []);

  const hasPermission = useCallback((module: string, action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' = 'can_view') => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;

    // Check for custom overrides first
    if (user.custom_permissions && user.custom_permissions[module]) {
      return user.custom_permissions[module][action] === true;
    }

    // Fall back to role permissions
    if (!permissions || !permissions[module]) return false;
    return permissions[module][action] === true;
  }, [user, permissions]);

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        token,
        isAuthenticated: !!user && !!token,
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
