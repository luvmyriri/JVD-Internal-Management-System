import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LuFileText, LuPlus, LuSearch, LuSettings, LuX, LuLoaderCircle, LuSend
} from 'react-icons/lu';
import { accreditationsApi, type Accreditation } from '../../api/accreditations';
import { fleetApi } from '../../api/fleet';
import { format, parseISO } from 'date-fns';

// ── Add/Edit Modal ────────────────────────────────────────────────────────
interface BusAccreditationModalProps {
  accreditation?: Accreditation;
  onClose: () => void;
}

function BusAccreditationModal({ accreditation, onClose }: BusAccreditationModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Accreditation>>(
    accreditation ? {
      entity_name: accreditation.entity_name,
      accreditation_type: accreditation.accreditation_type,
      issuing_body: accreditation.issuing_body || '',
      issue_date: accreditation.issue_date || '',
      expiry_date: accreditation.expiry_date || '',
      status: accreditation.status,
      contact_person: accreditation.contact_person,
      contact_email: accreditation.contact_email,
    } : {
      entity_type: 'bus',
      status: 'pending_renewal',
    }
  );

  const { data: busesRes } = useQuery({ queryKey: ['buses-list'], queryFn: () => fleetApi.list() });
  const buses = busesRes?.data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => accreditation 
      ? accreditationsApi.update(accreditation.id, form) 
      : accreditationsApi.create({ ...form, entity_type: 'bus' } as Partial<Accreditation>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accreditations'] }); onClose(); },
  });

  const field = (label: string, key: keyof Accreditation, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key] as string ?? ''}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100 bg-white shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{accreditation ? 'Edit Compliance Record' : 'New Compliance Record'}</h2>
            <p className="text-sm text-gray-500 mt-1">Manage LTFRB, LTO, and other bus compliance documents.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition bg-gray-50"><LuX size={20} /></button>
        </div>
        
        <div className="p-8 overflow-y-auto">
          <form id="acc-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {!accreditation && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Select Bus *</label>
                  <select value={form.entity_name ?? ''} onChange={e => setForm(p => ({ ...p, entity_name: e.target.value }))} required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white">
                    <option value="">-- Choose Bus --</option>
                    {buses.map((b: any) => <option key={b.id} value={b.plate_number}>{b.plate_number} ({b.model})</option>)}
                  </select>
                </div>
              )}
              {accreditation && field('Bus Plate', 'entity_name', 'text')}
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Record Type *</label>
                <select value={form.accreditation_type ?? ''} onChange={e => setForm(p => ({ ...p, accreditation_type: e.target.value }))} required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white">
                  <option value="">-- Select Type --</option>
                  <option value="LTFRB Franchise">LTFRB Franchise</option>
                  <option value="LTO Registration">LTO Registration</option>
                  <option value="Comprehensive Insurance">Comprehensive Insurance</option>
                  <option value="TPL Insurance">TPL Insurance</option>
                  <option value="Emission Test">Emission Test</option>
                </select>
              </div>

              {field('Issuing Body', 'issuing_body', 'text', 'e.g. LTFRB, LTO')}
              {field('Issue Date', 'issue_date', 'date')}
              {field('Expiry Date', 'expiry_date', 'date')}
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status *</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white">
                  <option value="active">Active</option>
                  <option value="pending_renewal">Pending Renewal</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {field('Assigned Coordinator', 'contact_person', 'text', 'Staff Name')}
              {field('Coordinator Email', 'contact_email', 'email', 'staff@jvd.com')}
            </div>
            {mutation.isError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 mt-4">Failed to save compliance record.</p>}
          </form>
        </div>

        <div className="p-6 px-8 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-[2rem]">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition">
            Cancel
          </button>
          <button form="acc-form" type="submit" disabled={!form.entity_name || !form.accreditation_type || mutation.isPending}
            className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition flex items-center gap-2 shadow-lg shadow-blue-200/50">
            {mutation.isPending && <LuLoaderCircle size={16} className="animate-spin" />}
            {accreditation ? 'Save Changes' : 'Add Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function BusAccreditation() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAcc, setEditingAcc] = useState<Accreditation | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['accreditations'],
    queryFn: accreditationsApi.getAll,
    staleTime: 30_000,
  });

  const allAccreditations = data ?? [];
  const busAccreditations = allAccreditations.filter(a => a.entity_type === 'bus');

  const filtered = busAccreditations.filter(a => 
    (a.entity_name?.toLowerCase() || '').includes(search.toLowerCase()) || 
    (a.accreditation_type?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Bus Compliance & Accreditations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage LTO, LTFRB, and Insurance records</p>
        </div>
        <button onClick={() => { setEditingAcc(undefined); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200">
          <LuPlus size={16} /> Add Record
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <LuSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plate or record type..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Bus / Plate</th>
                <th className="px-6 py-4">Record Type</th>
                <th className="px-6 py-4">Issuing Body</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Expiry Date</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <LuLoaderCircle size={24} className="animate-spin mx-auto mb-2" />
                    Loading compliance records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <LuFileText size={32} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />
                    No compliance records found.
                  </td>
                </tr>
              ) : (
                filtered.map(acc => (
                  <tr key={acc.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{acc.entity_name}</td>
                    <td className="px-6 py-4 font-medium text-gray-600">{acc.accreditation_type}</td>
                    <td className="px-6 py-4 text-gray-500">{acc.issuing_body || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        acc.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        acc.status === 'expired' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {acc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {acc.expiry_date ? (
                        <div className={`font-bold ${new Date(acc.expiry_date) < new Date() ? 'text-red-600' : 'text-gray-700'}`}>
                          {format(parseISO(acc.expiry_date), 'MMM dd, yyyy')}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition" title="Send Reminder via Email">
                          <LuSend size={16} />
                        </button>
                        <button onClick={() => { setEditingAcc(acc); setShowModal(true); }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition" title="Edit Record">
                          <LuSettings size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <BusAccreditationModal accreditation={editingAcc} onClose={() => setShowModal(false)} />}
    </div>
  );
}
