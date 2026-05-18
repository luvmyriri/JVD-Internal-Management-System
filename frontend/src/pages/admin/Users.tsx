import { useState } from 'react';
import { 
  LuSearch, 
  LuShieldCheck, 
  LuMail, 
  LuBadgeCheck,
  LuShield,
  LuBriefcase,
  LuPencil,
  LuEye,
  LuLoaderCircle,
  LuTruck,
  LuUserMinus,
  LuUserCheck,
  LuUsers,
  LuActivity,
  LuUserPlus,
  LuFileDown,
  LuFileUp,
  LuLock,
  LuTriangleAlert,
  LuGlobe
} from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useUsers, 
  useCreateUser, 
  useUpdateUser, 
  useDeactivateUser, 
  useActivateUser 
} from '../../hooks/useUsers';
import { useHasRole } from '../../hooks/useHasRole';
import { Modal, StatusBadge, Pagination, Button, Dropdown } from '../../components/ui';
import { cn, fullName, formatDate } from '../../utils';
import { useForm } from 'react-hook-form';
import ExcelJS from 'exceljs';
import toast from 'react-hot-toast';
import { useRef } from 'react';

interface User {
  id: number;
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'super_admin' | 'admin' | 'human_resource' | 'accounting' | 'agent' | 'driver';
  department: string;
  is_active: boolean;
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
}

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', icon: LuShieldCheck, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { value: 'admin', label: 'Admin', icon: LuShield, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { value: 'human_resource', label: 'HR', icon: LuUsers, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { value: 'accounting', label: 'Accounting', icon: LuBadgeCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { value: 'agent', label: 'Agent', icon: LuBriefcase, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { value: 'driver', label: 'Driver', icon: LuTruck, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
];

const DEPARTMENTS = [
  'Administration',
  'Accounting',
  'Operations',
  'Maintenance',
  'Human Resources',
  'Logistics',
];



export default function Users() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pendingUploads, setPendingUploads] = useState<any[] | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = useHasRole(['super_admin', 'admin']);
  const canManage = isAdmin;

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
      setValue('employee_id', user.employee_id);
      setValue('role', user.role);
      setValue('department', user.department);
    } else {
      setSelectedUser(null);
      reset({
        role: 'agent',
        department: 'Operations',
        send_invitation: true,
        employee_id: `JVD-EMP-${Math.floor(1000 + Math.random() * 9000)}`
      });
    }
    setIsModalOpen(true);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (selectedUser) {
        await updateUserMutation.mutateAsync({ id: selectedUser.id, data });
      } else {
        await createUserMutation.mutateAsync({ ...data, send_invitation: true });
      }
      setIsModalOpen(false);
      reset();
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
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');
    const dataSheet = workbook.addWorksheet('Data', { state: 'hidden' });

    dataSheet.getColumn(1).values = ['ROLES', ...ROLES.map(r => r.label)];
    dataSheet.getColumn(2).values = ['DEPARTMENTS', ...DEPARTMENTS];

    const headerRow = worksheet.getRow(1);
    headerRow.values = ['First Name', 'Last Name', 'Email', 'Role', 'Department'];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' } 
    };
    headerRow.height = 25;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    worksheet.columns = [
      { key: 'first_name', width: 25 },
      { key: 'last_name', width: 25 },
      { key: 'email', width: 35 },
      { key: 'role', width: 20 },
      { key: 'department', width: 25 },
    ];

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

    worksheet.addRow(['John', 'Doe', 'j.doe@jvd.com', 'Admin', 'Administration']);

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

    const workbook = new ExcelJS.Workbook();
    try {
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      const users: any[] = [];
      const errors_list: string[] = [];

      worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

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
          employee_id: `JVD-EMP-${Math.floor(1000 + Math.random() * 9000)}`
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
    
    for (const u of users) {
      try {
        await createUserMutation.mutateAsync({ ...u, send_invitation: true });
        successCount++;
      } catch (err) {
        console.error(err);
      }
    }

    toast.dismiss(uploadToast);
    toast.success(`Registered ${successCount}/${users.length} accounts.`);
  };

  const getRoleIcon = (role: string) => {
    const roleObj = ROLES.find(r => r.value === role);
    const Icon = roleObj?.icon || LuShield;
    return <Icon className={cn("w-4 h-4", roleObj?.color)} />;
  };

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
        {canManage && (
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
          { label: 'Active Now', value: usersData?.data?.filter((u: User) => u.is_active).length || 0, icon: LuUserCheck, from: 'from-emerald-400', to: 'to-emerald-600', shadow: 'shadow-emerald-300/40 dark:shadow-emerald-900/40' },
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-sm relative min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800 uppercase tracking-widest text-[10px]">
                <th className="px-8 py-5">User & ID</th>
                <th className="px-8 py-5">Department</th>
                <th className="px-8 py-5">Role</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400">
                    <LuLoaderCircle size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-sm font-medium uppercase tracking-widest">Syncing Registry...</p>
                  </td>
                </tr>
              ) : usersData?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400">
                    <LuUsers size={32} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">No users found.</p>
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {usersData?.data?.map((user: User, idx: number) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.03 }}
                      key={user.id} 
                      className="group hover:bg-blue-50/30 dark:hover:bg-gray-800/50 transition-all border-b border-gray-50 dark:border-gray-800/50 last:border-0"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img 
                              src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=f8fafc&color=3b82f6&bold=true`} 
                              className="w-11 h-11 rounded-2xl border-2 border-white dark:border-gray-800 shadow-sm object-cover" 
                              alt="" 
                            />
                            {user.is_active && (
                              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full shadow-sm" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white text-base">{fullName(user)}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{user.employee_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-black tracking-widest uppercase border border-gray-100 dark:border-gray-700">
                          {user.department}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm", {
                            'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-500': user.role === 'admin' || user.role === 'super_admin',
                            'bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20 text-purple-500': user.role === 'human_resource',
                            'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-500': user.role === 'accounting',
                            'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-500': user.role === 'agent',
                            'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-500': user.role === 'driver',
                          })}>
                            {getRoleIcon(user.role)}
                          </div>
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-200 capitalize">{user.role.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <StatusBadge 
                          status={user.is_active ? 'Active' : 'Deactivated'}
                          variant={user.is_active ? 'success' : 'danger'}
                        />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center">
                          <Dropdown 
                            items={[
                              { 
                                label: 'View Profile', 
                                icon: <LuEye size={16} />, 
                                onClick: () => handleViewUser(user) 
                              },
                              ...(canManage ? [
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
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

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
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedUser ? 'Modify User' : 'Add User'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">First Name</label>
              <input
                {...register('first_name', { 
                  required: 'First name is required',
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/[^A-Za-z\s-']/g, '');
                  },
                  pattern: {
                    value: /^[A-Za-z\s-']+$/i,
                    message: 'Numbers are not allowed'
                  }
                })}
                className={cn(
                  "w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                  errors.first_name && "border-red-300 bg-red-50/30"
                )}
                placeholder="e.g. John"
              />
              {errors.first_name && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.first_name.message as string}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
              <input
                {...register('last_name', { 
                  required: 'Last name is required',
                  onChange: (e) => {
                    e.target.value = e.target.value.replace(/[^A-Za-z\s-']/g, '');
                  },
                  pattern: {
                    value: /^[A-Za-z\s-']+$/i,
                    message: 'Numbers are not allowed'
                  }
                })}
                className={cn(
                  "w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                  errors.last_name && "border-red-300 bg-red-50/30"
                )}
                placeholder="e.g. Doe"
              />
              {errors.last_name && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.last_name.message as string}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Corporate Email</label>
            <input
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address"
                }
              })}
              className={cn(
                "w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                errors.email && "border-red-300 bg-red-50/30"
              )}
              placeholder="john.doe@jvd.com"
            />
            {errors.email && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.email.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Role</label>
              <select
                {...register('role', { required: 'Role is required' })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
              <select
                {...register('department', { required: 'Department is required' })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {!selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-blue-50/50 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    {...register('send_invitation')}
                    id="send_invitation"
                    className="w-5 h-5 rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-blue-600 focus:ring-blue-500/20 transition-all cursor-pointer"
                    defaultChecked={true}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="send_invitation" className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest cursor-pointer">
                    Send Account Invitation
                  </label>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                    Invite user via email to set their own password
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-[1.5rem] flex items-start gap-3">
                <LuTriangleAlert size={18} className="text-blue-500 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed font-medium">
                  System will generate a unique entry and send secure onboarding credentials to the specified email address.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              isLoading={createUserMutation.isPending || updateUserMutation.isPending}
            >
              {selectedUser ? 'Commit Changes' : 'Register User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View User Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="User Identity"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-8 p-2">
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-700" />
              
              <div className="relative">
                <img 
                  src={selectedUser.avatar_url || `https://ui-avatars.com/api/?name=${selectedUser.first_name}+${selectedUser.last_name}&background=ffffff&color=3b82f6&size=256&bold=true`} 
                  className="w-32 h-32 rounded-[2rem] border-4 border-white dark:border-gray-800 shadow-2xl object-cover relative z-10" 
                  alt="" 
                />
                <div className={cn(
                  "absolute -bottom-2 -right-2 w-8 h-8 rounded-2xl border-4 border-white dark:border-gray-800 shadow-lg z-20 flex items-center justify-center text-white",
                  selectedUser.is_active ? "bg-emerald-500" : "bg-rose-500"
                )}>
                  {selectedUser.is_active ? <LuUserCheck size={14} /> : <LuUserMinus size={14} />}
                </div>
              </div>

              <div className="flex-1 text-center md:text-left relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{fullName(selectedUser)}</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
                      <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100 dark:border-blue-500/20">
                        {selectedUser.department}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-gray-200 dark:border-gray-700">
                        {ROLES.find(r => r.value === selectedUser.role)?.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm text-sm font-bold text-gray-600 dark:text-gray-300">
                    <LuMail size={16} className="text-blue-500" /> {selectedUser.email}
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm text-sm font-bold text-gray-600 dark:text-gray-300">
                    <LuBadgeCheck size={16} className="text-emerald-500" /> {selectedUser.employee_id}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <LuActivity size={16} className="text-blue-500" />
                  System Access
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Last Login</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white">
                      {selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never Active'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Registered</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white">{formatDate(selectedUser.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <LuShield size={16} className="text-emerald-500" />
                  Security Level
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-emerald-50/50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500">Access Tier</span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 capitalize">{selectedUser.role.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">System Origin</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                      <LuGlobe size={12} className="text-gray-400 dark:text-gray-500 dark:text-gray-400" /> Internal Network
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 mt-4">
              <Button 
                variant="secondary"
                onClick={() => setIsViewModalOpen(false)}
                className="px-8"
              >
                Close Profile
              </Button>
              {canManage && (
                <Button 
                  onClick={() => { setIsViewModalOpen(false); handleOpenModal(selectedUser); }}
                  className="px-8 flex items-center gap-2 shadow-lg shadow-blue-100 dark:shadow-none"
                >
                  <LuPencil size={16} /> Edit User
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

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
              <span className="text-[9px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest">Invitations Enabled</span>
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
                        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">{u.employee_id}</p>
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
    </div>
  );
}

