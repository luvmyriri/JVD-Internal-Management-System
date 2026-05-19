import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LuPlus, LuTrash2, LuFileText, LuUserCheck } from 'react-icons/lu';
import { customerApi } from '../../api/customers';
import { Button, Modal } from '../ui';

interface KycRecord {
  id: number;
  document_type: string;
  document_number?: string;
  file_path?: string;
  notes?: string;
  created_at: string;
}

interface Props {
  customerId: number;
  kycs: KycRecord[];
}

export default function KycManager({ customerId, kycs }: Props) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ document_type: '', document_number: '', notes: '' });

  const addMutation = useMutation({
    mutationFn: () => customerApi.addKyc(customerId, form),
    onSuccess: () => {
      toast.success('KYC Document uploaded.');
      qc.invalidateQueries({ queryKey: ['customers', customerId] });
      setShowAdd(false);
      setForm({ document_type: '', document_number: '', notes: '' });
    },
    onError: () => toast.error('Failed to add document.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerApi.deleteKyc(customerId, id),
    onSuccess: () => {
      toast.success('Document deleted.');
      qc.invalidateQueries({ queryKey: ['customers', customerId] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LuUserCheck className="text-emerald-500" /> Walk-in KYC Records
          </h3>
          <p className="text-xs text-gray-400 mt-1">Upload government IDs, proof of billing, or verification documents for walk-in accreditation.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2" size="sm">
          <LuPlus size={16} /> Add KYC Document
        </Button>
      </div>

      {kycs.length === 0 ? (
        <div className="py-10 text-center text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
          No KYC documents uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kycs.map(kyc => (
            <div key={kyc.id} className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-start gap-4 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <LuFileText size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{kyc.document_type}</h4>
                {kyc.document_number && <p className="text-xs font-mono text-gray-500 mt-0.5">No. {kyc.document_number}</p>}
                {kyc.notes && <p className="text-xs text-gray-500 mt-2 italic bg-gray-50 dark:bg-gray-850 p-2.5 rounded-lg">"{kyc.notes}"</p>}
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block mt-3">Uploaded: {new Date(kyc.created_at).toLocaleDateString()}</span>
              </div>
              <button
                onClick={() => deleteMutation.mutate(kyc.id)}
                className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
              >
                <LuTrash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add KYC Document" size="md">
        <div className="p-6">
          <form id="kyc-form" onSubmit={e => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Document Type *</label>
              <input type="text" required value={form.document_type} onChange={e => setForm(p => ({ ...p, document_type: e.target.value }))} placeholder="e.g. Passport copy, Voter's ID, Utility Bill" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Document ID Number (Optional)</label>
              <input type="text" value={form.document_number} onChange={e => setForm(p => ({ ...p, document_number: e.target.value }))} placeholder="e.g. N01-12-345678" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Agent Notes / Verification remarks</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Verified against original copy." className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 resize-none" rows={3} />
            </div>
          </form>
          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button form="kyc-form" type="submit" isLoading={addMutation.isPending} disabled={!form.document_type}>Upload Document</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
