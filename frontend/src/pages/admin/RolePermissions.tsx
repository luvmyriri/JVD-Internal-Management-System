import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  rolePermissionsApi,
  type PermissionsMap,
  type RolePermissionMeta,
} from '../../api/rolePermissions';
import type { UserRole } from '../../types/auth';
import {
  LuShieldCheck, LuSave, LuRotateCcw, LuLoaderCircle, LuInfo,
  LuChevronDown, LuChevronRight, LuEye, LuPencil, LuPlus, LuTrash2,
  LuLayoutGrid, LuCheck,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '../../components/ui';

// ── Types ────────────────────────────────────────────────────────────────────

const PERM_ACTIONS = [
  { key: 'can_view',   label: 'View',   icon: LuEye },
  { key: 'can_create', label: 'Create', icon: LuPlus },
  { key: 'can_edit',   label: 'Edit',   icon: LuPencil },
  { key: 'can_delete', label: 'Delete', icon: LuTrash2 },
] as const;

type ActionKey = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

// ── Helper ───────────────────────────────────────────────────────────────────

function fmtRole(role: string) {
  return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const emptyPerm = (): { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } => ({
  can_view: false, can_create: false, can_edit: false, can_delete: false,
});

// ── Sub-components ───────────────────────────────────────────────────────────

function ToggleCell({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${
        active
          ? 'bg-blue-600 dark:bg-blue-500 border-transparent text-white shadow-sm'
          : 'bg-white dark:bg-gray-950 border-gray-250 dark:border-gray-805 text-transparent hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
      }`}
    >
      <LuCheck 
        size={11} 
        strokeWidth={3.5} 
        className={`transition-all duration-200 ${
          active ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`} 
      />
    </button>
  );
}

// Module row with expandable page rows
function ModuleAccordion({
  moduleKey,
  moduleLabel,
  pages,
  permissions,
  onToggle,
  onModuleBulkToggle,
}: {
  moduleKey: string;
  moduleLabel: string;
  pages: Record<string, string>; // { 'module.page_key': 'Label' }
  permissions: PermissionsMap;
  onToggle: (key: string, action: ActionKey) => void;
  onModuleBulkToggle: (moduleKey: string, pageKeys: string[], value: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasPages = Object.keys(pages).length > 0;
  const modulePerms = permissions[moduleKey] ?? emptyPerm();

  // Compute "all pages visible" state for the module toggle hint
  const pageKeys = Object.keys(pages);
  const allPagesVisible = pageKeys.length > 0
    ? pageKeys.every(pk => permissions[pk]?.can_view)
    : modulePerms.can_view;

  return (
    <div className="border-b border-gray-100 dark:border-gray-900 last:border-0">
      {/* Module header row */}
      <div className="flex items-center gap-3 px-6 py-3.5 bg-transparent hover:bg-gray-50/40 dark:hover:bg-gray-800/10 transition-colors">
        {/* Expand/collapse toggle */}
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          disabled={!hasPages}
          className={`p-1 rounded-lg transition-colors cursor-pointer ${
            hasPages 
              ? 'text-gray-400 hover:text-gray-750 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800' 
              : 'text-gray-300 dark:text-gray-750 cursor-default'
          }`}
        >
          {hasPages
            ? expanded
              ? <LuChevronDown size={14} strokeWidth={2.5} />
              : <LuChevronRight size={14} strokeWidth={2.5} />
            : <LuLayoutGrid size={13} className="text-gray-350 dark:text-gray-650" />
          }
        </button>

        {/* Module name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900 dark:text-white tracking-tight">{moduleLabel}</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono font-normal">
              {moduleKey}
            </span>
            {hasPages && (
              <span className="text-[10px] text-gray-450 dark:text-gray-550 font-normal">
                ({pageKeys.length} page{pageKeys.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </div>

        {/* Bulk toggle for pages */}
        {hasPages && (
          <button
            type="button"
            onClick={() => onModuleBulkToggle(moduleKey, pageKeys, !allPagesVisible)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              allPagesVisible
                ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                : 'text-gray-550 dark:text-gray-450 hover:bg-gray-150/50 dark:hover:bg-gray-800/40'
            }`}
          >
            {allPagesVisible ? 'Revoke All' : 'Grant All'}
          </button>
        )}

        {/* Module-level CRUD toggles */}
        <div className="flex items-center gap-4 shrink-0 pr-2">
          {PERM_ACTIONS.map(a => (
            <div key={a.key} className="w-9 flex justify-center">
              <ToggleCell
                active={modulePerms[a.key as ActionKey]}
                onClick={() => onToggle(moduleKey, a.key as ActionKey)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Page rows (Tree indented) */}
      {hasPages && expanded && (
        <div className="relative pl-12 pr-6 bg-gray-50/15 dark:bg-gray-900/5 divide-y divide-gray-100/50 dark:divide-gray-900/20">
          {/* Vertical tracing tree line */}
          <div className="absolute left-6 top-0 bottom-5 w-px bg-gray-200 dark:bg-gray-800" />
          
          {Object.entries(pages).map(([pageKey, pageLabel]) => {
            const pagePerms = permissions[pageKey] ?? emptyPerm();
            return (
              <div 
                key={pageKey} 
                className="relative flex items-center gap-3 py-2.5 hover:bg-gray-50/40 dark:hover:bg-gray-800/10 transition-colors group pl-4 -ml-4 rounded-lg"
              >
                {/* Horizontal tree line connector */}
                <div className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-4 h-px bg-gray-200 dark:bg-gray-800" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-750 dark:text-gray-300">{pageLabel}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-650 font-mono font-normal">
                      {pageKey.split('.')[1] || pageKey}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 shrink-0 pr-2">
                  {PERM_ACTIONS.map(a => (
                    <div key={a.key} className="w-9 flex justify-center">
                      <ToggleCell
                        active={pagePerms[a.key as ActionKey]}
                        onClick={() => onToggle(pageKey, a.key as ActionKey)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RolePermissions() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [localPermissions, setLocalPermissions] = useState<PermissionsMap>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const { data: configData, isLoading } = useQuery({
    queryKey: ['role-permissions-config'],
    queryFn: async () => {
      const res = await rolePermissionsApi.index();
      return res.data;
    },
  });

  const roles: string[]           = configData?.meta?.roles      || [];
  const meta: RolePermissionMeta  = configData?.meta as RolePermissionMeta;
  const permissionsData           = configData?.data || {};

  useEffect(() => {
    if (roles.length > 0 && !selectedRole) setSelectedRole(roles[0] as UserRole);
  }, [roles, selectedRole]);

  useEffect(() => {
    if (selectedRole && permissionsData[selectedRole]) {
      setLocalPermissions(JSON.parse(JSON.stringify(permissionsData[selectedRole])));
      setHasChanges(false);
    }
  }, [selectedRole, permissionsData]);

  const updateMutation = useMutation({
    mutationFn: (data: { role: UserRole; permissions: PermissionsMap }) =>
      rolePermissionsApi.update(data.role, data.permissions),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Permissions updated');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['role-permissions-config'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Update failed'),
  });

  const resetMutation = useMutation({
    mutationFn: (role: UserRole) => rolePermissionsApi.reset(role),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Permissions reset');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['role-permissions-config'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Reset failed'),
  });

  const handleToggle = useCallback((key: string, action: ActionKey) => {
    setLocalPermissions(prev => {
      const updated = { ...prev };
      if (!updated[key]) updated[key] = emptyPerm();
      updated[key] = { ...updated[key], [action]: !updated[key][action] };
      return updated;
    });
    setHasChanges(true);
  }, []);

  // Turn all page-level can_view (and matching CRUD) on/off for a module
  const handleBulkToggle = useCallback((moduleKey: string, pageKeys: string[], value: boolean) => {
    setLocalPermissions(prev => {
      const updated = { ...prev };
      // Also toggle the module itself
      if (!updated[moduleKey]) updated[moduleKey] = emptyPerm();
      updated[moduleKey] = { ...updated[moduleKey], can_view: value };
      // Toggle all pages
      pageKeys.forEach(pk => {
        if (!updated[pk]) updated[pk] = emptyPerm();
        updated[pk] = {
          can_view:   value,
          can_create: value ? updated[pk].can_create : false,
          can_edit:   value ? updated[pk].can_edit   : false,
          can_delete: value ? updated[pk].can_delete : false,
        };
      });
      return updated;
    });
    setHasChanges(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LuLoaderCircle className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const modules: Record<string, string> = meta?.modules || {};
  const pages: Record<string, Record<string, string>> = meta?.pages || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-850">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 text-blue-655 dark:text-blue-400 rounded-xl border border-blue-100/50 dark:border-blue-900/20 shadow-sm shrink-0">
            <LuShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Access Management</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
              Granular role privileges configured at the module and page-level.
            </p>
          </div>
        </div>

        {/* Segmented Role Tabs Control */}
        <div className="flex flex-wrap items-center p-1 bg-gray-100/80 dark:bg-gray-800/40 rounded-xl gap-1 border border-gray-250/20 dark:border-gray-700/20 self-start md:self-auto">
          {roles.map((role: string) => {
            const isSelected = selectedRole === role;
            return (
              <button
                key={role}
                onClick={() => setSelectedRole(role as UserRole)}
                className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-gray-950 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200/50 dark:border-gray-850/50'
                    : 'text-gray-500 dark:text-gray-450 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/20 dark:hover:bg-gray-850/20'
                }`}
              >
                {fmtRole(role)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Access Management Quick Guide (Grid Layout) */}
      <div className="bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-850/60 rounded-2xl p-5 flex gap-4 text-gray-750 dark:text-gray-300">
        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl h-fit shrink-0 border border-blue-100/50 dark:border-blue-900/20">
          <LuInfo className="w-4 h-4" />
        </div>
        <div className="text-sm space-y-1.5 flex-1">
          <p className="font-bold text-gray-900 dark:text-white tracking-tight">Access Management Quick Guide</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 pt-2 text-xs text-gray-500 dark:text-gray-450">
            <div className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">•</span>
              <p><strong>Super Admin</strong> possesses unrestricted, absolute access across all modules.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">•</span>
              <p><strong>Module Rows</strong> configure structural API-level permissions for that domain.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">•</span>
              <p><strong>Page Rows</strong> control the visibility of navigation links in the sidebar.</p>
            </div>
            <div className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">•</span>
              <p><strong>Grant/Revoke All</strong> allows bulk-toggling all sub-pages inside a module in one click.</p>
            </div>
            <div className="flex gap-2 col-span-1 md:col-span-2 lg:col-span-1">
              <span className="text-blue-500 font-bold shrink-0">•</span>
              <p>Permission changes require target users to <strong>refresh</strong> their session to take effect.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-850 overflow-hidden">
        {/* Subheader */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-905 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
              {selectedRole ? fmtRole(selectedRole) : ''} Configuration Matrix
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
              Expand parent modules to configure individual page visibility permissions.
            </p>
          </div>

          {/* Table Legend */}
          <div className="flex items-center gap-4">
            {PERM_ACTIONS.map(a => {
              const Icon = a.icon;
              return (
                <div key={a.key} className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Icon size={12} className="text-gray-450 dark:text-gray-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{a.label}</span>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0 self-end md:self-auto">
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={resetMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-950 border border-gray-205 dark:border-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {resetMutation.isPending ? <LuLoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <LuRotateCcw className="w-3.5 h-3.5 text-gray-400" />}
              Reset to Defaults
            </button>
            <button
              onClick={() => selectedRole && updateMutation.mutate({ role: selectedRole, permissions: localPermissions })}
              disabled={!hasChanges || updateMutation.isPending}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                hasChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/10'
                  : 'bg-gray-100 dark:bg-gray-850 text-gray-400 cursor-not-allowed border border-transparent'
              }`}
            >
              {updateMutation.isPending ? <LuLoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <LuSave className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Column header row */}
        <div className="flex items-center gap-3 px-6 py-2.5 border-b border-gray-100 dark:border-gray-905 bg-gray-50/30 dark:bg-gray-900/50">
          <div className="w-6 shrink-0" />
          <div className="flex-1 text-[10px] font-black text-gray-400 dark:text-gray-550 uppercase tracking-widest">Module / Page</div>
          <div className="shrink-0 mr-[48px] text-[10px] font-black text-gray-400 dark:text-gray-555 uppercase tracking-widest hidden sm:block">Bulk</div>
          <div className="flex gap-4 shrink-0 pr-2">
            {PERM_ACTIONS.map(a => (
              <div key={a.key} className="w-9 text-center text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{a.label}</div>
            ))}
          </div>
        </div>

        {/* Module accordion rows */}
        <div className="divide-y divide-gray-100 dark:divide-gray-900">
          {Object.entries(modules).map(([moduleKey, moduleLabel]) => (
            <ModuleAccordion
              key={moduleKey}
              moduleKey={moduleKey}
              moduleLabel={moduleLabel}
              pages={pages[moduleKey] || {}}
              permissions={localPermissions}
              onToggle={handleToggle}
              onModuleBulkToggle={handleBulkToggle}
            />
          ))}
        </div>
      </div>

      {/* Floating Unsaved Changes Bar */}
      {hasChanges && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-5 backdrop-blur-md bg-gray-900/95 dark:bg-black/90 text-white px-6 py-3.5 rounded-xl shadow-xl shadow-black/20 border border-gray-800 dark:border-gray-800/80 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-medium text-gray-300">Unsaved configuration changes</span>
          </div>
          <div className="h-4 w-px bg-gray-850" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (selectedRole && permissionsData[selectedRole]) {
                  setLocalPermissions(JSON.parse(JSON.stringify(permissionsData[selectedRole])));
                  setHasChanges(false);
                }
              }}
              className="text-gray-400 hover:text-white text-xs font-medium transition cursor-pointer px-2 py-1 rounded"
            >
              Discard
            </button>
            <button
              onClick={() => selectedRole && updateMutation.mutate({ role: selectedRole, permissions: localPermissions })}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-semibold text-white transition disabled:opacity-60 cursor-pointer"
            >
              {updateMutation.isPending ? <LuLoaderCircle size={13} className="animate-spin" /> : <LuSave size={13} />}
              Save Configuration
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => { if (selectedRole) resetMutation.mutate(selectedRole); }}
        title="Reset Permissions?"
        message={`This will reset all module and page-level permissions for "${selectedRole ? fmtRole(selectedRole) : 'this role'}" back to system defaults. This cannot be undone.`}
        confirmText="Yes, Reset"
        variant="warning"
      />
    </div>
  );
}
