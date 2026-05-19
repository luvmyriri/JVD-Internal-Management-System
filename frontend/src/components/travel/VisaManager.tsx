import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LuPlus, LuTrash2, LuStamp } from 'react-icons/lu';
import { customerApi } from '../../api/customers';
import { Button, Modal } from '../ui';

interface VisaRecord {
  id: number;
  country: string;
  visa_type?: string;
  visa_number: string;
  issue_date?: string;
  expiry_date?: string;
  notes?: string;
}

interface Props {
  customerId: number;
  visas: VisaRecord[];
}

export default function VisaManager({ customerId, visas }: Props) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ country: '', visa_type: '', visa_number: '', issue_date: '', expiry_date: '', notes: '' });

  const addMutation = useMutation({
    mutationFn: () => customerApi.addVisa(customerId, form),
    onSuccess: () => {
      toast.success('Visa added.');
      qc.invalidateQueries({ queryKey: ['customers', customerId] });
      setShowAdd(false);
      setForm({ country: '', visa_type: '', visa_number: '', issue_date: '', expiry_date: '', notes: '' });
    },
    onError: () => toast.error('Failed to add visa.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerApi.deleteVisa(customerId, id),
    onSuccess: () => {
      toast.success('Visa deleted.');
      qc.invalidateQueries({ queryKey: ['customers', customerId] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <LuStamp className="text-purple-500" /> Visas
        </h3>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 animate-pulse-subtle" size="sm">
          <LuPlus size={14} /> Add Visa
        </Button>
      </div>

      {visas.length === 0 ? (
        <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
          No visas registered.
        </div>
      ) : (
        <div className="space-y-3">
          {visas.map(v => (
            <div key={v.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-gray-900 dark:text-white">{v.country} <span className="text-gray-400 font-normal">({v.visa_type || 'Visa'})</span></p>
                <p className="font-mono text-gray-500">No. {v.visa_number}</p>
                {(v.issue_date || v.expiry_date) && (
                  <p className="text-[10px] text-gray-400">
                    {v.issue_date && <span>Issued: {v.issue_date}</span>}
                    {v.expiry_date && <span className="ml-2">Expires: {v.expiry_date}</span>}
                  </p>
                )}
                {v.notes && <p className="text-[10px] text-gray-500 italic mt-1 bg-gray-50 dark:bg-gray-850 p-2 rounded">"{v.notes}"</p>}
              </div>
              <button
                onClick={() => deleteMutation.mutate(v.id)}
                className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-650 rounded-lg transition"
              >
                <LuTrash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Visa Info" size="sm">
        <div className="p-6">
          <form id="visa-form" onSubmit={e => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Country *</label>
              <input type="text" required value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} placeholder="e.g. United States, Japan" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Visa Number *</label>
                <input type="text" required value={form.visa_number} onChange={e => setForm(p => ({ ...p, visa_number: e.target.value }))} placeholder="e.g. V1234567" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Visa Type (Optional)</label>
                <input type="text" value={form.visa_type} onChange={e => setForm(p => ({ ...p, visa_type: e.target.value }))} placeholder="e.g. Tourist, Business" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Issue Date</label>
                <input type="date" value={form.issue_date} onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional details..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 resize-none" rows={2} />
            </div>
          </form>
          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button form="visa-form" type="submit" isLoading={addMutation.isPending} disabled={!form.country || !form.visa_number}>Add Visa</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
