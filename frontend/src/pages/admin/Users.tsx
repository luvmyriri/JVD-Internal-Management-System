import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LuSearch,
  LuShield,
  LuMail,
  LuPencil,
  LuEye,
  LuLoaderCircle,
  LuUserMinus,
  LuUserCheck,
  LuUsers,
  LuUserPlus,
  LuFileDown,
  LuFileUp,
  LuLock,
  LuTriangleAlert,
  LuBriefcase,
} from 'react-icons/lu';
import { motion } from 'framer-motion';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  useActivateUser,
  useSetPassword,
} from '../../hooks/useUsers';
import { useBuses, useAssignDriverToBus } from '../../hooks/useFleet';
import { useQuery } from '@tanstack/react-query';
import { rolePermissionsApi, type ModulePermission } from '../../api/rolePermissions';

import { Modal, StatusBadge, Pagination, Button, Dropdown } from '../../components/ui';
import { EmployeeName, DataTable, type Column } from '../../components/ds';
import { cn, fullName } from '../../utils';
import { useForm } from 'react-hook-form';
import { loadExcelJS } from '../../utils/lazyExport';
import toast from 'react-hot-toast';
import TempPasswordModal, { type TempPasswordEntry } from './TempPasswordModal';
import UserFormModal from './UserFormModal';
import UserProfileModal from './UserProfileModal';
import { type User, PRESET_TAGS, ROLES, DEPARTMENTS } from './users.constants';

export type { User };

export default function Users() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Debounce search input to avoid redundant API queries
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // Reset page on search change
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pendingUploads, setPendingUploads] = useState<any[] | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [tempPasswords, setTempPasswords] = useState<TempPasswordEntry[]>([]);
  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [assignedBusId, setAssignedBusId] = useState<number | ''>('');
  const [customPermissions, setCustomPermissions] = useState<Record<string, ModulePermission>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addCustomTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      toast.error('Tag already exists');
      return;
    }
    setTags([...tags, trimmed]);
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTag();
    }
  };

  const addPresetTag = (preset: string) => {
    if (!tags.includes(preset)) {
      setTags([...tags, preset]);
    }
  };

  const { user: currentUser, hasPermission } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canCreateUser = hasPermission('users', 'can_create');
  const canEditUser = hasPermission('users', 'can_edit');

  const { data: usersData, isLoading, isPlaceholderData } = useUsers({ 
    search, 
    role: roleFilter, 
    page,
    per_page: 10 
  });

  const { data: configData } = useQuery({
    queryKey: ['role-permissions-config'],
    queryFn: async () => {
      const response = await rolePermissionsApi.index();
      return response.data;
    },
    enabled: isSuperAdmin, // Only fetch if super admin
  });
  const modules = Object.keys(configData?.meta?.modules || {});

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deactivateMutation = useDeactivateUser();
  const activateMutation = useActivateUser();
  const setPasswordMutation = useSetPassword();
  const assignDriverToBus = useAssignDriverToBus();

  // Fetch all buses for the assignment dropdown
  const { data: busesData } = useBuses();
  const allBuses = (busesData?.data ?? []) as any[];

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const watchedRole = watch('role', selectedUser?.role ?? 'reservation_officer');

  const handleOpenModal = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      setValue('first_name', user.first_name);
      setValue('last_name', user.last_name);
      setValue('email', user.email);
      setValue('employee_id', user.employee_id);
      setValue('role', user.role);
      setValue('department', user.department);
      setValue('phone', user.phone || '');
      setTags(user.tags || []);
    } else {
      setSelectedUser(null);
      reset({
        role: 'reservation_officer',
        department: 'Operations',
        send_invitation: true
      });
      setTags([]);
    }
    setTagInput('');
    // Reset password fields whenever modal opens
    setNewPassword('');
    setNewPasswordConfirm('');
    setShowNewPw(false);
    // Pre-fill assigned bus for drivers
    if (user) {
      const currentBus = allBuses.find((b: any) => b.driver?.id === user.id);
      setAssignedBusId(currentBus ? currentBus.id : '');
      // Safely parse or cast custom_permissions — malformed JSON must not crash the panel.
      setCustomPermissions((() => {
        const raw = user.custom_permissions;
        if (!raw) return {};
        if (typeof raw !== 'string') return raw;
        try {
          return JSON.parse(raw);
        } catch {
          console.warn('Invalid custom_permissions JSON for user', user.id);
          return {};
        }
      })());
    } else {
      setAssignedBusId('');
      setCustomPermissions({});
    }
    setIsModalOpen(true);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    // Initialize customPermissions state safely from the user being viewed to avoid leakage
    setCustomPermissions((() => {
      const raw = user.custom_permissions;
      if (!raw) return {};
      if (typeof raw !== 'string') return raw;
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Invalid custom_permissions JSON for user', user.id, e);
        return {};
      }
    })());
    setIsViewModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (selectedUser) {
        // If super_admin filled in a new password, set it first
        if (isSuperAdmin && newPassword.trim()) {
          if (newPassword !== newPasswordConfirm) {
            toast.error('Passwords do not match.');
            return;
          }
          if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters.');
            return;
          }
          await setPasswordMutation.mutateAsync({
            id: selectedUser.id,
            data: { new_password: newPassword, new_password_confirmation: newPasswordConfirm },
          });
        }
        
        const updateData = { ...data, tags };
        if (isSuperAdmin) {
            updateData.custom_permissions = customPermissions;
        }
        
        await updateUserMutation.mutateAsync({ id: selectedUser.id, data: updateData });

        // Handle bus assignment for driver role
        const currentRole = data.role;
        const prevBus = allBuses.find((b: any) => b.driver?.id === selectedUser.id);
        const prevBusId = prevBus?.id ?? null;

        if (currentRole === 'driver') {
          // Role is driver — sync the bus
          if (assignedBusId !== prevBusId) {
            if (assignedBusId) {
              // Assign to new bus (backend atomically handles unassignment from any previous bus)
              await assignDriverToBus.mutateAsync({ busId: Number(assignedBusId), driverId: selectedUser.id });
            } else if (prevBusId) {
              // If new assignment is empty, unassign from the previous bus
              await assignDriverToBus.mutateAsync({ busId: prevBusId, driverId: null });
            }
          }
        } else if (prevBusId) {
          // Role changed away from driver — unassign their bus
          await assignDriverToBus.mutateAsync({ busId: prevBusId, driverId: null });
        }
        setIsModalOpen(false);
        setNewPassword('');
        setNewPasswordConfirm('');
        setCustomPermissions({});
        setTags([]);
        reset();
      } else {
        const sendInvite = data.send_invitation !== false;
        const res = await createUserMutation.mutateAsync({ ...data, tags, send_invitation: sendInvite });
        const tempPw = res?.data?.data?.temporary_password;
        setIsModalOpen(false);
        setTags([]);
        reset();
        // If no invitation sent, show temp password modal
        if (!sendInvite && tempPw) {
          setTempPasswords([{ name: `${data.first_name} ${data.last_name}`, email: data.email, password: tempPw }]);
          setShowTempPasswordModal(true);
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const toggleUserStatus = async (user: User) => {
    if (user.is_active) {
      await deactivateMutation.mutateAsync(user.id);
    } else {
      await activateMutation.mutateAsync(user.id);
    }
  };

  const downloadTemplate = async () => {
    const workbook = new (await loadExcelJS()).Workbook();
    const worksheet = workbook.addWorksheet('Users');
    const dataSheet = workbook.addWorksheet('Data', { state: 'hidden' });

    dataSheet.getColumn(1).values = ['ROLES', ...ROLES.map(r => r.label)];
    dataSheet.getColumn(2).values = ['DEPARTMENTS', ...DEPARTMENTS];

    // Set columns with widths + headers first
    worksheet.columns = [
      { header: 'First Name', key: 'first_name', width: 25 },
      { header: 'Last Name', key: 'last_name', width: 25 },
      { header: 'Email', key: 'email', width: 35 },
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Department', key: 'department', width: 25 },
    ];

    // Style the header row (row 1)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' } 
    };
    headerRow.height = 25;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.commit();

    const roleCount = ROLES.length;
    for (let i = 2; i <= 500; i++) {
      worksheet.getCell(`D${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Data!$A$2:$A$${roleCount + 1}`],
        showErrorMessage: true,
        errorTitle: 'Invalid Role',
        error: 'Please select a role from the dropdown menu.'
      };
      
      worksheet.getCell(`E${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Data!$B$2:$B$${DEPARTMENTS.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Invalid Department',
        error: 'Please select a department from the dropdown menu.'
      };
    }

    const helpSheet = workbook.addWorksheet('Instructions');
    helpSheet.mergeCells('A1:B1');
    const brandCell = helpSheet.getCell('A1');
    brandCell.value = 'JVD SYSTEM ADMINISTRATION';
    brandCell.font = { name: 'Arial Black', size: 14, color: { argb: 'FF1E293B' } };
    brandCell.alignment = { horizontal: 'center' };

    helpSheet.addRow(['BULK USER PROVISIONING GUIDE']);
    helpSheet.getRow(2).font = { bold: true, size: 12, color: { argb: 'FF3B82F6' } };
    helpSheet.addRow(['']);
    helpSheet.addRow(['1. Fill in the "Users" sheet starting from row 2.']);
    helpSheet.addRow(['2. Do not modify or delete the header row.']);
    helpSheet.addRow(['3. Use dropdowns for Role and Department.']);
    
    helpSheet.getColumn(1).width = 40;
    helpSheet.getColumn(2).width = 60;

    // Add example row at row 2 (must use getRow(2) explicitly — addRow goes to row 501
    // because the validation loop already touches rows 2-500 via getCell())
    const exampleRow = worksheet.getRow(2);
    exampleRow.getCell('first_name').value = 'Juan';
    exampleRow.getCell('last_name').value = 'dela cruz';
    exampleRow.getCell('email').value = 'JuanDC@gmail.com';
    exampleRow.getCell('role').value = 'Admin';
    exampleRow.getCell('department').value = 'Administration';
    exampleRow.font = { italic: true, color: { argb: 'FF9CA3AF' } };
    exampleRow.commit();

    workbook.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'JVD_User_Bulk_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Admin template downloaded!');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const workbook = new (await loadExcelJS()).Workbook();
    try {
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      const users: any[] = [];
      const errors_list: string[] = [];

      worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return; // Skip header (row 1) and example row (row 2)

        const first_name = row.getCell(1).text?.trim();
        const last_name = row.getCell(2).text?.trim();
        const email = row.getCell(3).text?.trim();
        const roleLabel = row.getCell(4).text?.trim();
        const department = row.getCell(5).text?.trim();

        const role = ROLES.find(r => r.label === roleLabel || r.value === roleLabel.toLowerCase())?.value;

        if (!first_name && !last_name && !email) return;

        if (!first_name || !last_name || !email || !role || !department) {
          errors_list.push(`Row ${rowNumber}: Incomplete data.`);
          return;
        }

        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        if (!emailRegex.test(email)) {
          errors_list.push(`Row ${rowNumber}: Invalid Email "${email}".`);
          return;
        }

        const matchedDept = DEPARTMENTS.find(d => d.toLowerCase() === department.toLowerCase());
        if (!matchedDept) {
          errors_list.push(`Row ${rowNumber}: Invalid Dept "${department}".`);
          return;
        }

        users.push({
          first_name,
          last_name,
          email,
          role,
          department: matchedDept,
        });
      });

      if (errors_list.length > 0) {
        errors_list.slice(0, 3).forEach(err => toast.error(err));
        e.target.value = '';
        return;
      }

      setPendingUploads(users);
      setIsPreviewModalOpen(true);
      e.target.value = '';
    } catch (err) {
      toast.error('Failed to parse Excel file.');
      e.target.value = '';
    }
  };

  const handleBulkUploadConfirm = async () => {
    if (!pendingUploads) return;
    const users = [...pendingUploads];
    setPendingUploads(null);
    setIsPreviewModalOpen(false);

    const uploadToast = toast.loading(`Provisioning ${users.length} accounts...`);
    let successCount = 0;
    const collectedPasswords: TempPasswordEntry[] = [];
    
    for (const u of users) {
      try {
        // Always use send_invitation: false for bulk — collect temp passwords
        const res = await createUserMutation.mutateAsync({ ...u, send_invitation: false });
        const tempPw = res?.data?.data?.temporary_password;
        if (tempPw) {
          collectedPasswords.push({
            name: `${u.first_name} ${u.last_name}`,
            email: u.email,
            password: tempPw,
          });
        }
        successCount++;
      } catch (err) {
        console.error(err);
      }
    }

    toast.dismiss(uploadToast);
    toast.success(`Registered ${successCount}/${users.length} accounts.`);

    // Show temp passwords if any were generated
    if (collectedPasswords.length > 0) {
      setTempPasswords(collectedPasswords);
      setShowTempPasswordModal(true);
    }
  };

  const getRoleIcon = (role: string) => {
    const roleObj = ROLES.find(r => r.value === role);
    const Icon = roleObj?.icon || LuShield;
    return <Icon className={cn("w-4 h-4", roleObj?.color)} />;
  };

  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'User & ID',
      render: (user) => (
        <EmployeeName name={fullName(user)} src={user.avatar_url} subtitle={user.employee_id} online={user.is_online} size="lg" />
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (user) => (
        <span className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-black tracking-widest uppercase border border-gray-100 dark:border-gray-700">
          {user.department}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm", {
            'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-500': ['super_admin', 'executive_vice_president', 'operations_manager', 'logistics_in_charge', 'dispatcher', 'purchasing_manager', 'service_adviser', 'head_mechanic'].includes(user.role),
            'bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20 text-purple-500': ['corporate_secretary'].includes(user.role),
            'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-500': ['accounting_executive'].includes(user.role),
            'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-500': ['reservation_officer', 'office_staff'].includes(user.role),
            'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-500': user.role === 'driver',
          })}>
            {getRoleIcon(user.role)}
          </div>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200 capitalize">{user.role.replace(/_/g, ' ')}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <StatusBadge
          status={!user.is_active ? 'Deactivated' : (user.is_online ? 'Active' : 'Offline')}
          variant={!user.is_active ? 'danger' : (user.is_online ? 'success' : 'neutral')}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (user) => (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <Dropdown
            items={[
              {
                label: 'View Profile',
                icon: <LuEye size={16} />,
                onClick: () => handleViewUser(user)
              },
              ...(canEditUser ? [
                {
                  label: 'Edit User',
                  icon: <LuPencil size={16} />,
                  onClick: () => handleOpenModal(user)
                },
                {
                  label: user.is_active ? 'Deactivate' : 'Activate',
                  icon: user.is_active ? <LuUserMinus size={16} /> : <LuUserCheck size={16} />,
                  onClick: () => toggleUserStatus(user),
                  variant: user.is_active ? 'danger' as const : 'default' as const
                }
              ] : [])
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800/50 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {usersData?.meta?.total ?? '0'} Users
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            System Administration Portal
          </p>
        </div>
        {canCreateUser && (
          <div className="flex items-center gap-3">
            <div className="flex bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] p-1 shadow-sm overflow-hidden">
               <button 
                 onClick={downloadTemplate}
                 className="flex items-center gap-2 px-5 py-2.5 hover:bg-gray-50 dark:bg-gray-800/60 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all text-[11px] font-black uppercase tracking-widest rounded-xl active:scale-95"
                 title="Download Template"
               >
                 <LuFileDown size={18} className="text-gray-400 dark:text-gray-500 dark:text-gray-400" />
                 <span className="hidden lg:inline">Format</span>
               </button>
               <div className="w-px h-6 bg-gray-100 dark:bg-gray-800 self-center" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 hover:bg-gray-50 dark:bg-gray-800/60 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-500 transition-all text-[11px] font-black uppercase tracking-widest rounded-xl active:scale-95"
                  title="Upload Excel"
                >
                  <LuFileUp size={18} />
                  <span className="hidden lg:inline">Bulk Upload</span>
                </button>
            </div>
            
            <Button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-6">
              <LuUserPlus size={18} /> Add User
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: usersData?.meta?.total || 0, icon: LuUsers, from: 'from-blue-500', to: 'to-blue-700', shadow: 'shadow-blue-300/40 dark:shadow-blue-900/40' },
          { label: 'Active Now', value: usersData?.data?.filter((u: User) => u.is_online).length || 0, icon: LuUserCheck, from: 'from-emerald-400', to: 'to-emerald-600', shadow: 'shadow-emerald-300/40 dark:shadow-emerald-900/40' },
          { label: 'Departments', value: DEPARTMENTS.length, icon: LuBriefcase, from: 'from-violet-500', to: 'to-purple-700', shadow: 'shadow-violet-300/40 dark:shadow-violet-900/40' },
          { label: 'Access Control', value: ROLES.length, icon: LuLock, from: 'from-amber-400', to: 'to-orange-600', shadow: 'shadow-amber-300/40 dark:shadow-amber-900/40' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br ${stat.from} ${stat.to} text-white shadow-xl ${stat.shadow} flex flex-col gap-4 group hover:scale-[1.02] transition-all cursor-default`}
          >
            <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/20" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="flex items-start justify-between relative z-10">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <stat.icon size={22} className="text-white" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{stat.label}</p>
              <p className="text-3xl font-black tracking-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 max-w-md flex-1">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 dark:text-gray-400">
              <LuSearch size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by name, ID or email..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 dark:text-gray-200"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <select 
            value={roleFilter} 
            onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-900 font-medium text-gray-600 dark:text-gray-300 appearance-none min-w-[150px]"
          >
            <option value="">All Roles</option>
            {ROLES.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm relative min-h-[400px] overflow-hidden">
        {isPlaceholderData && (
          <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
            <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
          </div>
        )}
        <DataTable
          columns={columns}
          data={usersData?.data ?? []}
          rowKey={(user) => user.id}
          className={cn('border-0 rounded-none', isPlaceholderData && 'opacity-60 pointer-events-none saturate-50')}
          empty={
            isLoading ? (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <LuLoaderCircle size={24} className="animate-spin mb-2 text-blue-500" />
                <p className="text-sm font-medium uppercase tracking-widest">Syncing Registry...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <LuUsers size={32} strokeWidth={1.5} className="mb-3 text-gray-300" />
                <p className="text-sm font-medium">No users found.</p>
              </div>
            )
          }
        />

        {usersData?.meta && (
          <div className="p-8 border-t border-gray-50 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-800/30">
            <Pagination
              currentPage={page}
              lastPage={usersData.meta.last_page}
              total={usersData.meta.total}
              perPage={usersData.meta.per_page}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedUser={selectedUser}
        isSuperAdmin={isSuperAdmin}
        allBuses={allBuses}
        modules={modules}
        configData={configData}
        register={register}
        handleSubmit={handleSubmit}
        onSubmit={onSubmit}
        errors={errors}
        watchedRole={watchedRole}
        isSubmitting={createUserMutation.isPending || updateUserMutation.isPending}
        tags={tags}
        tagInput={tagInput}
        setTagInput={setTagInput}
        addCustomTag={addCustomTag}
        removeTag={removeTag}
        handleTagKeyDown={handleTagKeyDown}
        addPresetTag={addPresetTag}
        assignedBusId={assignedBusId}
        setAssignedBusId={setAssignedBusId}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        newPasswordConfirm={newPasswordConfirm}
        setNewPasswordConfirm={setNewPasswordConfirm}
        showNewPw={showNewPw}
        setShowNewPw={setShowNewPw}
        customPermissions={customPermissions}
        setCustomPermissions={setCustomPermissions}
      />

      {/* View User Modal */}
      <UserProfileModal
        user={selectedUser}
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        customPermissions={customPermissions}
        configData={configData}
        modules={modules}
        watchedRole={watchedRole}
        canEditUser={canEditUser}
        onEdit={handleOpenModal}
      />
      <Modal 
        isOpen={isPreviewModalOpen} 
        onClose={() => setIsPreviewModalOpen(false)}
        title="Bulk Registration Preview"
        size="xl"
      >
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-[1.5rem] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <LuTriangleAlert size={20} className="text-amber-500" />
              <p className="text-xs text-amber-700 dark:text-amber-500 font-bold uppercase tracking-tight">
                Review Data: {pendingUploads?.length} users detected.
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-500/20 shadow-sm">
              <LuMail size={14} className="text-blue-500" />
              {/* Bulk provisioning always generates temporary passwords (no invitation emails). */}
              <span className="text-[9px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest">Temp Passwords Generated</span>
            </div>
          </div>

          <div className="border border-gray-100 dark:border-gray-800 rounded-[2rem] overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-widest">User Details</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-widest">Email Address</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-widest">Role & Dept</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {pendingUploads?.map((u, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:bg-gray-800/60 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-gray-900 dark:text-white">{u.first_name} {u.last_name}</p>
                        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">{u.employee_id || '[Generated sequentially by Backend]'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{u.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500 text-[9px] font-black uppercase border border-blue-100 dark:border-blue-500/20">
                            {u.role}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase ml-0.5">
                            {u.department}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={() => setIsPreviewModalOpen(false)}>Abort Upload</Button>
            <Button onClick={handleBulkUploadConfirm} className="px-8 shadow-lg shadow-blue-200 dark:shadow-none">
              Confirm & Register All
            </Button>
          </div>
        </div>
      </Modal>
      {showTempPasswordModal && tempPasswords.length > 0 && (
        <TempPasswordModal
          entries={tempPasswords}
          onClose={() => { setShowTempPasswordModal(false); setTempPasswords([]); }}
        />
      )}
    </div>
  );
}

