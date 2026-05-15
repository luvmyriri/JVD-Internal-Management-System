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
  LuFileUp
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
import { Modal, StatusBadge, Pagination, Button } from '../../components/ui';
import { cn, fullName, formatDate } from '../../utils';
import { useForm } from 'react-hook-form';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';

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
  { value: 'admin', label: 'Admin', icon: LuShield, color: 'text-blue-500' },
  { value: 'human_resource', label: 'HR', icon: LuUsers, color: 'text-purple-500' },
  { value: 'accounting', label: 'Accounting', icon: LuBadgeCheck, color: 'text-emerald-500' },
  { value: 'agent', label: 'Agent', icon: LuBriefcase, color: 'text-amber-500' },
  { value: 'driver', label: 'Driver', icon: LuTruck, color: 'text-indigo-500' },
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
      } else {
        await createUserMutation.mutateAsync(data);
      }
      setIsModalOpen(false);
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

    // Add Branding Header
    worksheet.mergeCells('A1:E1');
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'JVD INTERNAL MANAGEMENT SYSTEM - PERSONNEL REGISTRATION';
    headerCell.font = { name: 'Arial Black', size: 14, color: { argb: 'FFFFFFFF' }, bold: true };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate-800
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 40;

    // Header row (moved to row 2)
    const headerRow = worksheet.getRow(2);
    headerRow.values = ['First Name', 'Last Name', 'Email', 'Role', 'Department'];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' } // Blue-500
    };
    headerRow.height = 25;
    
    worksheet.columns = [
      { key: 'first_name', width: 25 },
      { key: 'last_name', width: 25 },
      { key: 'email', width: 35 },
      { key: 'role', width: 20 },
      { key: 'department', width: 25 },
    ];

    // Set Data Validations (Dropdowns)
    const roleList = ROLES.map(r => r.value).join(',');
    const deptList = DEPARTMENTS.join(',');

    for (let i = 3; i <= 100; i++) {
      worksheet.getCell(`D${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${roleList}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid Role',
        error: `Please select from: ${roleList}`
      };
      worksheet.getCell(`E${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${deptList}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid Department',
        error: `Please select from: ${deptList}`
      };
    }

    // Add examples
    worksheet.addRow(['Michael', 'Scofield', 'm.scofield@jvd-logistics.com', 'agent', 'Operations']);
    worksheet.addRow(['Lincoln', 'Burrows', 'l.burrows@jvd-logistics.com', 'driver', 'Logistics']);

    // Instructions sheet
    const helpSheet = workbook.addWorksheet('Instructions');
    helpSheet.addRow(['JVD PERSONNEL UPLOAD GUIDE']);
    helpSheet.getRow(1).font = { bold: true, size: 12 };
    helpSheet.addRow(['1. Do not modify the header rows in the "Employees" sheet.']);
    helpSheet.addRow(['2. Select Role and Department from the dropdown menus.']);
    helpSheet.addRow(['3. Emails must be unique and valid.']);
    helpSheet.addRow(['4. Names should not contain numbers or special characters.']);
    helpSheet.addRow(['']);
    helpSheet.addRow(['ALLOWED VALUES:']);
    helpSheet.addRow(['Roles:', ROLES.map(r => r.value).join(', ')]);
    helpSheet.addRow(['Departments:', DEPARTMENTS.join(', ')]);
    
    helpSheet.getColumn(1).width = 25;
    helpSheet.getColumn(2).width = 100;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'JVD_Personnel_Bulk_Template.xlsx');
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
        if (rowNumber <= 2) return; // Skip branding and header

        const first_name = row.getCell(1).text?.trim();
        const last_name = row.getCell(2).text?.trim();
        const email = row.getCell(3).text?.trim();
        const role = row.getCell(4).text?.trim().toLowerCase();
        const department = row.getCell(5).text?.trim();

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
        if (!ROLES.some(r => r.value === role)) {
          errors_list.push(`Row ${rowNumber}: Invalid Role "${role}".`);
          return;
        }
        if (!DEPARTMENTS.includes(department)) {
          errors_list.push(`Row ${rowNumber}: Invalid Dept "${department}".`);
          return;
        }

        employees.push({
          first_name,
          last_name,
          email,
          role,
          department,
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

      const uploadToast = toast.loading(`Registering ${employees.length} personnel...`);
      let successCount = 0;
      
      for (const emp of employees) {
        try {
          await createUserMutation.mutateAsync(emp);
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
      
      e.target.value = '';
    } catch (err) {
      toast.error('Failed to parse Excel file. Please use the provided template.');
      console.error(err);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100">
            {usersData?.meta?.total ?? '0'} Personnel
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Human Resources Management
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-3">
            <div className="flex bg-white border border-gray-100 rounded-[1.5rem] p-1 shadow-sm overflow-hidden">
               <button 
                 onClick={downloadTemplate}
                 className="flex items-center gap-2 px-5 py-2.5 hover:bg-gray-50 text-gray-500 transition-all text-[11px] font-black uppercase tracking-widest rounded-xl active:scale-95"
                 title="Download Template"
               >
                 <LuFileDown size={18} className="text-gray-400" />
                 <span className="hidden lg:inline">Format</span>
               </button>
               <div className="w-px h-6 bg-gray-100 self-center" />
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="flex items-center gap-2 px-5 py-2.5 hover:bg-gray-50 text-blue-600 transition-all text-[11px] font-black uppercase tracking-widest rounded-xl active:scale-95"
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
          { label: 'Active Staff', value: usersData?.meta?.total || 0, icon: LuUsers, color: 'blue' },
          { label: 'On Duty', value: usersData?.data?.filter((u: User) => u.is_active).length || 0, icon: LuUserCheck, color: 'emerald' },
          { label: 'Departments', value: DEPARTMENTS.length, icon: LuBriefcase, color: 'purple' },
          { label: 'Access Control', value: ROLES.length, icon: LuLock, color: 'amber' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm relative overflow-hidden group"
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-gray-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</p>
              </div>
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", {
                'bg-blue-50 text-blue-500 border-blue-100': stat.color === 'blue',
                'bg-emerald-50 text-emerald-500 border-emerald-100': stat.color === 'emerald',
                'bg-purple-50 text-purple-500 border-purple-100': stat.color === 'purple',
                'bg-amber-50 text-amber-500 border-amber-100': stat.color === 'amber',
              })}>
                <stat.icon size={22} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters & Table */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 max-w-md flex-1">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
              <LuSearch size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by name, ID or email..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-medium text-gray-600 appearance-none min-w-[150px]">
            <option value="">All Roles</option>
            {ROLES.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 font-bold border-b border-gray-100 uppercase tracking-widest text-[10px]">
                  <th className="px-8 py-5">Employee & ID</th>
                  <th className="px-8 py-5">Department</th>
                  <th className="px-8 py-5">Role</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
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
                            {user.is_active && (
                              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-base">{fullName(user)}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{user.employee_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1.5 rounded-xl bg-gray-50 text-gray-500 text-[10px] font-black tracking-widest uppercase border border-gray-100">
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
                                  'bg-blue-50 border-blue-100 text-blue-500': user.role === 'admin' || user.role === 'super_admin',
                                  'bg-purple-50 border-purple-100 text-purple-500': user.role === 'human_resource',
                                  'bg-emerald-50 border-emerald-100 text-emerald-500': user.role === 'accounting',
                                  'bg-amber-50 border-amber-100 text-amber-500': user.role === 'agent',
                                  'bg-indigo-50 border-indigo-100 text-indigo-500': user.role === 'driver',
                                })}>
                                  <Icon size={14} />
                                </div>
                                <span className="text-sm font-bold text-gray-700 capitalize">{user.role.replace('_', ' ')}</span>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <StatusBadge 
                          status={user.is_active ? 'Active' : 'Deactivated'}
                          variant={user.is_active ? 'success' : 'danger'}
                        />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewProfile(user)}
                            className="p-3"
                            title="View Profile"
                          >
                            <LuEye size={18} />
                          </Button>
                          {canManage && (
                            <>
                              <Button 
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenModal(user)}
                                className="p-3 hover:text-indigo-600 hover:border-indigo-100"
                                title="Edit"
                              >
                                <LuPencil size={18} />
                              </Button>
                              <Button 
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleStatus(user)}
                                className={cn(
                                  "p-3",
                                  user.is_active ? "hover:text-red-600 hover:border-red-100" : "hover:text-emerald-600 hover:border-emerald-100"
                                )}
                                title={user.is_active ? "Deactivate" : "Activate"}
                              >
                                {user.is_active ? <LuUserX size={18} /> : <LuUserCheck size={18} />}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
      </div>

      {/* Profile Detail Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Personnel Identity"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-8 p-2">
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 relative overflow-hidden group">
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
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">{fullName(selectedUser)}</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100">
                        {selectedUser.department}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-gray-200">
                        {selectedUser.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm text-sm font-bold text-gray-600">
                    <LuMail size={16} className="text-blue-500" /> {selectedUser.email}
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm text-sm font-bold text-gray-600">
                    <LuBadgeCheck size={16} className="text-emerald-500" /> {selectedUser.employee_id}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <LuActivity size={16} className="text-blue-500" />
                  System Interaction
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                    <span className="text-xs font-bold text-gray-500">Last Session</span>
                    <span className="text-sm font-black text-gray-900">
                      {selectedUser.last_login ? formatDate(selectedUser.last_login, 'MMM dd, yyyy HH:mm') : 'Never Active'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                    <span className="text-xs font-bold text-gray-500">Member Since</span>
                    <span className="text-sm font-black text-gray-900">{formatDate(selectedUser.created_at, 'MMMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <LuShield size={16} className="text-emerald-500" />
                  Security Profile
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <span className="text-xs font-bold text-emerald-600">Access Level</span>
                    <span className="text-sm font-black text-emerald-700 capitalize">{selectedUser.role.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                    <span className="text-xs font-bold text-gray-500">IP Origin</span>
                    <span className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                      <LuGlobe size={12} className="text-gray-400" /> Static/Internal
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 mt-4">
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
                  "w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
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
                  "w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
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
                "w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                errors.email && "border-red-300 bg-red-50/30"
              )}
              placeholder="name@jvd-logistics.com"
            />
            {errors.email && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.email.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Role</label>
              <select
                {...register('role', { required: true })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
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
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
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

          {!selectedUser && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-[1.5rem] flex items-start gap-3">
              <LuTriangleAlert size={18} className="text-blue-500 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed font-medium">
                System will generate a unique entry and send secure onboarding credentials to the specified email address.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
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
              {selectedUser ? 'Commit Changes' : 'Register Employee'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
