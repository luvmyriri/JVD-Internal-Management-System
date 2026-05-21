import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolePermissionsApi, type ModulePermission } from '../../api/rolePermissions';
import type { UserRole } from '../../types/auth';
import { LuShieldCheck, LuSave, LuRotateCcw, LuLoaderCircle, LuInfo } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function RolePermissions() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [localPermissions, setLocalPermissions] = useState<Record<string, ModulePermission>>({});
  const [hasChanges, setHasChanges] = useState(false);

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
    if (window.confirm(`Are you sure you want to reset all permissions for ${selectedRole.replace('_', ' ')} back to defaults?`)) {
      resetMutation.mutate(selectedRole);
    }
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <LuShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Role Permissions</h1>
            <p className="text-slate-500 text-sm mt-1">
              Configure granular access control per role and module.
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {roles.map((role: string) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role as UserRole)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedRole === role
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {formatRoleName(role)}
            </button>
          ))}
        </div>
      </div>

      {/* Warning/Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
        <LuInfo className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
        <div className="text-sm">
          <p className="font-semibold">Important Notes:</p>
          <ul className="list-disc ml-5 mt-1 space-y-1">
            <li>The <strong>Super Admin</strong> role inherently possesses all permissions and cannot be restricted.</li>
            <li>Users must refresh their session (or login again) to receive updated permissions.</li>
            <li>Enabling 'Edit', 'Create', or 'Delete' typically requires 'View' permission to access the module first.</li>
          </ul>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {selectedRole ? formatRoleName(selectedRole) : ''} Permissions
            </h2>
            <p className="text-sm text-slate-500">Toggle access rights for specific application modules.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={resetMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors disabled:opacity-50"
            >
              {resetMutation.isPending ? <LuLoaderCircle className="w-4 h-4 animate-spin" /> : <LuRotateCcw className="w-4 h-4" />}
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                hasChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
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
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm">System Module</th>
                <th className="py-4 px-6 text-center font-semibold text-slate-600 text-sm w-32">View</th>
                <th className="py-4 px-6 text-center font-semibold text-slate-600 text-sm w-32">Create</th>
                <th className="py-4 px-6 text-center font-semibold text-slate-600 text-sm w-32">Edit</th>
                <th className="py-4 px-6 text-center font-semibold text-slate-600 text-sm w-32">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map((module: string) => {
                const perms = localPermissions[module] || {
                  can_view: false,
                  can_create: false,
                  can_edit: false,
                  can_delete: false,
                };

                return (
                  <tr key={module} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-medium text-slate-900">
                        {module.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                      <span className="ml-2 text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                        {module}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <PermissionToggle
                        active={perms.can_view}
                        onClick={() => handleToggle(module, 'can_view')}
                        color="blue"
                      />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <PermissionToggle
                        active={perms.can_create}
                        onClick={() => handleToggle(module, 'can_create')}
                        color="emerald"
                      />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <PermissionToggle
                        active={perms.can_edit}
                        onClick={() => handleToggle(module, 'can_edit')}
                        color="amber"
                      />
                    </td>
                    <td className="py-4 px-6 text-center">
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
    </div>
  );
}

// Custom Toggle Switch Component
function PermissionToggle({ active, onClick, color }: { active: boolean; onClick: () => void; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-600 peer-checked:bg-blue-600',
    emerald: 'bg-emerald-500 peer-checked:bg-emerald-500',
    amber: 'bg-amber-500 peer-checked:bg-amber-500',
    rose: 'bg-rose-500 peer-checked:bg-rose-500',
  };

  const activeColor = colorMap[color] || 'bg-blue-600 peer-checked:bg-blue-600';

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={active}
        onChange={onClick}
      />
      <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${active ? activeColor : ''}`}></div>
    </label>
  );
}
