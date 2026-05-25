import { useState, useRef } from 'react';
import { 
  LuUsers, 
  LuSearch, 
  LuUserPlus, 
  LuUserCheck, 
  LuUserX, 
  LuMail, 
  LuBadgeCheck,
  LuShield,
  LuBriefcase,
  LuPencil,
  LuLock,
  LuEye,
  LuActivity,
  LuTriangleAlert,
  LuLoaderCircle,
  LuGlobe,
  LuTruck,
  LuFileDown,
  LuFileUp,
  LuCopy,
  LuKeyRound,
  LuCheckCheck,
  LuChevronRight,
} from 'react-icons/lu';
import { motion } from 'framer-motion';
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
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl">
          <LuKeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-800 dark:text-amber-300">✉️ Email sent + backup copy below</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">Credentials were emailed to each employee. Save this backup. Employees will be forced to change their password on first login.</p>
          </div>
        </div>
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {entries.map((e, idx) => (
            <div key={idx} className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm space-y-2">
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white">{e.name}</p>
                <p className="text-[10px] text-gray-400 font-bold">{e.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono font-bold text-blue-600 dark:text-blue-400 tracking-widest">
                  {e.password}
                </code>
                <button
                  onClick={() => copyOne(idx, e.password)}
                  className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors border border-blue-100 dark:border-blue-500/20"
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
  role: 'super_admin' | 'admin' | 'human_resource' | 'accounting' | 'agent' | 'driver';
  department: string;
  is_active: boolean;
  is_online?: boolean;
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin', icon: LuShield, color: 'text-blue-500' },
  { value: 'human_resource', label: 'HR', icon: LuUsers, color: 'text-purple-500' },
  { value: 'accounting', label: 'Accounting', icon: LuBadgeCheck, color: 'text-emerald-500' },
  { value: 'agent', label: 'Agent', icon: LuBriefcase, color: 'text-amber-500' },
  { value: 'driver', label: 'Driver', icon: LuTruck, color: 'text-indigo-500' },
  { value: 'operations_manager', label: 'Operations Manager', icon: LuShield, color: 'text-cyan-500' },
  { value: 'reservation_officer', label: 'Reservation Officer', icon: LuBriefcase, color: 'text-orange-500' },
  { value: 'office_staff', label: 'Office Staff', icon: LuBriefcase, color: 'text-yellow-500' },
  { value: 'accounting_executive', label: 'Accounting Executive', icon: LuBadgeCheck, color: 'text-teal-500' },
  { value: 'corporate_secretary', label: 'Corporate Secretary', icon: LuUsers, color: 'text-pink-500' },
  { value: 'logistics_in_charge', label: 'Logistics In Charge', icon: LuShield, color: 'text-lime-500' },
  { value: 'dispatcher', label: 'Dispatcher', icon: LuShield, color: 'text-fuchsia-500' },
  { value: 'purchasing_manager', label: 'Purchasing Manager', icon: LuShield, color: 'text-sky-500' },
  { value: 'service_adviser', label: 'Service Adviser', icon: LuShield, color: 'text-stone-500' },
  { value: 'head_mechanic', label: 'Head Mechanic', icon: LuShield, color: 'text-neutral-500' },
];

const DEPARTMENTS = [
  'Administration',
  'Accounting',
  'Operations',
  'Maintenance',
  'Human Resources',
  'Logistics',
];

export default function Employees() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pendingUploads, setPendingUploads] = useState<any[] | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [tempPasswords, setTempPasswords] = useState<TempPasswordEntry[]>([]);
  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      reset({
        role: 'agent',
        department: 'Operations',
        send_invitation: true,
        employee_id: `JVD-EMP-${Math.floor(1000 + Math.random() * 9000)}`
      });
    }
    setIsModalOpen(true);
  };

  const handleViewProfile = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (selectedUser) {
        await updateUserMutation.mutateAsync({ id: selectedUser.id, data });
        setIsModalOpen(false);
      } else {
        const sendInvite = data.send_invitation !== false;
        const res = await createUserMutation.mutateAsync({ ...data, send_invitation: sendInvite });
        const tempPw = res?.data?.data?.temporary_password;
        setIsModalOpen(false);
        if (!sendInvite && tempPw) {
          setTempPasswords([{ name: `${data.first_name} ${data.last_name}`, email: data.email, password: tempPw }]);
          setShowTempPasswordModal(true);
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const toggleStatus = async (user: User) => {
    if (user.is_active) {
      await deactivateMutation.mutateAsync(user.id);
    } else {
      await activateMutation.mutateAsync(user.id);
    }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employees');
    const dataSheet = workbook.addWorksheet('Data', { state: 'hidden' });

    // Setup Data for Dropdowns in hidden sheet
    // We'll use Labels for the dropdown to be user-friendly, but map them back in parsing
    dataSheet.getColumn(1).values = ['ROLES', ...ROLES.map(r => r.label)];
    dataSheet.getColumn(2).values = ['DEPARTMENTS', ...DEPARTMENTS];

    // Set columns with widths first (must be done before setting header values)
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
      fgColor: { argb: 'FF3B82F6' } // Blue-500
    };
    headerRow.height = 25;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.commit();

    // Set Data Validations using named ranges/cell references from hidden sheet
    // Role validation (D2:D500)
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

    // Instructions sheet (Branding moved here)
    const helpSheet = workbook.addWorksheet('Instructions');
    helpSheet.mergeCells('A1:B1');
    const brandCell = helpSheet.getCell('A1');
    brandCell.value = 'JVD INTERNAL MANAGEMENT SYSTEM';
    brandCell.font = { name: 'Arial Black', size: 14, color: { argb: 'FF1E293B' } };
    brandCell.alignment = { horizontal: 'center' };

    helpSheet.addRow(['BULK PERSONNEL REGISTRATION GUIDE']);
    helpSheet.getRow(2).font = { bold: true, size: 12, color: { argb: 'FF3B82F6' } };
    helpSheet.addRow(['']);
    helpSheet.addRow(['1. Fill in the "Employees" sheet starting from row 2.']);
    helpSheet.addRow(['2. Do not modify or delete the header row (Row 1).']);
    helpSheet.addRow(['3. Use the dropdown menus for Role and Department columns.']);
    helpSheet.addRow(['4. Ensure emails are unique and correctly formatted.']);
    helpSheet.addRow(['5. Names should only contain letters (no numbers allowed).']);
    helpSheet.addRow(['6. If "Protected View" appears, click "Enable Editing" to use dropdowns.']);
    
    helpSheet.getColumn(1).width = 40;
    helpSheet.getColumn(2).width = 60;

    // Add example row at row 2 so users know what to type
    // NOTE: Must use getRow(2) explicitly because the validation loop above
    // already "touches" rows 2-500 via getCell(), which pushes addRow() to row 501.
    const exampleRow = worksheet.getRow(2);
    exampleRow.getCell('first_name').value = 'Juan';
    exampleRow.getCell('last_name').value = 'dela cruz';
    exampleRow.getCell('email').value = 'JuanDC@gmail.com';
    exampleRow.getCell('role').value = 'Agent';
    exampleRow.getCell('department').value = 'Operations';
    exampleRow.font = { italic: true, color: { argb: 'FF9CA3AF' } };
    exampleRow.commit();

    // Set Employees as the active sheet
    workbook.views = [
      {
        x: 0, y: 0, width: 10000, height: 20000,
        firstSheet: 0, activeTab: 0, visibility: 'visible'
      }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'JVD_Personnel_Bulk_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Branded template with dropdowns downloaded!');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    try {
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet(1);
      const employees: any[] = [];
      const errors_list: string[] = [];

      worksheet?.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return; // Skip header (row 1) and example row (row 2)

        const first_name = row.getCell(1).text?.trim();
        const last_name = row.getCell(2).text?.trim();
        const email = row.getCell(3).text?.trim();
        const roleLabel = row.getCell(4).text?.trim();
        const department = row.getCell(5).text?.trim();

        // Map role label back to value
        const role = ROLES.find(r => r.label === roleLabel || r.value === roleLabel.toLowerCase())?.value;

        // Skip empty rows
        if (!first_name && !last_name && !email) return;

        if (!first_name || !last_name || !email || !role || !department) {
          errors_list.push(`Row ${rowNumber}: Incomplete data (all fields required).`);
          return;
        }

        // Validation: Names should not contain numbers
        const nameRegex = /^[A-Za-z\s-']+$/;
        if (!nameRegex.test(first_name)) {
          errors_list.push(`Row ${rowNumber}: Invalid First Name "${first_name}".`);
          return;
        }
        if (!nameRegex.test(last_name)) {
          errors_list.push(`Row ${rowNumber}: Invalid Last Name "${last_name}".`);
          return;
        }

        // Validation: Email format
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        if (!emailRegex.test(email)) {
          errors_list.push(`Row ${rowNumber}: Invalid Email "${email}".`);
          return;
        }

        // Validation: Role and Department
        if (!role) {
          errors_list.push(`Row ${rowNumber}: Invalid Role "${roleLabel}".`);
          return;
        }

        // Robust Department Matching (handles case and common typos like Logistic vs Logistics)
        const matchedDept = DEPARTMENTS.find(d => 
          d.toLowerCase() === department.toLowerCase() || 
          (d === 'Logistics' && (department.toLowerCase() === 'logistic' || department.toLowerCase() === 'logistics'))
        );

        if (!matchedDept) {
          errors_list.push(`Row ${rowNumber}: Invalid Dept "${department}".`);
          return;
        }

        employees.push({
          first_name,
          last_name,
          email,
          role,
          department: matchedDept,
          employee_id: `JVD-EMP-${Math.floor(1000 + Math.random() * 9000)}`
        });
      });

      if (errors_list.length > 0) {
        // Show first 3 errors to avoid toast spam
        const displayErrors = errors_list.slice(0, 3);
        const remaining = errors_list.length - 3;
        
        displayErrors.forEach(err => toast.error(err, { duration: 4000 }));
        if (remaining > 0) {
          toast.error(`...and ${remaining} more errors found.`, { duration: 5000 });
        }
        
        e.target.value = '';
        return;
      }

      if (employees.length === 0) {
        toast.error('No data found in the Excel file.');
        e.target.value = '';
        return;
      }

      setPendingUploads(employees);
      setIsPreviewModalOpen(true);
      e.target.value = '';
    } catch (err) {
      toast.error('Failed to parse Excel file. Please use the provided template.');
      console.error(err);
      e.target.value = '';
    }
  };

  const handleBulkUploadConfirm = async () => {
    if (!pendingUploads || pendingUploads.length === 0) return;

    const employees = [...pendingUploads];
    setPendingUploads(null);
    setIsPreviewModalOpen(false);

    const uploadToast = toast.loading(`Registering ${employees.length} personnel...`);
    let successCount = 0;
    const collectedPasswords: TempPasswordEntry[] = [];
    
    for (const emp of employees) {
      try {
        // Bulk HR upload — no invitation email, collect temp passwords instead
        const res = await createUserMutation.mutateAsync({ ...emp, send_invitation: false });
        const tempPw = res?.data?.data?.temporary_password;
        if (tempPw) {
          collectedPasswords.push({
            name: `${emp.first_name} ${emp.last_name}`,
            email: emp.email,
            password: tempPw,
          });
        }
        successCount++;
      } catch (err: any) {
        console.error(`Upload error for ${emp.email}:`, err);
      }
    }

    toast.dismiss(uploadToast);
    if (successCount === employees.length) {
      toast.success(`Successfully registered ${successCount} personnel!`);
    } else {
      toast.success(`Completed with partial success: ${successCount}/${employees.length} registered.`);
    }

    if (collectedPasswords.length > 0) {
      setTempPasswords(collectedPasswords);
      setShowTempPasswordModal(true);
    }
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800/60 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {usersData?.meta?.total ?? '0'} Personnel
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Human Resources Management
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-3">
            <div className="flex bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] p-1 shadow-sm overflow-hidden">
               <button 
                 onClick={downloadTemplate}
                 className="flex items-center gap-2 px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 transition-all text-[11px] font-black uppercase tracking-widest rounded-xl active:scale-95"
                 title="Download Template"
               >
                 <LuFileDown size={18} className="text-gray-400" />
                 <span className="hidden lg:inline">Format</span>
               </button>
               <div className="w-px h-6 bg-gray-100 dark:bg-gray-800 self-center" />
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="flex items-center gap-2 px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800/60 text-blue-600 transition-all text-[11px] font-black uppercase tracking-widest rounded-xl active:scale-95"
                 title="Upload Excel"
               >
                 <LuFileUp size={18} />
                 <span className="hidden lg:inline">Bulk Upload</span>
               </button>
            </div>
            
            <Button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-6">
              <LuUserPlus size={18} /> Add Employee
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
          { label: 'Active Staff', value: usersData?.meta?.total || 0, icon: LuUsers, from: 'from-blue-500', to: 'to-blue-700', shadow: 'shadow-blue-300/40 dark:shadow-blue-900/40' },
          { label: 'On Duty', value: usersData?.data?.filter((u: User) => u.is_active).length || 0, icon: LuUserCheck, from: 'from-emerald-400', to: 'to-emerald-600', shadow: 'shadow-emerald-300/40 dark:shadow-emerald-900/40' },
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

      {/* Filters & Table */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 max-w-md flex-1">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center text-gray-400">
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
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-900 font-medium text-gray-600 dark:text-gray-300 appearance-none min-w-[150px]">
            <option value="">All Roles</option>
            {ROLES.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>

        <div className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm ${usersData?.data?.length > 0 ? 'min-h-[350px]' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Employee & ID</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Department</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Role</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-gray-400">
                      <LuLoaderCircle size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                      <p className="text-sm font-medium">Syncing directory...</p>
                    </td>
                  </tr>
                ) : usersData?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-gray-400">
                      <LuUsers size={32} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />
                      <p className="text-sm font-medium">No personnel found.</p>
                    </td>
                  </tr>
                ) : (
                  usersData?.data?.map((user: User) => (
                    <tr key={user.id} className="hover:bg-blue-50/30 transition-all group border-b border-gray-50 last:border-0">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img 
                              src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=f8fafc&color=3b82f6&bold=true`} 
                              className="w-11 h-11 rounded-2xl border-2 border-white shadow-sm object-cover" 
                              alt="" 
                            />
                            {user.is_online && (
                              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white text-base">{fullName(user)}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{user.employee_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-[10px] font-black tracking-widest uppercase border border-gray-100 dark:border-gray-800">
                          {user.department}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const role = ROLES.find(r => r.value === user.role);
                            const Icon = role?.icon || LuShield;
                            return (
                              <>
                                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm", {
                                  'bg-blue-50 border-blue-100 text-blue-500': ['admin', 'super_admin', 'operations_manager', 'logistics_in_charge', 'dispatcher', 'purchasing_manager', 'service_adviser', 'head_mechanic'].includes(user.role),
                                  'bg-purple-50 border-purple-100 text-purple-500': ['human_resource', 'corporate_secretary'].includes(user.role),
                                  'bg-emerald-50 border-emerald-100 text-emerald-500': ['accounting', 'accounting_executive'].includes(user.role),
                                  'bg-amber-50 border-amber-100 text-amber-500': ['agent', 'reservation_officer', 'office_staff'].includes(user.role),
                                  'bg-indigo-50 border-indigo-100 text-indigo-500': user.role === 'driver',
                                })}>
                                  <Icon size={14} />
                                </div>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200 capitalize">{user.role.replace('_', ' ')}</span>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <StatusBadge 
                          status={!user.is_active ? 'Deactivated' : (user.is_online ? 'Active' : 'Offline')}
                          variant={!user.is_active ? 'danger' : (user.is_online ? 'success' : 'neutral')}
                        />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center gap-2">
                          <Dropdown 
                            items={[
                              { 
                                label: 'View Profile', 
                                icon: <LuEye size={16} />, 
                                onClick: () => handleViewProfile(user) 
                              },
                              ...(canManage ? [
                                { 
                                  label: 'Edit Employee', 
                                  icon: <LuPencil size={16} />, 
                                  onClick: () => handleOpenModal(user) 
                                },
                                { 
                                  label: user.is_active ? 'Deactivate' : 'Activate', 
                                  icon: user.is_active ? <LuUserX size={16} /> : <LuUserCheck size={16} />, 
                                  onClick: () => toggleStatus(user),
                                  variant: user.is_active ? 'danger' as const : 'default' as const
                                }
                              ] : [])
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

        {usersData?.meta?.last_page > 1 && (
          <Pagination
            currentPage={page}
            lastPage={usersData.meta.last_page}
            total={usersData.meta.total}
            perPage={usersData.meta.per_page}
            onPageChange={setPage}
          />
        )}

      {/* Profile Detail Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Personnel Identity"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-8 p-2">
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 bg-gray-50 dark:bg-gray-800/60 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-700" />
              
              <div className="relative">
                <img 
                  src={selectedUser.avatar_url || `https://ui-avatars.com/api/?name=${selectedUser.first_name}+${selectedUser.last_name}&background=ffffff&color=3b82f6&size=256&bold=true`} 
                  className="w-32 h-32 rounded-[2rem] border-4 border-white shadow-2xl object-cover relative z-10" 
                  alt="" 
                />
                <div className={cn(
                  "absolute -bottom-2 -right-2 w-8 h-8 rounded-2xl border-4 border-white shadow-lg z-20 flex items-center justify-center",
                  selectedUser.is_active ? "bg-emerald-500" : "bg-red-500"
                )}>
                  {selectedUser.is_active ? <LuUserCheck size={14} className="text-white" /> : <LuUserX size={14} className="text-white" />}
                </div>
              </div>

              <div className="flex-1 text-center md:text-left relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{fullName(selectedUser)}</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100">
                        {selectedUser.department}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-gray-200 dark:border-gray-700">
                        {selectedUser.role.replace('_', ' ')}
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
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <LuActivity size={16} className="text-blue-500" />
                  System Interaction
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Last Session</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white">
                      {selectedUser.last_login ? formatDate(selectedUser.last_login, 'MMM dd, yyyy HH:mm') : 'Never Active'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Member Since</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white">{formatDate(selectedUser.created_at, 'MMMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <LuShield size={16} className="text-emerald-500" />
                  Security Profile
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <span className="text-xs font-bold text-emerald-600">Access Level</span>
                    <span className="text-sm font-black text-emerald-700 capitalize">{selectedUser.role.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">IP Origin</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                      <LuGlobe size={12} className="text-gray-400" /> Static/Internal
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
                  className="px-8 flex items-center gap-2"
                >
                  <LuPencil size={16} /> Edit Employee
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
        title={selectedUser ? 'Modify Personnel' : 'Personnel Registration'}
        size="md"
      >
        <div className="overflow-y-auto custom-scrollbar max-h-[75vh] p-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Personal Information */}
            <details className="group [&_summary::-webkit-details-marker]:hidden bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700" open>
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <LuUsers className="text-blue-500" /> Personal Information
                </h3>
                <LuChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="p-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700 mt-2">
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
                        "w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                        errors.first_name && "border-red-300 bg-red-50/30"
                      )}
                      placeholder="e.g. Michael"
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
                        "w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                        errors.last_name && "border-red-300 bg-red-50/30"
                      )}
                      placeholder="e.g. Scofield"
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
                        message: 'Invalid email address'
                      }
                    })}
                    type="email"
                    className={cn(
                      "w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                      errors.email && "border-red-300 bg-red-50/30"
                    )}
                    placeholder="name@jvd-logistics.com"
                  />
                  {errors.email && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.email.message as string}</p>}
                </div>
              </div>
            </details>

            {/* Employment Details */}
            <details className="group [&_summary::-webkit-details-marker]:hidden bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700" open>
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <LuBriefcase className="text-emerald-500" /> Employment Details
                </h3>
                <LuChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="p-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Role</label>
                    <select
                      {...register('role', { required: true })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                    >
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                    <select
                      {...register('department', { required: true })}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                    >
                      {DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Employee Reference ID</label>
                  <input
                    {...register('employee_id', { required: 'Employee ID is required' })}
                    readOnly
                    className={cn(
                      "w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl text-sm font-black text-gray-400 focus:outline-none cursor-not-allowed font-mono",
                      errors.employee_id && "border-red-300 bg-red-50/30"
                    )}
                    placeholder="JVD-EMP-000"
                  />
                  {errors.employee_id && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.employee_id.message as string}</p>}
                </div>
              </div>
            </details>

            {/* Security & Access */}
            {!selectedUser && (
              <details className="group [&_summary::-webkit-details-marker]:hidden bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <LuShield className="text-purple-500" /> Security & Access
                  </h3>
                  <LuChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="p-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700 mt-2">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-blue-50/50 transition-colors cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        {...register('send_invitation')}
                        id="send_invitation"
                        className="w-5 h-5 rounded-lg border-gray-200 dark:border-gray-700 text-blue-600 focus:ring-blue-500/20 transition-all cursor-pointer"
                        defaultChecked={true}
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="send_invitation" className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest cursor-pointer">
                        Send Account Invitation
                      </label>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        Invite employee via email to set their own password
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-[1.5rem] flex items-start gap-3">
                    <LuKeyRound size={18} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                      <span className="font-black">Unchecked = Temp Password.</span> If invitation is disabled, a temporary password will be generated and shown to you immediately after registration.
                    </p>
                  </div>
                </div>
              </details>
            )}

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
            <Button 
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              isLoading={createUserMutation.isPending || updateUserMutation.isPending}
            >
              {selectedUser ? 'Save' : 'Register Employee'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>

      {/* Bulk Upload Preview Modal */}
      <Modal 
        isOpen={isPreviewModalOpen} 
        onClose={() => setIsPreviewModalOpen(false)}
        title="Bulk Registration Preview"
        size="xl"
      >
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-[1.5rem] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <LuTriangleAlert size={20} className="text-amber-500" />
              <p className="text-xs text-amber-700 font-bold uppercase tracking-tight">
                Review Data: {pendingUploads?.length} personnel detected.
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 shadow-sm">
              <LuKeyRound size={14} className="text-amber-500" />
              <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Temp Passwords</span>
            </div>
          </div>

          <div className="border border-gray-100 dark:border-gray-800 rounded-[2rem] overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Personnel</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role & Dept</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {pendingUploads?.map((emp, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-gray-900 dark:text-white">{emp.first_name} {emp.last_name}</p>
                        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">{emp.employee_id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{emp.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black uppercase border border-blue-100">
                            {emp.role}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase ml-0.5">
                            {emp.department}
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
            <Button variant="secondary" onClick={() => setIsPreviewModalOpen(false)}>
              Abort Upload
            </Button>
            <Button onClick={handleBulkUploadConfirm} className="px-8 shadow-lg shadow-blue-200">
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
