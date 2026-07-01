import { navigation } from '../components/layout/Sidebar';
import type { User, RolePermissions } from '../types/auth';

export function isPathAllowedForUser(path: string, user?: User | null, permissions?: RolePermissions | null): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;

  // Profile is always allowed
  const cleanPath = path.replace(/\/$/, '');
  if (cleanPath === '/profile') return true;

  // Normalize standard route redirects
  let checkPath = cleanPath;
  if (checkPath === '/procurement/overview') {
    checkPath = '/logistics';
  } else if (checkPath === '/sales') {
    checkPath = '/sales/fixed-packages';
  } else if (checkPath === '/accounting') {
    checkPath = '/accounting/billing';
  } else if (checkPath === '/operations') {
    checkPath = '/operations/customers';
  } else if (checkPath === '/procurement') {
    checkPath = '/procurement/work-orders';
  } else if (checkPath === '/inventory') {
    checkPath = '/inventory/supplies';
  } else if (checkPath === '/travel') {
    checkPath = '/travel/passporting';
  } else if (checkPath === '/hr') {
    checkPath = '/hr/employees';
  }

  // Helper to check view permission
  const hasViewPerm = (module: string) => {
    const moduleKey = module.replace(/\./g, '_');
    
    // 1. Check explicit module tags first (e.g. access:accounting_commissions:general)
    if (user.tags) {
      if (user.tags.includes(`access:${moduleKey}:general`) || user.tags.includes(`access:${moduleKey}:personal`)) {
        return true;
      }
    }

    // 2. Check global access:general override
    if (user.tags?.includes('access:general')) {
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
        return true;
      }
    }

    if (user.custom_permissions && user.custom_permissions[module]) {
      return user.custom_permissions[module]['can_view'] === true;
    }
    const perms = user.effective_permissions || permissions;
    if (!perms || !perms[module]) return false;
    return perms[module]['can_view'] === true;
  };

  // Check if any navigation item has this path and if the user is allowed to view it
  for (const section of navigation) {
    for (const item of section.items) {
      if (item.path === checkPath) {
        const permKey = item.pageKey ?? item.module;
        if (permKey) {
          return hasViewPerm(permKey);
        }
        if (item.roles) {
          return item.roles.includes(user.role);
        }
        return true;
      }
    }
  }

  // Check prefix matches for child routes under allowed paths
  for (const section of navigation) {
    for (const item of section.items) {
      if (checkPath.startsWith(item.path + '/')) {
        const permKey = item.pageKey ?? item.module;
        if (permKey) {
          return hasViewPerm(permKey);
        }
        if (item.roles) {
          return item.roles.includes(user.role);
        }
        return true;
      }
    }
  }

  // Driver namespace special check
  if (checkPath.startsWith('/driver') && user.role === 'driver') {
    return true;
  }

  return false;
}

export function getLandingPageForUser(user?: User | null, permissions?: RolePermissions | null): string {
  if (!user) return '/login';
  
  // Super admin always goes to dashboard
  if (user.role === 'super_admin') return '/dashboard';
  
  // Driver explicitly goes to their overview page to bypass personalized tag checks causing redirect to commissions
  if (user.role === 'driver') return '/driver/overview';

  // Helper to check view permission
  const hasViewPerm = (module: string) => {
    const moduleKey = module.replace(/\./g, '_');
    
    // 1. Check explicit module tags first (e.g. access:accounting_commissions:general)
    if (user.tags) {
      if (user.tags.includes(`access:${moduleKey}:general`) || user.tags.includes(`access:${moduleKey}:personal`)) {
        return true;
      }
    }

    // 2. Check global access:general override
    if (user.tags?.includes('access:general')) {
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
        return true;
      }
    }

    // Check for custom overrides first
    if (user.custom_permissions && user.custom_permissions[module]) {
      return user.custom_permissions[module]['can_view'] === true;
    }

    // Fall back to role permissions
    const perms = user.effective_permissions || permissions;
    if (!perms || !perms[module]) return false;
    return perms[module]['can_view'] === true;
  };

  // Find the first route the user has access to in the navigation config
  for (const section of navigation) {
    for (const item of section.items) {
      const permKey = item.pageKey ?? item.module;
      if (permKey) {
        if (hasViewPerm(permKey)) {
          return item.path;
        }
      } else if (item.roles && item.roles.includes(user.role)) {
        return item.path;
      }
    }
  }

  // Final fallbacks if no navigation items match
  if (['executive_vice_president', 'operations_manager', 'corporate_secretary'].includes(user.role)) {
    return '/dashboard';
  }

  return '/profile';
}
