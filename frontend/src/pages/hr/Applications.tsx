import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { 
  LuSearch, 
  LuPlus, 
  LuMail, 
  LuPhone,
  LuBriefcase,
  LuPencil,
  LuTrash2,
  LuChevronRight,
  LuUser,
  LuCircleCheck,
  LuCircle,
  LuEye,
  LuFileText,
  LuUpload,
  LuLoaderCircle,
  LuUserPlus,
  LuShield,
  LuTruck,
  LuBadgeCheck,
  LuUsers,
  LuCopy,
  LuCheckCheck,
  LuKeyRound,
  LuUserCheck,
  LuTriangleAlert,
} from 'react-icons/lu';
import { Modal, StatusBadge, Button, Pagination } from '../../components/ui';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { jobApplicationsApi, type JobApplication, type ConvertToEmployeePayload } from '../../api/jobApplications';
import { formatDate, getStorageUrl } from '../../utils';

// ─── Role & Department constants (mirrors Employees.tsx) ─────────────────────
const ROLES = [
  { value: 'super_admin',               label: 'Super Admin (CEO)',        icon: LuShield,    color: 'text-rose-500' },
  { value: 'executive_vice_president',  label: 'Executive Vice President', icon: LuShield,    color: 'text-rose-500' },
  { value: 'operations_manager',        label: 'Operations Manager',       icon: LuShield,    color: 'text-cyan-500' },
  { value: 'reservation_officer',       label: 'Reservation Officer',      icon: LuBriefcase, color: 'text-orange-500' },
  { value: 'office_staff',              label: 'Office Staff',             icon: LuBriefcase, color: 'text-yellow-500' },
  { value: 'accounting_executive',      label: 'Accounting Executive',     icon: LuBadgeCheck,color: 'text-teal-500' },
  { value: 'corporate_secretary',       label: 'Corporate Secretary',      icon: LuUsers,     color: 'text-pink-500' },
  { value: 'logistics_in_charge',       label: 'Logistics In Charge',      icon: LuShield,    color: 'text-lime-500' },
  { value: 'dispatcher',               label: 'Dispatcher',               icon: LuShield,    color: 'text-fuchsia-500' },
  { value: 'purchasing_manager',        label: 'Purchasing Manager',       icon: LuShield,    color: 'text-sky-500' },
  { value: 'service_adviser',           label: 'Service Adviser',          icon: LuShield,    color: 'text-stone-500' },
  { value: 'head_mechanic',            label: 'Head Mechanic',            icon: LuShield,    color: 'text-neutral-500' },
  { value: 'driver',                   label: 'Driver',                   icon: LuTruck,     color: 'text-indigo-500' },
];

const DEPARTMENTS = [
  'Administration',
  'Accounting',
  'Operations',
  'Maintenance',
  'Human Resources',
  'Logistics',
];

// ─── Temp Password Modal ──────────────────────────────────────────────────────
interface TempPasswordEntry { name: string; email: string; password: string; }

function TempPasswordModal({ entry, onClose }: { entry: TempPasswordEntry; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(entry.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Modal isOpen onClose={onClose} title="Employee Account Created" size="md">
      <div className="space-y-5 p-2">
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl">
          <LuKeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-800 dark:text-amber-300">✉️ Email sent + backup copy below</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
              Credentials were emailed. Save this backup. Employee will be forced to change their password on first login.
            </p>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm space-y-3">
          <div>
            <p className="text-sm font-black text-gray-900 dark:text-white">{entry.name}</p>
            <p className="text-[10px] text-gray-400 font-bold">{entry.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono font-bold text-blue-600 dark:text-blue-400 tracking-widest">
              {entry.password}
            </code>
            <button
              onClick={copy}
              className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors border border-blue-100 dark:border-blue-500/20"
            >
              {copied ? <LuCheckCheck className="w-4 h-4" /> : <LuCopy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Done — I've Saved This</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Account Setup Modal ──────────────────────────────────────────────────────
interface AccountSetupModalProps {
  app: JobApplication;
  onClose: () => void;
  onSuccess: (entry: TempPasswordEntry) => void;
}

function AccountSetupModal({ app, onClose, onSuccess }: AccountSetupModalProps) {
  const queryClient = useQueryClient();
  const [sendInvitation, setSendInvitation] = useState(true);

  const { register, handleSubmit, formState: { errors } } = useForm<ConvertToEmployeePayload>({
    defaultValues: {
      employee_id: `JVD-EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'reservation_officer',
      department: 'Operations',
      send_invitation: true,
    }
  });

  const convertMutation = useMutation({
    mutationFn: (data: ConvertToEmployeePayload) => jobApplicationsApi.convertToEmployee(app.id, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      const tempPw = res?.data?.temporary_password;
      const invitationSent = res?.data?.invitation_sent;
      onClose();
      if (!invitationSent && tempPw) {
        onSuccess({
          name: `${app.first_name} ${app.last_name}`,
          email: app.email,
          password: tempPw,
        });
      } else {
        toast.success(`Employee account created! Invitation sent to ${app.email}`);
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create employee account'),
  });

  const onSubmit = (data: ConvertToEmployeePayload) => {
    convertMutation.mutate({ ...data, send_invitation: sendInvitation });
  };

  return (
    <Modal isOpen onClose={onClose} title="Create Employee Account" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-2">
        {/* Applicant info banner */}
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <LuUserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-gray-900 dark:text-white">{app.first_name} {app.last_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{app.email}</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mt-0.5">
              ✓ Hired — Converting to Employee
            </p>
          </div>
        </div>

        {/* Read-only fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">First Name</label>
            <input
              readOnly
              value={app.first_name}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Last Name</label>
            <input
              readOnly
              value={app.last_name}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Email</label>
          <input
            readOnly
            value={app.email}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-800" />

        {/* Employee ID */}
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Employee ID</label>
          <input
            {...register('employee_id', { required: 'Employee ID is required' })}
            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium font-mono"
            placeholder="JVD-EMP-0000"
          />
          {errors.employee_id && <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">{errors.employee_id.message}</p>}
        </div>

        {/* Role */}
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Assign Role</label>
          <select
            {...register('role', { required: 'Role is required' })}
            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium appearance-none"
          >
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {errors.role && <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">{errors.role.message}</p>}
        </div>

        {/* Department */}
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Department</label>
          <select
            {...register('department', { required: 'Department is required' })}
            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium appearance-none"
          >
            {DEPARTMENTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {errors.department && <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">{errors.department.message}</p>}
        </div>

        {/* Send invitation toggle */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Access Method</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSendInvitation(true)}
              className={`p-3 rounded-xl border-2 text-sm font-bold transition-all text-left ${
                sendInvitation
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
              }`}
            >
              <LuMail className="w-4 h-4 mb-1" />
              <p className="text-xs font-black">Send Invitation</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">Email invite link</p>
            </button>
            <button
              type="button"
              onClick={() => setSendInvitation(false)}
              className={`p-3 rounded-xl border-2 text-sm font-bold transition-all text-left ${
                !sendInvitation
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
              }`}
            >
              <LuKeyRound className="w-4 h-4 mb-1" />
              <p className="text-xs font-black">Temp Password</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">Generate password</p>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            isLoading={convertMutation.isPending}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <LuUserCheck className="w-4 h-4" />
            Create Employee Account
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Applications() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');
  const [localChecklist, setLocalChecklist] = useState<Record<string, boolean>>({});
  const [newRequirement, setNewRequirement] = useState('');

  // Document upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingChecklistItem, setUploadingChecklistItem] = useState<string | null>(null);
  const checklistFileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  // Recruit-to-employee state
  const [recruitApp, setRecruitApp] = useState<JobApplication | null>(null);
  const [tempPasswordEntry, setTempPasswordEntry] = useState<TempPasswordEntry | null>(null);

  const { data: response, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['job-applications'],
    queryFn: jobApplicationsApi.getAll,
    placeholderData: keepPreviousData,
  });

  const applications = Array.isArray(response) ? response : (response?.data || []);

  const { data: docsRes, refetch: refetchDocs } = useQuery({
    queryKey: ['job_application_documents', selectedApp?.id],
    queryFn: () => jobApplicationsApi.getDocuments(selectedApp!.id).then(r => r.data),
    enabled: !!selectedApp?.id,
  });
  const documents = docsRes ?? [];

  useEffect(() => {
    if (selectedApp) {
      setLocalChecklist(selectedApp.checklist ?? {});
    } else {
      setLocalChecklist({});
    }
  }, [selectedApp]);

  const items = Object.keys(localChecklist);
  const done = items.filter(i => localChecklist[i]).length;

  const createMutation = useMutation({
    mutationFn: jobApplicationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application created successfully');
      setIsModalOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create application')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<JobApplication> }) => jobApplicationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application updated successfully');
      setIsModalOpen(false);
    },
    onError: () => toast.error('Failed to update application')
  });

  const deleteMutation = useMutation({
    mutationFn: jobApplicationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application deleted successfully');
    },
    onError: () => toast.error('Failed to delete application')
  });

  const checklistMutation = useMutation({
    mutationFn: (cl: Record<string, boolean>) => jobApplicationsApi.updateChecklist(selectedApp!.id, cl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
    },
    onError: () => toast.error('Failed to save checklist.')
  });

  const toggleItem = (item: string) => {
    const updated = { ...localChecklist, [item]: !localChecklist[item] };
    setLocalChecklist(updated);
    checklistMutation.mutate(updated);
  };

  const handleAddRequirement = () => {
    if (!newRequirement.trim()) return;
    const item = newRequirement.trim();
    if (localChecklist[item] !== undefined) {
      toast.error('Requirement already exists.');
      return;
    }
    const updated = { ...localChecklist, [item]: false };
    setLocalChecklist(updated);
    checklistMutation.mutate(updated);
    setNewRequirement('');
  };

  const handleRemoveRequirement = (item: string) => {
    const updated = { ...localChecklist };
    delete updated[item];
    setLocalChecklist(updated);
    checklistMutation.mutate(updated);
  };

  const handleUpload = async (title: string, file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('file', file);

      await jobApplicationsApi.uploadDocument(selectedApp!.id, formData);
      toast.success(`Document for "${title}" uploaded successfully.`);

      const updated = { ...localChecklist, [title]: true };
      setLocalChecklist(updated);
      checklistMutation.mutate(updated);

      refetchDocs();
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleChecklistUploadClick = (item: string) => {
    setUploadingChecklistItem(item);
    setTimeout(() => {
      checklistFileInputRef.current?.click();
    }, 50);
  };

  const handleChecklistFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingChecklistItem) return;
    await handleUpload(uploadingChecklistItem, file);
    setUploadingChecklistItem(null);
    if (checklistFileInputRef.current) {
      checklistFileInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const docToDelete = documents.find((d: any) => d.id === docId);

      await jobApplicationsApi.deleteDocument(selectedApp!.id, docId);
      toast.success('Document deleted successfully.');

      if (docToDelete) {
        const matchedItem = items.find(i => i.toLowerCase() === docToDelete.title.trim().toLowerCase());
        if (matchedItem) {
          const updated = { ...localChecklist, [matchedItem]: false };
          setLocalChecklist(updated);
          checklistMutation.mutate(updated);
        }
      }

      refetchDocs();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete document.');
    }
  };

  const filteredApps = applications.filter(app => {
    const search = searchTerm.toLowerCase();
    return (
      app.first_name?.toLowerCase().includes(search) ||
      app.last_name?.toLowerCase().includes(search) ||
      app.email?.toLowerCase().includes(search) ||
      app.position_applied?.toLowerCase().includes(search)
    );
  });

  const paginatedApps = filteredApps.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<JobApplication>>({
    mode: 'onChange'
  });

  const openModal = (app?: JobApplication) => {
    setActiveTab('details');
    if (app) {
      setSelectedApp(app);
      reset(app);
    } else {
      setSelectedApp(null);
      reset({ status: 'pending' });
    }
    setIsModalOpen(true);
  };

  const onSubmit = (data: Partial<JobApplication>) => {
    if (selectedApp) {
      updateMutation.mutate({ id: selectedApp.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const statusColors: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
    pending: 'warning',
    reviewed: 'info',
    interviewed: 'info',
    hired: 'success',
    rejected: 'danger'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Job Applications</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Manage candidates and interview processes</p>
        </div>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <LuPlus className="w-4 h-4" /> Add Application
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="relative flex-1">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-none bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden relative">
        {isPlaceholderData && (
          <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
            <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Candidate</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Position</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Contact</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Applied</th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-100 dark:divide-gray-800 transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : paginatedApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No applications found.</td>
                </tr>
              ) : (
                paginatedApps.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {app.first_name} {app.last_name}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <LuBriefcase className="w-4 h-4 text-gray-400" />
                        {app.position_applied}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2"><LuMail className="w-3.5 h-3.5" /> {app.email}</div>
                        {app.phone && <div className="flex items-center gap-2"><LuPhone className="w-3.5 h-3.5" /> {app.phone}</div>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5">
                        <StatusBadge status={app.status} variant={statusColors[app.status]} />
                        {/* Converted badge */}
                        {app.converted_user_id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest w-fit">
                            <LuUserCheck className="w-3 h-3" /> Converted
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {formatDate(app.created_at)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        {/* Recruit button — only for hired, not yet converted */}
                        {app.status === 'hired' && !app.converted_user_id && (
                          <button
                            onClick={() => setRecruitApp(app)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                            title="Convert to Employee"
                          >
                            <LuUserPlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Recruit</span>
                          </button>
                        )}
                        <button
                          onClick={() => openModal(app)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <LuPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this application?')) {
                              deleteMutation.mutate(app.id);
                            }
                          }}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <LuTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {filteredApps.length > itemsPerPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <Pagination
              currentPage={currentPage}
              lastPage={Math.ceil(filteredApps.length / itemsPerPage)}
              total={filteredApps.length}
              perPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Edit / Add Application Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedApp ? 'Edit Application' : 'Add Application'}
        size={selectedApp ? 'lg' : 'md'}
      >
        {selectedApp && (
          <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 pt-2 sticky top-0 bg-white dark:bg-gray-900 z-10">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
              Documents Checklist
            </button>
          </div>
        )}

        <div className="overflow-y-auto custom-scrollbar max-h-[75vh] p-4">
          {(!selectedApp || activeTab === 'details') ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              <details className="group [&_summary::-webkit-details-marker]:hidden bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700" open>
                <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <LuUser className="text-blue-500" /> Candidate Info
                  </h3>
                  <LuChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="p-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">First Name</label>
                      <input
                        {...register('first_name', { 
                          required: 'First name is required',
                          pattern: {
                            value: /^[A-Za-z\s'-]+$/,
                            message: 'First name cannot contain numbers'
                          }
                        })}
                        onInput={(e) => {
                          e.currentTarget.value = e.currentTarget.value.replace(/[0-9]/g, '');
                        }}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
                      />
                      {errors.first_name && <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">{errors.first_name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Last Name</label>
                      <input
                        {...register('last_name', { 
                          required: 'Last name is required',
                          pattern: {
                            value: /^[A-Za-z\s'-]+$/,
                            message: 'Last name cannot contain numbers'
                          }
                        })}
                        onInput={(e) => {
                          e.currentTarget.value = e.currentTarget.value.replace(/[0-9]/g, '');
                        }}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
                      />
                      {errors.last_name && <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">{errors.last_name.message}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Email</label>
                      <input
                        type="email"
                        {...register('email', { 
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address'
                          }
                        })}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
                      />
                      {errors.email && <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Phone</label>
                      <input
                        type="text"
                        maxLength={11}
                        {...register('phone', {
                          pattern: {
                            value: /^09\d{9}$/,
                            message: 'Valid 11-digit PH number (09...)'
                          }
                        })}
                        onInput={(e) => {
                          e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
                        }}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
                      />
                      {errors.phone && <p className="text-[10px] font-bold text-red-550 mt-1 ml-1">{errors.phone.message}</p>}
                    </div>
                  </div>
                </div>
              </details>

              <details className="group [&_summary::-webkit-details-marker]:hidden bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700" open>
                <summary className="flex items-center justify-between p-4 cursor-pointer select-none">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <LuBriefcase className="text-emerald-500" /> Application Details
                  </h3>
                  <LuChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="p-4 pt-0 space-y-4 border-t border-gray-100 dark:border-gray-700 mt-2">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Position Applied</label>
                    <input
                      {...register('position_applied', { required: 'Position is required' })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
                    />
                    {errors.position_applied && <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">{errors.position_applied.message}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Status</label>
                    <select
                      {...register('status')}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium appearance-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="interviewing">Interviewing</option>
                      <option value="hired">Hired</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Notes</label>
                    <textarea
                      {...register('notes')}
                      rows={3}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
                    />
                  </div>
                </div>
              </details>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                  {selectedApp ? 'Update Application' : 'Create Application'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Document Checklist Progress</h4>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{done}/{items.length} Complete</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-350"
                    style={{ width: `${items.length > 0 ? (done / items.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Add Custom Requirement */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom checklist requirement (e.g. NBI Clearance)..."
                  value={newRequirement}
                  onChange={e => setNewRequirement(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddRequirement(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddRequirement}
                  disabled={!newRequirement.trim() || checklistMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all flex items-center gap-1 shadow-md shadow-blue-600/10 shrink-0"
                >
                  <LuPlus size={14} /> Add Item
                </button>
              </div>

              {/* Checklist rendering */}
              {items.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl">No checklist items defined.</p>
              ) : (
                <div className="space-y-2">
                  {items.map(item => {
                    const matchingDoc = documents.find((d: any) => d.title.trim().toLowerCase() === item.trim().toLowerCase());
                    return (
                      <div
                        key={item}
                        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-750 transition hover:bg-gray-100/30 dark:hover:bg-gray-800/30"
                      >
                        <button
                          type="button"
                          onClick={() => toggleItem(item)}
                          disabled={checklistMutation.isPending}
                          className="flex-1 flex items-center gap-3 text-left focus:outline-none"
                        >
                          {localChecklist[item]
                            ? <LuCircleCheck size={18} className="text-emerald-500 shrink-0" />
                            : <LuCircle size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
                          }
                          <span className={`text-sm font-medium ${localChecklist[item] ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-205'}`}>
                            {item}
                          </span>
                        </button>
                        <div className="flex items-center gap-2">
                          {matchingDoc ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewUrl(getStorageUrl(matchingDoc.file_path));
                                  setPreviewTitle(matchingDoc.title);
                                  setImgLoading(true);
                                  setImgError(false);
                                }}
                                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-900 dark:hover:bg-gray-750 dark:text-gray-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                title="Preview Document"
                              >
                                <LuEye size={13} />
                                <span className="text-[10px] hidden sm:inline">Preview</span>
                              </button>
                              <a
                                href={getStorageUrl(matchingDoc.file_path)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 dark:text-emerald-400 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                title="Download Document"
                              >
                                <LuFileText size={13} />
                                <span className="text-[10px] hidden sm:inline">Download</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteDoc(matchingDoc.id)}
                                className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
                                title="Delete Document"
                              >
                                <LuTrash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleChecklistUploadClick(item)}
                              disabled={isUploading}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-400 rounded-lg text-xs font-bold transition flex items-center gap-1"
                              title="Upload Document"
                            >
                              {isUploading && uploadingChecklistItem === item ? (
                                <LuLoaderCircle size={13} className="animate-spin text-blue-600 dark:text-blue-400" />
                              ) : (
                                <LuUpload size={13} />
                              )}
                              <span className="text-[10px] hidden sm:inline">Upload</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveRequirement(item)}
                            disabled={checklistMutation.isPending}
                            className="p-1 text-gray-400 hover:text-red-550 dark:hover:text-red-400 rounded-lg transition"
                            title="Remove requirement"
                          >
                            <LuTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Hidden file input */}
              <input
                type="file"
                ref={checklistFileInputRef}
                onChange={handleChecklistFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Lightbox Document Preview */}
      {previewUrl && (
        <Modal isOpen onClose={() => setPreviewUrl(null)} title={previewTitle} size="lg">
          <div className="bg-gray-950 p-4 rounded-2xl flex items-center justify-center overflow-auto h-[60vh] border border-gray-800 relative">
            {previewUrl.toLowerCase().endsWith('.pdf') || previewUrl.toLowerCase().includes('.pdf') ? (
              <iframe
                src={`${previewUrl}#toolbar=0`}
                className="w-full h-full rounded-xl border border-gray-800 bg-white"
                title="Document Preview"
              />
            ) : (
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                {imgLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-950/40 z-10">
                    <LuLoaderCircle className="animate-spin text-violet-500" size={32} />
                  </div>
                )}
                {imgError ? (
                  <div className="text-center p-6 space-y-3 text-gray-400">
                    <LuTriangleAlert className="text-red-500 mx-auto" size={36} />
                    <p className="text-sm font-bold">Failed to load image preview</p>
                    <p className="text-xs">The image file could not be read or does not exist.</p>
                  </div>
                ) : (
                  <img
                    src={previewUrl}
                    alt="Document Preview"
                    onLoad={() => setImgLoading(false)}
                    onError={() => {
                      setImgLoading(false);
                      setImgError(true);
                    }}
                    className={`max-w-full max-h-[50vh] object-contain rounded-xl border border-gray-800 shadow-lg ${
                      imgLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'
                    }`}
                  />
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Account Setup Modal (Recruit to Employee) */}
      {recruitApp && (
        <AccountSetupModal
          app={recruitApp}
          onClose={() => setRecruitApp(null)}
          onSuccess={(entry) => {
            setRecruitApp(null);
            setTempPasswordEntry(entry);
          }}
        />
      )}

      {/* Temp Password Modal */}
      {tempPasswordEntry && (
        <TempPasswordModal
          entry={tempPasswordEntry}
          onClose={() => setTempPasswordEntry(null)}
        />
      )}
    </div>
  );
}
