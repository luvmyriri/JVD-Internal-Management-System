import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuBus, LuPlus, LuSearch, LuSettings, LuTriangleAlert, LuX, LuLoaderCircle, LuUser
} from 'react-icons/lu';
import { fleetApi } from '../../api/fleet';
import type { Bus, BusFormData } from '../../types/inventory';
import { userApi } from '../../api/users'; // To get drivers

const statusStyles: Record<string, string> = {
  available: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  in_service: 'bg-blue-50 text-blue-700 border border-blue-200',
  under_maintenance: 'bg-amber-50 text-amber-700 border border-amber-200',
  decommissioned: 'bg-red-50 text-red-700 border border-red-200',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ── Add/Edit Bus Modal ────────────────────────────────────────────────────────
interface BusModalProps {
  bus?: Bus;
  onClose: () => void;
}

function BusModal({ bus, onClose }: BusModalProps) {
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
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key] as string ?? ''}
        onChange={e => {
          if (customOnChange) customOnChange(e.target.value);
          else setForm(p => ({ ...p, [key]: e.target.value }));
        }}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 bg-white shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{bus ? 'Edit Bus' : 'Add New Bus'}</h2>
            <p className="text-sm text-gray-500 mt-1">{bus ? 'Update fleet vehicle details.' : 'Register a new vehicle into the fleet.'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50"><LuX size={20} /></button>
        </div>
        
        <div className="p-8 overflow-y-auto">
          <form id="bus-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {field('Plate Number *', 'plate_number', 'text', 'ABC-1234', val => setForm(p => ({ ...p, plate_number: formatPlateNumber(val) })))}
              {field('Bus Model *', 'model', 'text', 'e.g. Yutong ZK6122H')}
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Capacity</label>
                <input type="number" min="1" max="120" value={form.seating_capacity ?? ''} onChange={e => setForm(p => ({ ...p, seating_capacity: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white" />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow appearance-none bg-white">
                  <option value="available">Available</option>
                  <option value="in_service">In Service</option>
                  <option value="under_maintenance">Under Maintenance</option>
                  <option value="decommissioned">Decommissioned</option>
                </select>
              </div>

              {field('Total Mileage (km)', 'total_mileage', 'text', '0', val => setForm(p => ({ ...p, total_mileage: parseInt(formatMileage(val)) || 0 })))}
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Assigned Driver</label>
                <select value={form.assigned_driver || ''} onChange={e => setForm(p => ({ ...p, assigned_driver: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow appearance-none bg-white">
                  <option value="">-- No Driver Assigned --</option>
                  {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
                </select>
              </div>

              {field('Last Service Date', 'last_service_date', 'date')}
              {field('Next Service Due', 'next_service_due', 'date')}
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mt-4">
                Failed to save bus details. Please check the plate number and required fields.
              </p>
            )}
          </form>
        </div>

        <div className="p-6 px-8 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition">
            Cancel
          </button>
          <button form="bus-form" type="submit" disabled={!form.plate_number || !form.model || mutation.isPending}
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition flex items-center gap-2 shadow-lg shadow-blue-200/50">
            {mutation.isPending && <LuLoaderCircle size={16} className="animate-spin" />}
            {bus ? 'Update Bus' : 'Register Bus'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Fleet() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['buses', search, statusFilter],
    queryFn: () => fleetApi.list({ search: search || undefined, status: statusFilter || undefined }),
    staleTime: 30_000,
  });

  const buses = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100">
            {meta?.total ?? '0'} Vehicles
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Company Fleet Registry
          </p>
        </div>
        <button onClick={() => { setEditingBus(undefined); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200">
          <LuPlus size={16} /> Register Bus
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 max-w-md flex-1">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
            <LuSearch size={18} />
          </div>
          <input
            type="text"
            placeholder="Search plate or model..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-gray-600">
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="in_service">In Service</option>
          <option value="under_maintenance">Under Maintenance</option>
          <option value="decommissioned">Decommissioned</option>
        </select>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Plate & Model</th>
                <th className="px-6 py-4">Capacity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Driver</th>
                <th className="px-6 py-4 text-right">Mileage</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <LuLoaderCircle size={24} className="animate-spin mx-auto mb-2" />
                    Loading fleet data...
                  </td>
                </tr>
              ) : buses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <LuBus size={32} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />
                    No buses found matching your criteria.
                  </td>
                </tr>
              ) : (
                buses.map(bus => (
                  <tr key={bus.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{bus.plate_number}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{bus.model}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-600">{bus.seating_capacity} pax</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={bus.status} />
                      {bus.is_service_overdue && (
                        <div className="flex items-center gap-1 text-[10px] text-red-500 font-bold mt-1 uppercase tracking-wider">
                          <LuTriangleAlert size={10} /> Overdue PMS
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {bus.driver ? (
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                            <LuUser size={12} />
                          </div>
                          {bus.driver.first_name} {bus.driver.last_name}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-700">
                      {bus.total_mileage.toLocaleString()} km
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => { setEditingBus(bus); setShowModal(true); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition">
                        <LuSettings size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <BusModal bus={editingBus} onClose={() => setShowModal(false)} />}
    </div>
  );
}
