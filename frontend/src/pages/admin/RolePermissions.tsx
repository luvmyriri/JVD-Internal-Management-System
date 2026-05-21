import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolePermissionsApi, type ModulePermission } from '../../api/rolePermissions';
import type { UserRole } from '../../types/auth';
import { LuShieldCheck, LuSave, LuRotateCcw, LuLoaderCircle, LuInfo } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '../../components/ui';

export default function RolePermissions() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [localPermissions, setLocalPermissions] = useState<Record<string, ModulePermission>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Fetch all permissions configuration
  const { data: configData, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['role-permissions-config'],
    queryFn: async () => {
      const response = await rolePermissionsApi.index();
      return response.data;
    },
  });

  const roles = configData?.meta?.roles || [];
  const modules = Object.keys(configData?.meta?.modules || {});
  const permissionsData = configData?.data || {};

  // Initialize selected role if not set
  useEffect(() => {
    if (roles.length > 0 && !selectedRole) {
      setSelectedRole(roles[0]);
    }
  }, [roles, selectedRole]);

  // Load permissions for selected role into local state for editing
  useEffect(() => {
    if (selectedRole && permissionsData[selectedRole]) {
      setLocalPermissions(JSON.parse(JSON.stringify(permissionsData[selectedRole]))); // Deep copy
      setHasChanges(false);
    }
  }, [selectedRole, permissionsData]);

  const updateMutation = useMutation({
    mutationFn: async (data: { role: UserRole; permissions: Record<string, ModulePermission> }) => {
      return rolePermissionsApi.update(data.role, data.permissions);
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Permissions updated successfully');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['role-permissions-config'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (role: UserRole) => {
      return rolePermissionsApi.reset(role);
    },
    onSuccess: (response) => {
      toast.success(response.data.message || 'Permissions reset to defaults');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['role-permissions-config'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reset permissions');
    },
  });

  const handleToggle = (module: string, action: keyof ModulePermission) => {
    setLocalPermissions((prev) => {
      const updated = { ...prev };
      if (!updated[module]) {
        updated[module] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
      }
      updated[module][action] = !updated[module][action];
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!selectedRole) return;
    updateMutation.mutate({ role: selectedRole, permissions: localPermissions });
  };

  const handleReset = () => {
    if (!selectedRole) return;
    setShowResetConfirm(true);
  };

  const executeReset = () => {
    if (!selectedRole) return;
    resetMutation.mutate(selectedRole);
  };

  // Format role names for display
  const formatRoleName = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LuLoaderCircle className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-500/20">
            <LuShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Role Permissions</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
              Configure granular access control per role and module.
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {roles.map((role: string) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role as UserRole)}
              className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                selectedRole === role
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg shadow-gray-900/20'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'
              }`}
            >
              {formatRoleName(role)}
            </button>
          ))}
        </div>
      </div>

      {/* Warning/Info Box */}
      <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5 flex gap-4 text-amber-800 dark:text-amber-300">
        <LuInfo className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="text-sm font-medium">
          <p className="font-black text-xs uppercase tracking-widest mb-2">Important Notes</p>
          <ul className="list-disc ml-5 space-y-1 text-amber-700 dark:text-amber-400/80">
            <li>The <strong>Super Admin</strong> role inherently possesses all permissions and cannot be restricted.</li>
            <li>Users must refresh their session (or login again) to receive updated permissions.</li>
            <li>Enabling 'Edit', 'Create', or 'Delete' typically requires 'View' permission to access the module first.</li>
          </ul>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
              {selectedRole ? formatRoleName(selectedRole) : ''} Permissions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Toggle access rights for specific application modules.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={resetMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 font-black text-[10px] uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              {resetMutation.isPending ? <LuLoaderCircle className="w-4 h-4 animate-spin" /> : <LuRotateCcw className="w-4 h-4" />}
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-200 ${
                hasChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              {updateMutation.isPending ? (
                <LuLoaderCircle className="w-4 h-4 animate-spin" />
              ) : (
                <LuSave className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="py-5 px-8 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">System Module</th>
                <th className="py-5 px-8 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest w-32">View</th>
                <th className="py-5 px-8 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest w-32">Create</th>
                <th className="py-5 px-8 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest w-32">Edit</th>
                <th className="py-5 px-8 text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest w-32">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {modules.map((module: string) => {
                const perms = localPermissions[module] || {
                  can_view: false,
                  can_create: false,
                  can_edit: false,
                  can_delete: false,
                };

                return (
                  <tr key={module} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                    <td className="py-5 px-8">
                      <span className="font-bold text-gray-900 dark:text-white text-sm">
                        {module.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                      <span className="ml-3 text-[9px] text-gray-400 dark:text-gray-600 font-mono bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-gray-100 dark:border-gray-700">
                        {module}
                      </span>
                    </td>
                    <td className="py-5 px-8 text-center">
                      <PermissionToggle
                        active={perms.can_view}
                        onClick={() => handleToggle(module, 'can_view')}
                        color="blue"
                      />
                    </td>
                    <td className="py-5 px-8 text-center">
                      <PermissionToggle
                        active={perms.can_create}
                        onClick={() => handleToggle(module, 'can_create')}
                        color="emerald"
                      />
                    </td>
                    <td className="py-5 px-8 text-center">
                      <PermissionToggle
                        active={perms.can_edit}
                        onClick={() => handleToggle(module, 'can_edit')}
                        color="amber"
                      />
                    </td>
                    <td className="py-5 px-8 text-center">
                      <PermissionToggle
                        active={perms.can_delete}
                        onClick={() => handleToggle(module, 'can_delete')}
                        color="rose"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Confirm Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={executeReset}
        title="Reset Permissions?"
        message={`This will reset all permissions for ${selectedRole ? formatRoleName(selectedRole) : 'this role'} back to system defaults. This action cannot be undone.`}
        confirmText="Yes, Reset"
        variant="warning"
      />
    </div>
  );
}

// Custom Toggle Switch Component
function PermissionToggle({ active, onClick, color }: { active: boolean; onClick: () => void; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };

  const activeColor = colorMap[color] || 'bg-blue-600';

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={active}
        onChange={onClick}
      />
      <div className={`w-11 h-6 rounded-full transition-colors duration-200 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white ${active ? activeColor : 'bg-gray-200 dark:bg-gray-700'}`}></div>
    </label>
  );
}
