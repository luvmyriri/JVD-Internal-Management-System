import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Mail, 
  BadgeCheck,
  Shield,
  Briefcase,
  Edit2,
  Lock,
  Eye,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  useUsers, 
  useCreateUser, 
  useUpdateUser, 
  useDeactivateUser, 
  useActivateUser 
} from '../../hooks/useUsers';
import { useHasRole } from '../../hooks/useHasRole';
import { Button, Modal, StatusBadge, Pagination } from '../../components/ui';
import { cn, fullName, formatDate, timeAgo } from '../../utils';
import { useForm } from 'react-hook-form';

interface User {
  id: number;
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'super_admin' | 'admin' | 'human_resource' | 'accounting' | 'agent';
  department: string;
  is_active: boolean;
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin', icon: Shield, color: 'text-blue-400' },
  { value: 'human_resource', label: 'HR', icon: Users, color: 'text-purple-400' },
  { value: 'accounting', label: 'Accounting', icon: BadgeCheck, color: 'text-emerald-400' },
  { value: 'agent', label: 'Agent', icon: Briefcase, color: 'text-amber-400' },
];

const DEPARTMENTS = [
  'Administration',
  'Accounting',
  'Operations',
  'Maintenance',
  'Human Resources',
];

export default function Employees() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const isAdmin = useHasRole(['super_admin', 'admin']);
  const isHR = useHasRole(['human_resource']);
  const canManage = isAdmin || isHR;

  const { data: usersData, isLoading } = useUsers({ 
    search, 
    role: roleFilter, 
    page,
    per_page: 10 
  });

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deactivateMutation = useDeactivateUser();
  const activateMutation = useActivateUser();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const handleOpenModal = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      setValue('first_name', user.first_name);
      setValue('last_name', user.last_name);
      setValue('email', user.email);
      setValue('role', user.role);
      setValue('department', user.department);
      setValue('employee_id', user.employee_id);
    } else {
      setSelectedUser(null);
      reset();
    }
    setIsModalOpen(true);
  };

  const handleViewProfile = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    if (selectedUser) {
      await updateUserMutation.mutateAsync({ id: selectedUser.id, data });
    } else {
      await createUserMutation.mutateAsync(data);
    }
    setIsModalOpen(false);
  };

  const toggleStatus = async (user: User) => {
    if (user.is_active) {
      await deactivateMutation.mutateAsync(user.id);
    } else {
      await activateMutation.mutateAsync(user.id);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
            <Users className="text-indigo-500" size={32} />
            Employee Directory
          </h1>
          <p className="text-gray-400 mt-1">Manage system users, roles, and department assignments.</p>
        </div>
        {canManage && (
          <Button 
            onClick={() => handleOpenModal()} 
            className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
          >
            <UserPlus size={20} />
            Add Employee
          </Button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: usersData?.meta?.total || 0, icon: Users, color: 'blue' },
          { label: 'Active Now', value: usersData?.data?.filter((u: User) => u.is_active).length || 0, icon: UserCheck, color: 'emerald' },
          { label: 'Departments', value: DEPARTMENTS.length, icon: Briefcase, color: 'purple' },
          { label: 'Pending Actions', value: 0, icon: Lock, color: 'amber' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-100 mt-1">{stat.value}</p>
              </div>
              <div className={cn("p-3 rounded-lg bg-gray-800", `text-${stat.color}-400`)}>
                <stat.icon size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters & Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b border-gray-800 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search by name, ID or email..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              {ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            <Button variant="secondary" className="px-3">
              <Filter size={18} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider font-semibold">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8 bg-gray-900/20" />
                  </tr>
                ))
              ) : (
                usersData?.data?.map((user: User) => (
                  <tr key={user.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random`} 
                          className="w-10 h-10 rounded-full border border-gray-700" 
                          alt="" 
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-200">{fullName(user)}</p>
                          <p className="text-xs text-gray-500">{user.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">{user.department}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const role = ROLES.find(r => r.value === user.role);
                          const Icon = role?.icon || Shield;
                          return (
                            <>
                              <Icon size={14} className={role?.color || 'text-gray-400'} />
                              <span className="text-sm text-gray-300 capitalize">{user.role.replace('_', ' ')}</span>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge 
                        status={user.is_active ? 'Active' : 'Deactivated'} 
                        variant={user.is_active ? 'success' : 'danger'} 
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleViewProfile(user)}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {canManage && (
                          <>
                            <button 
                              onClick={() => handleOpenModal(user)}
                              className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => toggleStatus(user)}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                user.is_active 
                                  ? "text-gray-400 hover:text-red-400 hover:bg-red-400/10" 
                                  : "text-gray-400 hover:text-emerald-400 hover:bg-emerald-400/10"
                              )}
                              title={user.is_active ? "Deactivate" : "Activate"}
                            >
                              {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                          </>
                        )}
                        <button className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {usersData?.meta?.last_page > 1 && (
          <div className="p-4 border-t border-gray-800">
            <Pagination
              currentPage={page}
              totalPages={usersData.meta.last_page}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Profile Detail Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Employee Profile"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-start gap-6 p-6 bg-gray-800/30 rounded-2xl border border-gray-800">
              <img 
                src={selectedUser.avatar_url || `https://ui-avatars.com/api/?name=${selectedUser.first_name}+${selectedUser.last_name}&background=random&size=128`} 
                className="w-24 h-24 rounded-2xl border-2 border-gray-700 shadow-xl" 
                alt="" 
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-100">{fullName(selectedUser)}</h2>
                  <StatusBadge 
                    status={selectedUser.is_active ? 'Active' : 'Deactivated'} 
                    variant={selectedUser.is_active ? 'success' : 'danger'} 
                  />
                </div>
                <p className="text-gray-400 font-medium">{selectedUser.department} • {selectedUser.role.replace('_', ' ').toUpperCase()}</p>
                <p className="text-gray-500 text-sm mt-1">ID: {selectedUser.employee_id}</p>
                
                <div className="flex gap-3 mt-4">
                  <div className="px-3 py-1.5 bg-gray-800 rounded-lg text-xs font-mono text-gray-300 border border-gray-700">
                    {selectedUser.email}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-800 space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={14} className="text-indigo-400" />
                  System Access
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Login:</span>
                    <span className="text-gray-300 font-medium">
                      {selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Account Created:</span>
                    <span className="text-gray-300 font-medium">{formatDate(selectedUser.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-800 space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Shield size={14} className="text-emerald-400" />
                  Security Status
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Role:</span>
                    <span className="text-emerald-400 font-bold capitalize">{selectedUser.role.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Permissions:</span>
                    <span className="text-gray-300">Standard {selectedUser.role} access</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
              <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>Close</Button>
              {canManage && (
                <Button onClick={() => { setIsViewModalOpen(false); handleOpenModal(selectedUser); }}>
                  <Edit2 size={16} />
                  Edit Employee
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedUser ? 'Edit Employee' : 'Add New Employee'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-400">First Name</label>
              <input
                {...register('first_name', { required: true })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500/50"
                placeholder="John"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Last Name</label>
              <input
                {...register('last_name', { required: true })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500/50"
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-400">Email Address</label>
            <input
              {...register('email', { required: true })}
              type="email"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500/50"
              placeholder="john.doe@jvd.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Role</label>
              <select
                {...register('role', { required: true })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500/50"
              >
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Department</label>
              <select
                {...register('department', { required: true })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500/50"
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-400">Employee ID</label>
            <input
              {...register('employee_id', { required: true })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-indigo-500/50"
              placeholder="JVD-2024-001"
            />
          </div>

          {!selectedUser && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-400 flex items-center gap-2">
                <AlertTriangle size={14} />
                A temporary password will be sent to the employee's email.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createUserMutation.isPending || updateUserMutation.isPending}>
              {selectedUser ? 'Update Employee' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
