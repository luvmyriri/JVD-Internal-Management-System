import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  LuUsers, LuPlus, LuSearch, LuLoaderCircle, LuX, LuPencil,
  LuTrash2, LuMail, LuPhone, LuMapPin, LuUser, LuChevronRight
} from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../../api/customers';
import { Pagination, Modal, Button } from '../../components/ui';

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  notes?: string;
  created_at: string;
}

// ── Add/Edit Modal ─────────────────────────────────────────────────────────────
interface CustomerModalProps {
  mode: 'create' | 'edit' | 'view';
  customer?: Customer;
  onClose: () => void;
}
function CustomerModal({ mode, customer, onClose }: CustomerModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    first_name: customer?.first_name ?? '',
    last_name: customer?.last_name ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    address: customer?.address ?? '',
    notes: customer?.notes ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!form.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        newErrors.email = 'Invalid email address format';
      }
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const cleanPhone = form.phone.replace(/[\s()-]/g, '');
      const phPhoneRegex = /^(?:\+63|63|0)9\d{9}$/;
      if (!phPhoneRegex.test(cleanPhone)) {
        newErrors.phone = 'Invalid Philippine mobile number (e.g. 09171234567 or +639171234567)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const mutation = useMutation({
    mutationFn: () =>
      customer
        ? customerApi.update(customer.id, form)
        : customerApi.create(form),
    onSuccess: () => {
      toast.success(customer ? 'Customer updated!' : 'Customer registered!');
      qc.invalidateQueries({ queryKey: ['customers'] });
      onClose();
    },
    onError: (err: any) => {
      const responseData = err?.response?.data;
      if (responseData && responseData.errors) {
        const backendErrors: Record<string, string> = {};
        Object.keys(responseData.errors).forEach(key => {
          backendErrors[key] = Array.isArray(responseData.errors[key])
            ? responseData.errors[key][0]
            : responseData.errors[key];
        });
        setErrors(backendErrors);
        toast.error('Please fix the validation errors.');
      } else {
        toast.error('Failed to save customer.');
      }
    },
  });

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => {
    const hasError = !!errors[key];
    return (
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
        {key === 'notes' ? (
          <textarea
            rows={3}
            disabled={mode === 'view'}
            value={form[key]}
            onChange={e => {
              setForm(p => ({ ...p, [key]: e.target.value }));
              if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
            }}
            placeholder={placeholder}
            className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 transition-shadow resize-none disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800/50 dark:disabled:text-gray-400 bg-white dark:bg-gray-900 ${
              hasError
                ? 'border-red-500 focus:ring-red-500 dark:border-red-500'
                : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
            }`}
          />
        ) : (
          <input
            type={type}
            disabled={mode === 'view'}
            value={form[key]}
            onChange={e => {
              setForm(p => ({ ...p, [key]: e.target.value }));
              if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
            }}
            placeholder={placeholder}
            className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 transition-shadow disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800/50 dark:disabled:text-gray-400 bg-white dark:bg-gray-900 ${
              hasError
                ? 'border-red-500 focus:ring-red-500 dark:border-red-500'
                : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'
            }`}
          />
        )}
        {hasError && <p className="text-xs text-red-500 mt-1 font-medium">{errors[key]}</p>}
      </div>
    );
  };

  return (
    <Modal isOpen onClose={onClose} title={mode === 'create' ? 'Register New Customer' : mode === 'edit' ? 'Edit Customer' : 'Customer Details'} size="lg">
      <div className="p-6 overflow-y-auto custom-scrollbar max-h-[75vh]">
        <form id="customer-form" onSubmit={e => {
          e.preventDefault();
          if (validateForm()) {
            mutation.mutate();
          } else {
            toast.error('Please fix the validation errors.');
          }
        }} className="space-y-5">
          <details className="group" open>
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span>Customer Information</span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-4 px-1 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {field('First Name *', 'first_name', 'text', 'Juan')}
                {field('Last Name *', 'last_name', 'text', 'dela Cruz')}
                {field('Email *', 'email', 'email', 'juan@example.com')}
                {field('Phone *', 'phone', 'text', '+63 9XX XXX XXXX')}
              </div>
              {field('Address', 'address', 'text', 'City, Province')}
              {field('Notes', 'notes', 'text', 'Additional remarks...')}
            </div>
          </details>
        </form>
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 mt-6">
          {mode === 'view' ? (
            <Button onClick={onClose}>Close</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button form="customer-form" type="submit" isLoading={mutation.isPending}
                disabled={!form.first_name || !form.last_name || !form.email || !form.phone}>
                {mode === 'create' ? 'Register Customer' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────
function DeleteModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => customerApi.delete(customer.id),
    onSuccess: () => {
      toast.success('Customer removed.');
      qc.invalidateQueries({ queryKey: ['customers'] });
      onClose();
    },
    onError: () => toast.error('Failed to delete customer.'),
  });

  return (
    <Modal isOpen onClose={onClose} title="Remove Customer" size="sm">
      <div className="p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto border border-red-100">
          <LuTrash2 size={28} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white">Delete Customer?</h3>
          <p className="text-sm text-gray-500 mt-2">
            Are you sure you want to remove <strong>{customer.first_name} {customer.last_name}</strong>? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 pt-2 justify-center">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}
            className="bg-red-600 hover:bg-red-700 shadow-red-200">
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalConfig, setModalConfig] = useState<{ mode: 'create' | 'edit' | 'view'; data?: Customer } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const { data: response, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => customerApi.list({ search: search || undefined, page, per_page: 15 }),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const customers: Customer[] = response?.data?.data ?? [];
  const meta = response?.data?.meta;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {meta?.total ?? '0'} Customers
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Travel Client Registry</p>
        </div>
        <Button onClick={() => setModalConfig({ mode: 'create' })} className="flex items-center gap-2">
          <LuPlus size={16} /> New Customer
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-md">
        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400">
          <LuSearch size={18} />
        </div>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 bg-transparent border-none text-sm focus:ring-0 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
            <LuX size={16} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm overflow-hidden relative">
        {isPlaceholderData && (
          <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
            <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/60 text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800 uppercase tracking-widest text-[10px]">
                <th className="px-8 py-5">Customer</th>
                <th className="px-8 py-5">Contact</th>
                <th className="px-8 py-5">Address</th>
                <th className="px-8 py-5">Notes</th>
                <th className="px-8 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-50 dark:divide-gray-800 transition-all duration-300 ${isPlaceholderData ? 'opacity-60 pointer-events-none saturate-50' : ''}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400">
                    <LuLoaderCircle size={28} className="animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-sm font-medium">Loading customers...</p>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400">
                    <LuUsers size={32} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">No customers found.</p>
                  </td>
                </tr>
              ) : customers.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center font-black text-sm border border-rose-100 dark:border-rose-800 shrink-0">
                        {c.first_name[0]}{c.last_name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{c.first_name} {c.last_name}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID #{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <LuMail size={11} className="text-gray-400" /> {c.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <LuPhone size={11} className="text-gray-400" /> {c.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                      <LuMapPin size={11} className="text-gray-400 shrink-0" />
                      <span>{c.address || <span className="italic text-gray-300">—</span>}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 max-w-[200px]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                      {c.notes || <span className="italic text-gray-300">No notes</span>}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-center gap-2 transition-opacity">
                      <button
                        onClick={() => navigate(`/travel/customers/${c.id}`)}
                        className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 hover:bg-purple-100 transition"
                        title="View Profile"
                      >
                        <LuUser size={14} />
                      </button>
                      <button
                        onClick={() => setModalConfig({ mode: 'view', data: c })}
                        className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 transition"
                        title="Quick View"
                      >
                        <LuSearch size={14} />
                      </button>
                      <button
                        onClick={() => setModalConfig({ mode: 'edit', data: c })}
                        className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition"
                        title="Edit"
                      >
                        <LuPencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition"
                        title="Delete"
                      >
                        <LuTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {meta && meta.last_page > 1 && (
        <Pagination currentPage={page} lastPage={meta.last_page} total={meta.total} perPage={meta.per_page} onPageChange={setPage} />
      )}

      {modalConfig && <CustomerModal mode={modalConfig.mode} customer={modalConfig.data} onClose={() => setModalConfig(null)} />}
      {deleteTarget && <DeleteModal customer={deleteTarget} onClose={() => setDeleteTarget(null)} />}
    </div>
  );
}
