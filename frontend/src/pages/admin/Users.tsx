import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
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
  LuGlobe,
  LuCopy,
  LuKeyRound,
  LuCheckCheck,
  LuEyeOff,
  LuEye as LuEyeOn,
  LuBus,
  LuChevronRight,
  LuX,
} from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
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
import { type UserRole } from '../../types/auth';

import { Modal, StatusBadge, Pagination, Button, Dropdown } from '../../components/ui';
import { cn, fullName, formatDate } from '../../utils';
import { useForm } from 'react-hook-form';
import { loadExcelJS } from '../../utils/lazyExport';
import toast from 'react-hot-toast';

// ── Temp Password Modal ───────────────────────────────────────────────────────
interface TempPasswordEntry { name: string; email: string; password: string; }
function TempPasswordModal({ entries, onClose }: { entries: TempPasswordEntry[]; onClose: () => void }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const copyAll = () => {
    const text = entries.map(e => `${e.name} | ${e.email} | ${e.password}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('All credentials copied!');
  };
  const copyOne = (idx: number, pw: string) => {
    navigator.clipboard.writeText(pw);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };
  return (
    <Modal isOpen onClose={onClose} title="Temporary Passwords" size="lg">
      <div className="space-y-5 p-2">
        {/* Warning banner */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl">
          <LuKeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-800 dark:text-amber-300">✉️ Email sent + backup copy below</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">Credentials were emailed to each employee. Save this backup. Employees will be forced to change their password on first login.</p>
          </div>
        </div>

        {/* Password list */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {entries.map((e, idx) => (
            <div key={idx} className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">{e.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{e.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono font-bold text-blue-600 dark:text-blue-400 tracking-widest">
                  {e.password}
                </code>
                <button
                  onClick={() => copyOne(idx, e.password)}
                  className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors border border-blue-100 dark:border-blue-500/20"
                  title="Copy password"
                >
                  {copiedIdx === idx ? <LuCheckCheck className="w-4 h-4" /> : <LuCopy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={copyAll} className="flex items-center gap-2">
            <LuCopy className="w-4 h-4" /> Copy All
          </Button>
          <Button onClick={onClose}>Done — I've Saved These</Button>
        </div>
      </div>
    </Modal>
  );
}

interface User {
  id: number;
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  department: string;
  is_active: boolean;
  is_online?: boolean;
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
  custom_permissions?: any;
  effective_permissions?: any;
  tags?: string[];
}

const PRESET_TAGS = [
  { value: 'access:general', label: 'Access: General' },
  { value: 'access:personalized', label: 'Access: Personalized' },
  { value: 'process:approve_commission', label: 'Approve Commission' },
  { value: 'process:approve_cash_budget', label: 'Approve Cash Budget' },
  { value: 'process:disburse_cash_budget', label: 'Disburse Cash Budget' },
  { value: 'process:settle_liquidation', label: 'Settle Liquidation' },
];

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', icon: LuShieldCheck, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { value: 'executive_vice_president', label: 'Executive VP', icon: LuShield, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { value: 'operations_manager', label: 'Operations Manager', icon: LuShieldCheck, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { value: 'reservation_officer', label: 'Reservation Officer', icon: LuBriefcase, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { value: 'office_staff', label: 'Office Staff', icon: LuBriefcase, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { value: 'accounting_executive', label: 'Accounting Executive', icon: LuBadgeCheck, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { value: 'corporate_secretary', label: 'Corporate Secretary', icon: LuUsers, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { value: 'logistics_in_charge', label: 'Logistics In Charge', icon: LuShield, color: 'text-lime-500', bg: 'bg-lime-500/10' },
  { value: 'dispatcher', label: 'Dispatcher', icon: LuShield, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10' },
  { value: 'purchasing_manager', label: 'Purchasing Manager', icon: LuShield, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { value: 'service_adviser', label: 'Service Adviser', icon: LuShield, color: 'text-stone-500', bg: 'bg-stone-500/10' },
  { value: 'head_mechanic', label: 'Head Mechanic', icon: LuShield, color: 'text-neutral-500', bg: 'bg-neutral-500/10' },
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
                      className={`group relative hover:bg-blue-50/30 dark:hover:bg-gray-800/50 transition-all border-b border-gray-50 dark:border-gray-800/50 last:border-0 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img 
                              src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=f8fafc&color=3b82f6&bold=true`} 
                              className="w-11 h-11 rounded-2xl border-2 border-white dark:border-gray-800 shadow-sm object-cover" 
                              alt="" 
                            />
                            {user.is_online && (
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
                      </td>
                      <td className="px-8 py-6">
                        <StatusBadge 
                          status={!user.is_active ? 'Deactivated' : (user.is_online ? 'Active' : 'Offline')}
                          variant={!user.is_active ? 'danger' : (user.is_online ? 'success' : 'neutral')}
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
        size="lg"
      >
        <div className="overflow-y-auto custom-scrollbar max-h-[75vh] p-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span>Basic Information</span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1 space-y-6">
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
              </div>
            </details>

            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mt-4">
                <span className="flex items-center gap-1.5"><LuShieldCheck className="text-blue-500" /> Account Tags & Attributes</span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1 space-y-4">
                {/* Visual bubbles of current tags */}
                <div className="flex flex-wrap gap-2 min-h-[48px] p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800">
                  {tags.length === 0 ? (
                    <span className="text-xs text-gray-400 font-medium italic my-auto">No tags assigned. Default fallback (personalized access only) will apply.</span>
                  ) : (
                    tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full border border-blue-100 dark:border-blue-500/20">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-800 dark:hover:text-blue-200 shrink-0">
                          <LuX className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Input to add tag */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter custom tag (e.g. access:logistics:general)..."
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <Button type="button" onClick={addCustomTag} variant="secondary" className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider">Add</Button>
                </div>

                {/* Quick-select options */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quick Add Preset Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_TAGS.map(preset => {
                      const exists = tags.includes(preset.value);
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          disabled={exists}
                          onClick={() => addPresetTag(preset.value)}
                          className={cn(
                            "px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all active:scale-95",
                            exists
                              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed"
                              : "bg-white hover:bg-blue-50/50 dark:bg-gray-900 dark:hover:bg-blue-500/10 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 border-gray-200 dark:border-gray-800"
                          )}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </details>

          {/* ── Assigned Bus (driver role only) ── */}
          {(watchedRole === 'driver' || selectedUser?.role === 'driver') && watchedRole === 'driver' && (
            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mt-4">
                <span className="flex items-center gap-1.5"><LuBus className="text-indigo-500" /> Driver Assignment</span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1 space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Bus</label>
                <select
                  value={assignedBusId}
                  onChange={e => setAssignedBusId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">— None / Unassigned —</option>
                  {allBuses
                    .filter((b: any) => b.status !== 'decommissioned')
                    .map((bus: any) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.plate_number} · {bus.model}
                        {bus.driver && bus.driver.id !== selectedUser?.id
                          ? ` (Assigned to ${bus.driver.first_name} ${bus.driver.last_name})`
                          : ''}
                      </option>
                    ))}
                </select>
                {assignedBusId && allBuses.find((b: any) => b.id === Number(assignedBusId))?.driver?.id &&
                  allBuses.find((b: any) => b.id === Number(assignedBusId))?.driver?.id !== selectedUser?.id && (
                  <p className="text-[10px] font-bold text-amber-500 ml-1">
                    ⚠ This bus is currently assigned to another driver. Saving will reassign it.
                  </p>
                )}
              </div>
            </details>
          )}

          {/* ── Super Admin: Set Password (edit mode only) ── */}
          {selectedUser && isSuperAdmin && (
            <details className="group" open>
              <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mt-4">
                <span className="flex items-center gap-1.5 text-rose-500"><LuKeyRound className="text-rose-500" /> Super Admin — Set Password</span>
                <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
              </summary>
              <div className="pt-4 px-1 space-y-3">
                <div className="space-y-3 p-4 bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-2xl">
                  <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">
                    Leave blank to keep the existing password unchanged.
                  </p>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
                        placeholder="Min. 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPw ? <LuEyeOff size={16} /> : <LuEyeOn size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPasswordConfirm}
                      onChange={e => setNewPasswordConfirm(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
                      placeholder="Re-enter new password"
                    />
                  </div>

                  {newPassword && newPasswordConfirm && newPassword !== newPasswordConfirm && (
                    <p className="text-[10px] font-bold text-rose-500 ml-1">⚠ Passwords do not match.</p>
                  )}
                  {newPassword && newPassword.length < 8 && (
                    <p className="text-[10px] font-bold text-amber-500 ml-1">⚠ Must be at least 8 characters.</p>
                  )}
                  {newPassword && newPassword.length >= 8 && newPassword === newPasswordConfirm && (
                    <p className="text-[10px] font-bold text-emerald-500 ml-1">✓ Passwords match.</p>
                  )}
                </div>
              </div>
            </details>
          )}

          {/* ── Super Admin: Custom Permissions ── */}
          {selectedUser && isSuperAdmin && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                  <LuShieldCheck size={12} /> Custom Permissions (Overrides Role)
                </span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                 {modules.map((module: string) => {
                     const perms = customPermissions[module];
                     
                     // Determine current access level
                     let accessLevel = 'default';
                     if (perms) {
                         if (!perms.can_view && !perms.can_create && !perms.can_edit && !perms.can_delete) {
                             accessLevel = 'none';
                         } else if (perms.can_view && !perms.can_create && !perms.can_edit && !perms.can_delete) {
                             accessLevel = 'view';
                         } else {
                             accessLevel = 'full';
                         }
                     }

                     const basePerms = configData?.data?.[selectedUser?.role || watchedRole]?.[module];
                     let baseAccessLevel = 'none';
                     if (basePerms) {
                         if (basePerms.can_view && !basePerms.can_create && !basePerms.can_edit && !basePerms.can_delete) {
                             baseAccessLevel = 'view';
                         } else if (basePerms.can_view) {
                             baseAccessLevel = 'full';
                         }
                     }

                     const effectiveAccessLevel = accessLevel === 'default' ? baseAccessLevel : accessLevel;

                     const handleLevelChange = (level: string) => {
                         setCustomPermissions(prev => {
                             const updated = { ...prev };
                             if (level === 'default') {
                                 delete updated[module];
                             } else if (level === 'none') {
                                 updated[module] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
                             } else if (level === 'view') {
                                 updated[module] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
                             } else if (level === 'full') {
                                 updated[module] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                             }
                             return updated;
                         });
                     };

                     const moduleName = configData?.meta?.modules?.[module] || module.replace(/_/g, ' ');

                     return (
                         <div key={module} className={cn(
                           "flex flex-col p-2.5 rounded-xl border transition-colors",
                           effectiveAccessLevel === 'none' ? "bg-gray-50/50 border-gray-100 dark:bg-gray-800/50 dark:border-gray-700" :
                           effectiveAccessLevel === 'view' ? "bg-blue-50/50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30" :
                           "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30"
                         )}>
                             <div className="flex items-center gap-1.5 mb-2">
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                    effectiveAccessLevel === 'none' ? 'bg-red-400' : 
                                    effectiveAccessLevel === 'view' ? 'bg-blue-400' : 'bg-emerald-400'
                                )} />
                                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 capitalize truncate">
                                  {moduleName}
                                </span>
                             </div>
                             
                             <select
                               value={accessLevel}
                               onChange={(e) => handleLevelChange(e.target.value)}
                               className="w-full text-[10px] font-bold p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                             >
                               <option value="default">Default ({baseAccessLevel})</option>
                               <option value="none">No Access</option>
                               <option value="view">View Only</option>
                               <option value="full">Full Access</option>
                             </select>
                         </div>
                     );
                 })}
              </div>
            </div>
          )}

          {!selectedUser && (
            <div className="space-y-4">
              <label htmlFor="send_invitation" className="flex items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-blue-50/50 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
                <div className="flex-1">
                  <div className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">
                    Send Account Invitation
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">
                    Invite user via email to set their own password
                  </p>
                </div>
                <div className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    {...register('send_invitation')}
                    id="send_invitation"
                    className="sr-only peer"
                    defaultChecked={true}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </div>
              </label>

              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-[1.5rem] flex items-start gap-3">
                <LuKeyRound size={18} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                  <span className="font-black">Unchecked = Temp Password.</span> If invitation is disabled, a temporary password will be generated and shown to you immediately after account creation.
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
              {selectedUser ? 'Save' : 'Register User'}
            </Button>
          </div>
        </form>
        </div>
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
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 capitalize">{selectedUser.role.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">System Origin</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                      <LuGlobe size={12} className="text-gray-400 dark:text-gray-500 dark:text-gray-400" /> Internal Network
                    </span>
                  </div>

                  {selectedUser.tags && selectedUser.tags.length > 0 && (
                    <div className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-850">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Account Tags / Attributes</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedUser.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-md border border-blue-100/50 dark:border-blue-800/40">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedUser.effective_permissions && Object.keys(selectedUser.effective_permissions).length > 0 && (
                    <details className="group" open>
                      <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mt-4">
                        <span className="flex items-center gap-1.5 text-emerald-500"><LuShieldCheck className="text-emerald-500" /> Custom Permissions (Overrides Role)</span>
                        <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
                      </summary>
                      <div className="pt-4 px-1">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                           {modules.map((module: string) => {
                               const perms = customPermissions[module];
                               
                               // Determine current access level
                               let accessLevel = 'default';
                               if (perms) {
                                   if (!perms.can_view && !perms.can_create && !perms.can_edit && !perms.can_delete) {
                                       accessLevel = 'none';
                                   } else if (perms.can_view && !perms.can_create && !perms.can_edit && !perms.can_delete) {
                                       accessLevel = 'view';
                                   } else {
                                       accessLevel = 'full';
                                   }
                               }
        
                               const basePerms = configData?.data?.[selectedUser?.role || watchedRole]?.[module];
                               let baseAccessLevel = 'none';
                               if (basePerms) {
                                   if (basePerms.can_view && !basePerms.can_create && !basePerms.can_edit && !basePerms.can_delete) {
                                       baseAccessLevel = 'view';
                                   } else if (basePerms.can_view) {
                                       baseAccessLevel = 'full';
                                   }
                               }
        
                               return (
                                 <div key={module} className="p-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col gap-2">
                                     <div className="flex items-center gap-2">
                                         <span className="text-xs font-bold text-gray-700 dark:text-gray-300 capitalize">{module.replace(/_/g, ' ')}</span>
                                         <span className="ml-auto text-[9px] font-black text-gray-400 uppercase tracking-widest">Base: {baseAccessLevel}</span>
                                     </div>
                                     <select
                                         disabled
                                         value={accessLevel}
                                         className="w-full px-2 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 text-[10px] font-bold bg-gray-50/50 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-not-allowed"
                                     >
                                         <option value="default">Use Role Default</option>
                                         <option value="none">No Access</option>
                                         <option value="view">View Only</option>
                                         <option value="full">Full Access</option>
                                     </select>
                                 </div>
                               );
                           })}
                        </div>
                        
                        <div className="mt-4 p-3 bg-amber-50/50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl">
                          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            * Modifying these permissions will override the user's role-based access for the specific module.
                          </p>
                          
                          {Object.keys(customPermissions).length > 0 && (
                            <div className="mt-3 space-y-1">
                              <p className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest">Active Overrides:</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(customPermissions).map(([mod, perms]) => {
                                   let level = "View";
                                   if (perms.can_create && perms.can_edit && perms.can_delete) level = "Full";
                                   else if (perms.can_create || perms.can_edit) level = "Limited";
                                   
                                   return (
                                     <div key={mod} className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-[10px] font-bold text-gray-700 dark:text-gray-300 capitalize flex items-center gap-1">
                                       {mod.replace(/_/g, ' ')} 
                                       <span className={cn(
                                         "text-[9px] px-1 rounded-sm",
                                         level === 'Full' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" :
                                         level === 'View' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" :
                                         "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                                       )}>{level}</span>
                                     </div>
                                   );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </details>
                  )}
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
              {canEditUser && (
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

