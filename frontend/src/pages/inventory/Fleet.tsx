import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuBus, LuPlus, LuSearch, LuSettings, LuTriangleAlert, LuLoaderCircle, LuUser
} from 'react-icons/lu';
import { fleetApi } from '../../api/fleet';
import { Pagination, Modal, Button, StatusBadge } from '../../components/ui';
import type { Bus, BusFormData } from '../../types/inventory';
import { userApi } from '../../api/users';

const getStatusVariant = (status: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' => {
  switch (status) {
    case 'available': return 'success';
    case 'in_service': return 'info';
    case 'under_maintenance': return 'warning';
    case 'decommissioned': return 'danger';
    default: return 'neutral';
  }
};

// ── Add/Edit Bus Modal ────────────────────────────────────────────────────────
interface BusModalProps {
  bus?: Bus;
  isOpen: boolean;
  onClose: () => void;
}

function BusModal({ bus, isOpen, onClose }: BusModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<BusFormData>>(
    bus ? {
      plate_number: bus.plate_number,
      model: bus.model,
      seating_capacity: bus.seating_capacity,
      status: bus.status,
      total_mileage: bus.total_mileage,
      last_service_date: bus.last_service_date ?? '',
      next_service_due: bus.next_service_due ?? '',
      assigned_driver: bus.driver?.id ?? null,
    } : {
      status: 'available', seating_capacity: 45, total_mileage: 0
    }
  );

  const { data: usersRes } = useQuery({ queryKey: ['users'], queryFn: () => userApi.list() });
  const drivers = usersRes?.data?.data?.filter((u: any) => u.role === 'driver' || u.department === 'fleet') ?? [];

  const mutation = useMutation({
    mutationFn: () => bus ? fleetApi.update(bus.id, form) : fleetApi.create(form as BusFormData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buses'] }); onClose(); },
  });

  const formatPlateNumber = (val: string) => val.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
  const formatMileage = (val: string) => val.replace(/\D/g, '');

  const field = (label: string, key: keyof BusFormData, type = 'text', placeholder = '', customOnChange?: (val: string) => void) => (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">{label}</label>
      <input
        type={type}
        value={form[key] as string ?? ''}
        onChange={e => {
          if (customOnChange) customOnChange(e.target.value);
          else setForm(p => ({ ...p, [key]: e.target.value }));
        }}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white dark:bg-gray-800"
      />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bus ? 'Refine Vehicle Specs' : 'Fleet Registration'}
      size="lg"
    >
      <div className="space-y-8 p-2">
        <form id="bus-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {field('Plate Number *', 'plate_number', 'text', 'ABC-1234', val => setForm(p => ({ ...p, plate_number: formatPlateNumber(val) })))}
            {field('Bus Model *', 'model', 'text', 'e.g. Yutong ZK6122H')}
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Capacity</label>
              <input type="number" min="1" max="120" value={form.seating_capacity ?? ''} onChange={e => setForm(p => ({ ...p, seating_capacity: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white dark:bg-gray-800" />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none bg-white dark:bg-gray-900">
                <option value="available">Available</option>
                <option value="in_service">In Service</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="decommissioned">Decommissioned</option>
              </select>
            </div>

            {field('Total Mileage (km)', 'total_mileage', 'text', '0', val => setForm(p => ({ ...p, total_mileage: parseInt(formatMileage(val)) || 0 })))}
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Assigned Driver</label>
              <select value={form.assigned_driver || ''} onChange={e => setForm(p => ({ ...p, assigned_driver: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none bg-white dark:bg-gray-900">
                <option value="">-- No Driver Assigned --</option>
                {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
              </select>
            </div>

            {field('Last Service Date', 'last_service_date', 'date')}
            {field('Next Service Due', 'next_service_due', 'date')}
          </div>

          {mutation.isError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
              <LuTriangleAlert size={18} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-700 font-medium leading-relaxed">
                Failed to commit vehicle data. Ensure the plate number is unique and all required metrics are provided.
              </p>
            </div>
          )}
        </form>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose} className="px-8">
            Cancel
          </Button>
          <Button 
            form="bus-form" 
            type="submit" 
            isLoading={mutation.isPending}
            disabled={!form.plate_number || !form.model}
            className="px-8"
          >
            {bus ? 'Commit Updates' : 'Register Vehicle'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Fleet() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['buses', search, statusFilter, page],
    queryFn: () => fleetApi.list({ 
      search: search || undefined, 
      status: statusFilter || undefined,
      page,
      per_page: 10
    }),
    staleTime: 30_000,
  });

  const buses = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const handleEdit = (bus: Bus) => {
    setEditingBus(bus);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingBus(undefined);
    setShowModal(true);
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100 dark:border-gray-800">
            {meta?.total ?? '0'} Vehicles
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Company Fleet Registry
          </p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <LuPlus size={16} /> Register Bus
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 dark:border-gray-800 max-w-md flex-1">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
            <LuSearch size={18} />
          </div>
          <input
            type="text"
            placeholder="Search plate or model..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 dark:text-gray-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-900 font-medium text-gray-600 dark:text-gray-300 appearance-none min-w-[150px]">
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="in_service">In Service</option>
          <option value="under_maintenance">Under Maintenance</option>
          <option value="decommissioned">Decommissioned</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800 uppercase tracking-widest text-[10px]">
                <th className="px-8 py-5">Plate & Model</th>
                <th className="px-8 py-5">Capacity</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Driver</th>
                <th className="px-8 py-5 text-right">Mileage</th>
                <th className="px-8 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-400">
                    <LuLoaderCircle size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-sm font-medium">Retrieving fleet data...</p>
                  </td>
                </tr>
              ) : buses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-400">
                    <LuBus size={32} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">No vehicles found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                buses.map(bus => (
                  <tr key={bus.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group border-b border-gray-50 last:border-0">
                    <td className="px-8 py-6">
                      <div className="font-bold text-gray-900 dark:text-white text-base leading-tight">{bus.plate_number}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{bus.model}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-black tracking-widest uppercase border border-gray-100 dark:border-gray-800">
                        {bus.seating_capacity} pax
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        <StatusBadge 
                          status={bus.status.replace('_', ' ')} 
                          variant={getStatusVariant(bus.status)} 
                        />
                        {bus.is_service_overdue && (
                          <div className="flex items-center gap-1.5 text-[9px] text-red-500 font-black uppercase tracking-widest mt-1">
                            <LuTriangleAlert size={12} /> Overdue PMS
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {bus.driver ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
                            <LuUser size={14} />
                          </div>
                          <div className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            {bus.driver.first_name} {bus.driver.last_name}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300 font-black uppercase tracking-widest italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="text-gray-900 dark:text-white font-black text-base">{bus.total_mileage.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Kilometers</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(bus)}
                        className="p-3"
                      >
                        <LuSettings size={20} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BusModal 
        bus={editingBus} 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />

      {meta && meta.last_page > 1 && (
        <Pagination
          currentPage={page}
          lastPage={meta.last_page}
          total={meta.total}
          perPage={meta.per_page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
