import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LuPlus, LuTrash2, LuBookOpen } from 'react-icons/lu';
import { customerApi } from '../../api/customers';
import { Button, Modal } from '../ui';

interface PassportRecord {
  id: number;
  passport_number: string;
  issue_country?: string;
  issue_date?: string;
  expiry_date?: string;
  notes?: string;
}

interface Props {
  customerId: number;
  passports: PassportRecord[];
}

export default function PassportManager({ customerId, passports }: Props) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ passport_number: '', issue_country: '', issue_date: '', expiry_date: '', notes: '' });

  const addMutation = useMutation({
    mutationFn: () => customerApi.addPassport(customerId, form),
    onSuccess: () => {
      toast.success('Passport added.');
      qc.invalidateQueries({ queryKey: ['customers', customerId] });
      setShowAdd(false);
      setForm({ passport_number: '', issue_country: '', issue_date: '', expiry_date: '', notes: '' });
    },
    onError: () => toast.error('Failed to add passport.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerApi.deletePassport(customerId, id),
    onSuccess: () => {
      toast.success('Passport deleted.');
      qc.invalidateQueries({ queryKey: ['customers', customerId] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <LuBookOpen className="text-blue-500" /> Passports
        </h3>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5" size="sm">
          <LuPlus size={14} /> Add Passport
        </Button>
      </div>

      {passports.length === 0 ? (
        <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
          No passports registered.
        </div>
      ) : (
        <div className="space-y-3">
          {passports.map(p => (
            <div key={p.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-mono font-bold text-gray-900 dark:text-white">{p.passport_number}</p>
                {p.issue_country && <p className="text-gray-500">Issued by: <span className="font-bold">{p.issue_country}</span></p>}
                {(p.issue_date || p.expiry_date) && (
                  <p className="text-[10px] text-gray-400">
                    {p.issue_date && <span>Issued: {p.issue_date}</span>}
                    {p.expiry_date && <span className="ml-2">Expires: {p.expiry_date}</span>}
                  </p>
                )}
                {p.notes && <p className="text-[10px] text-gray-500 italic mt-1 bg-gray-50 dark:bg-gray-850 p-2 rounded">"{p.notes}"</p>}
              </div>
              <button
                onClick={() => deleteMutation.mutate(p.id)}
                className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-650 rounded-lg transition"
              >
                <LuTrash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Passport Info" size="sm">
        <div className="p-6">
          <form id="passport-form" onSubmit={e => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Passport Number *</label>
              <input type="text" required value={form.passport_number} onChange={e => setForm(p => ({ ...p, passport_number: e.target.value }))} placeholder="e.g. P1234567A" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Issuing Country</label>
              <input type="text" value={form.issue_country} onChange={e => setForm(p => ({ ...p, issue_country: e.target.value }))} placeholder="e.g. Philippines" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500" />
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
            <Button form="passport-form" type="submit" isLoading={addMutation.isPending} disabled={!form.passport_number}>Add Passport</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
