import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LuLayoutGrid, LuCheck, LuMinus, LuPlus, LuChevronDown, LuChevronRight,
  LuShield, LuShieldCheck, LuShieldOff, LuInfo,
  LuBriefcase, LuUsers, LuBus, LuBanknote, LuGlobe, LuPackage,
  LuTruck, LuWrench, LuPlane, LuSettings,
} from 'react-icons/lu';
import { rolePermissionsApi, type ModulePermission } from '../../api/rolePermissions';
import type { UserRole } from '../../types/auth';
import { useTheme } from '../../context/ThemeContext';

// ── Constants ─────────────────────────────────────────────────────────────────

export const DASHBOARD_OPTIONS = [
  { value: '',            label: 'Role Default',     description: 'Use the dashboard assigned to this role' },
  { value: 'admin',       label: 'Admin / Overview',  description: 'Full management overview' },
  { value: 'accounting',  label: 'Accounting',        description: 'Revenue, billing, cash budgets' },
  { value: 'operations',  label: 'Operations',        description: 'Customer info, accreditations' },
  { value: 'logistics',   label: 'Logistics',         description: 'Trip tickets, fleet status' },
  { value: 'procurement', label: 'Procurement',       description: 'Work orders, job orders, POs' },
  { value: 'maintenance', label: 'Maintenance',       description: 'PMS schedules, vehicle health' },
  { value: 'hr',          label: 'Human Resources',   description: 'Employees, payroll, internships' },
  { value: 'agent',       label: 'Agent / Sales',     description: 'Bookings, commissions' },
  { value: 'driver',      label: 'Driver',            description: 'Trip schedule, fleet assignment' },
];

const MODULE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  dashboard:   LuLayoutGrid,
  accounting:  LuBanknote,
  operations:  LuGlobe,
  logistics:   LuTruck,
  procurement: LuWrench,
  inventory:   LuPackage,
  sales:       LuBriefcase,
  hr:          LuUsers,
  driver:      LuBus,
  travel:      LuPlane,
  admin:       LuSettings,
};

// The full module → pages map (mirrors backend RolePermission::PAGES)
const MODULE_PAGES: Record<string, Record<string, string>> = {
  dashboard:   {},
  accounting:  {
    'accounting.billing': 'Transactions', 'accounting.reports': 'Reports',
    'accounting.collections': 'Collections', 'accounting.cash_budgets': 'Cash Budgets',
    'accounting.commissions': 'Commissions', 'accounting.liquidations': 'Liquidations',
    'accounting.employee_soa': 'Employee SOA',
  },
  operations:  {
    'operations.customers': 'Customer Info', 'operations.accreditations': 'Accreditations',
    'operations.documents': 'Company Documents',
  },
  logistics:   {
    'logistics.overview': 'Overview', 'logistics.trip_tickets': 'Trip Tickets',
    'logistics.fleet': 'Fleet', 'logistics.pms': 'PMS',
  },
  procurement: {
    'procurement.work_orders': 'Work Orders', 'procurement.job_orders': 'Job Orders',
    'procurement.purchase_orders': 'Purchase Orders', 'procurement.suppliers': 'Suppliers',
  },
  inventory:   { 'inventory.supplies': 'Supplies' },
  sales:       { 'sales.fixed_packages': 'Fixed Packages', 'sales.custom_transactions': 'Custom Transactions' },
  hr:          { 'hr.employees': 'Employees', 'hr.applications': 'Job Applications', 'hr.internships': 'Internships', 'hr.payroll': 'Payroll' },
  driver:      { 'driver.overview': 'Overview', 'driver.scheduled_trips': 'Scheduled Trips', 'driver.my_fleet': 'My Fleet' },
  travel:      { 'travel.passporting': 'Passporting', 'travel.visa_processing': 'Visa Processing' },
  admin:       { 'admin.users': 'Users', 'admin.role_permissions': 'Role Permissions', 'admin.audit_logs': 'Audit Logs', 'admin.settings': 'Settings' },
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Management Overview', accounting: 'Accounting', operations: 'Operations',
  logistics: 'Logistics', procurement: 'Procurement', inventory: 'Inventory',
  sales: 'Sales', hr: 'Human Resources', driver: 'Driver', travel: 'Travel Assistance', admin: 'Administration',
};

// Override state: null = use role default, true = force allow, false = force deny
type OverrideState = true | false | null;

interface PermOverrides {
  [key: string]: {
    can_view: OverrideState;
    can_create: OverrideState;
    can_edit: OverrideState;
    can_delete: OverrideState;
  };
}

interface Props {
  role: UserRole | string;
  /** Current custom_permissions saved on the user (JSON column) */
  initialCustomPermissions: Record<string, ModulePermission>;
  /** Current dashboard_preference saved on the user */
  initialDashboardPreference: string | null | undefined;
  onPermissionsChange: (perms: Record<string, ModulePermission>) => void;
  onDashboardPreferenceChange: (pref: string | null) => void;
}

const ACTIONS: { key: keyof ModulePermission; label: string }[] = [
  { key: 'can_view', label: 'View' },
  { key: 'can_create', label: 'Create' },
  { key: 'can_edit', label: 'Edit' },
  { key: 'can_delete', label: 'Delete' },
];

// ── OverrideToggle ─────────────────────────────────────────────────────────────

function OverrideToggle({
  state, roleDefault, onChange,
}: {
  state: OverrideState;
  roleDefault: boolean;
  onChange: (next: OverrideState) => void;
}) {
  const cycle = () => {
    if (state === null) onChange(true);
    else if (state === true) onChange(false);
    else onChange(null);
  };

  const isOverride = state !== null;
  const effective = state !== null ? state : roleDefault;

  return (
    <button
      type="button"
      title={state === null ? 'Role default' : state ? 'Override: Allow' : 'Override: Deny'}
      onClick={cycle}
      className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${
        state === null
          ? effective
            ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
            : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600'
          : state === true
            ? 'bg-emerald-500 border-transparent text-white shadow-sm shadow-emerald-500/30'
            : 'bg-red-500 border-transparent text-white shadow-sm shadow-red-500/30'
      } ${isOverride ? 'ring-2 ring-amber-400/40' : ''}`}
    >
      {state === null ? (
        effective ? <LuCheck size={11} strokeWidth={3} /> : <LuMinus size={11} strokeWidth={3} />
      ) : state === true ? (
        <LuShieldCheck size={11} />
      ) : (
        <LuShieldOff size={11} />
      )}
    </button>
  );
}

// ── ModuleCard ─────────────────────────────────────────────────────────────────

function ModuleCard({
  moduleKey, rolePerms, overrides, onOverrideChange,
}: {
  moduleKey: string;
  rolePerms: Record<string, ModulePermission> | undefined;
  overrides: PermOverrides;
  onOverrideChange: (key: string, action: keyof ModulePermission, val: OverrideState) => void;
}) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const Icon = MODULE_ICONS[moduleKey] ?? LuShield;
  const label = MODULE_LABELS[moduleKey] ?? moduleKey;
  const pages = MODULE_PAGES[moduleKey] ?? {};
  const hasPages = Object.keys(pages).length > 0;

  const moduleOverride = overrides[moduleKey];
  const hasModuleOverride = moduleOverride && Object.values(moduleOverride).some(v => v !== null);

  return (
    <div className={`rounded-2xl border transition-all ${
      hasModuleOverride
        ? 'border-amber-300 dark:border-amber-700 shadow-sm shadow-amber-100 dark:shadow-amber-900/20'
        : theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
    } overflow-hidden`}>
      {/* Module header row */}
      <div className={`flex items-center gap-3 px-4 py-3 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
          theme === 'dark' ? 'bg-gray-800 text-blue-400' : 'bg-white text-blue-600 shadow-sm'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{label}</p>
          {hasModuleOverride && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">⚠ Overrides active</p>
          )}
        </div>
        {/* Module-level CRUD toggles */}
        <div className="flex items-center gap-1.5">
          {ACTIONS.map(({ key, label: aLabel }) => (
            <div key={key} className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] text-gray-400 uppercase">{aLabel.slice(0, 1)}</span>
              <OverrideToggle
                state={overrides[moduleKey]?.[key] ?? null}
                roleDefault={rolePerms?.[moduleKey]?.[key] ?? false}
                onChange={val => onOverrideChange(moduleKey, key, val)}
              />
            </div>
          ))}
        </div>
        {hasPages && (
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            {expanded ? <LuChevronDown className="w-4 h-4" /> : <LuChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Page sub-rows */}
      {expanded && hasPages && (
        <div className={`divide-y ${theme === 'dark' ? 'divide-gray-800' : 'divide-gray-100'}`}>
          {Object.entries(pages).map(([pageKey, pageLabel]) => {
            const pageOverride = overrides[pageKey];
            const hasPageOverride = pageOverride && Object.values(pageOverride).some(v => v !== null);
            return (
              <div key={pageKey} className={`flex items-center gap-3 px-4 py-2.5 ${
                theme === 'dark' ? 'bg-gray-950' : 'bg-white'
              } ${hasPageOverride ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}>
                <div className="w-8" /> {/* indent */}
                <p className="flex-1 text-xs text-gray-600 dark:text-gray-400">{pageLabel}</p>
                <div className="flex items-center gap-1.5">
                  {ACTIONS.map(({ key }) => (
                    <OverrideToggle
                      key={key}
                      state={overrides[pageKey]?.[key] ?? null}
                      roleDefault={rolePerms?.[pageKey]?.[key] ?? false}
                      onChange={val => onOverrideChange(pageKey, key, val)}
                    />
                  ))}
                </div>
                <div className="w-5" /> {/* spacer for expand button alignment */}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function UserAccessPanel({
  role,
  initialCustomPermissions,
  initialDashboardPreference,
  onPermissionsChange,
  onDashboardPreferenceChange,
}: Props) {
  const { theme } = useTheme();

  // Fetch the role's baseline permissions
  const { data: allRolePerms } = useQuery({
    queryKey: ['role-permissions-baseline', role],
    queryFn: () => rolePermissionsApi.index().then((r: any) => r.data),
    enabled: !!role,
    staleTime: 60_000,
  });

  // Convert custom_permissions (true/false/absent) → OverrideState (true/false/null)
  const buildOverrides = (custom: Record<string, ModulePermission>): PermOverrides => {
    const result: PermOverrides = {};
    for (const [key, perm] of Object.entries(custom)) {
      result[key] = {
        can_view:   perm.can_view   !== undefined ? (perm.can_view   as boolean) : null,
        can_create: perm.can_create !== undefined ? (perm.can_create as boolean) : null,
        can_edit:   perm.can_edit   !== undefined ? (perm.can_edit   as boolean) : null,
        can_delete: perm.can_delete !== undefined ? (perm.can_delete as boolean) : null,
      };
    }
    return result;
  };

  const [overrides, setOverrides] = useState<PermOverrides>(() =>
    buildOverrides(initialCustomPermissions ?? {})
  );
  const [dashboardPref, setDashboardPref] = useState<string>(initialDashboardPreference ?? '');

  // Sync back to parent whenever overrides change
  useEffect(() => {
    const custom: Record<string, ModulePermission> = {};
    for (const [key, perm] of Object.entries(overrides)) {
      const hasAny = Object.values(perm).some(v => v !== null);
      if (!hasAny) continue;
      custom[key] = {} as ModulePermission;
      for (const action of ['can_view', 'can_create', 'can_edit', 'can_delete'] as const) {
        if (perm[action] !== null) {
          (custom[key] as any)[action] = perm[action];
        }
      }
    }
    onPermissionsChange(custom);
  }, [overrides]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOverride = (key: string, action: keyof ModulePermission, val: OverrideState) => {
    setOverrides(prev => ({
      ...prev,
      [key]: { ...prev[key], [action]: val },
    }));
  };

  const handleDashboardChange = (val: string) => {
    setDashboardPref(val);
    onDashboardPreferenceChange(val === '' ? null : val);
  };

  const rolePerms: Record<string, ModulePermission> | undefined =
    allRolePerms ? (allRolePerms as any)[role] : undefined;

  const totalOverrides = Object.values(overrides).reduce((sum, perm) =>
    sum + Object.values(perm).filter(v => v !== null).length, 0
  );

  return (
    <div className="space-y-6">
      {/* ── Dashboard Preference Card ── */}
      <div className={`rounded-2xl border p-4 space-y-3 ${
        theme === 'dark' ? 'border-gray-800 bg-gray-900/50' : 'border-gray-100 bg-gray-50'
      }`}>
        <div className="flex items-center gap-2">
          <LuLayoutGrid className="w-4 h-4 text-blue-500" />
          <h4 className="text-sm font-bold text-gray-800 dark:text-white">Dashboard Assignment</h4>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Choose which dashboard this user sees on login. Overrides the role default.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DASHBOARD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleDashboardChange(opt.value)}
              className={`text-left px-3 py-2.5 rounded-xl border transition-all text-xs ${
                dashboardPref === opt.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : theme === 'dark'
                    ? 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <p className="font-semibold">{opt.label}</p>
              <p className={`mt-0.5 text-[10px] ${dashboardPref === opt.value ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400'}`}>
                {opt.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Module Access Overrides ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LuShield className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-bold text-gray-800 dark:text-white">Module Access Overrides</h4>
            {totalOverrides > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                {totalOverrides} override{totalOverrides !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className={`flex flex-wrap gap-3 text-[10px] mb-4 px-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 inline-flex items-center justify-center">
              <LuCheck size={8} strokeWidth={3} className="text-gray-400" />
            </span>
            Role default (allowed)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-md bg-emerald-500 text-white inline-flex items-center justify-center ring-2 ring-amber-400/40">
              <LuShieldCheck size={8} />
            </span>
            Override: Force Allow
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-md bg-red-500 text-white inline-flex items-center justify-center ring-2 ring-amber-400/40">
              <LuShieldOff size={8} />
            </span>
            Override: Force Deny
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <LuInfo size={10} />
            Click toggles to cycle: Default → Allow → Deny
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Overrides apply on top of the <strong>{role.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</strong> role baseline.
          Modules with ⚠ have active overrides.
        </p>

        <div className="space-y-2">
          {Object.keys(MODULE_LABELS).map(moduleKey => (
            <ModuleCard
              key={moduleKey}
              moduleKey={moduleKey}
              rolePerms={rolePerms}
              overrides={overrides}
              onOverrideChange={handleOverride}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
