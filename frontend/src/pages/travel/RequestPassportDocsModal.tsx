import { useState } from 'react';
import toast from 'react-hot-toast';
import { LuCircleCheck, LuCopy, LuTriangleAlert } from 'react-icons/lu';
import { passportingApi } from '../../api/passporting';
import { customerApi } from '../../api/customers';
import { Modal, Button } from '../../components/ui';
import { type PassportCase, PASSPORT_CHECKLIST, VISA_CHECKLIST } from './passporting.constants';

// ── Document Request Modal ──────────────────────────────────────────────────
interface RequestDocsModalProps {
  pc: PassportCase;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestPassportDocsModal({ pc, onClose, onSuccess }: RequestDocsModalProps) {
  const [email, setEmail] = useState(pc.customer?.email || '');
  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(pc.checklist || {}).forEach(k => {
      initial[k] = !pc.checklist[k]; // pre-check pending items
    });
    return initial;
  });
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{
    link: string;
    message: string;
    email_sent_to: string;
    mail_error?: string;
  } | null>(null);

  const checklistItems = pc.case_type === 'passport' ? PASSPORT_CHECKLIST : VISA_CHECKLIST;
  const items = Object.keys(pc.checklist || {}).length > 0 ? Object.keys(pc.checklist) : checklistItems;

  const handleToggle = (item: string) => {
    setSelectedDocs(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const handleSend = async () => {
    if (!email.trim()) {
      toast.error('Email is required.');
      return;
    }
    const docs = Object.keys(selectedDocs).filter(k => selectedDocs[k]);
    if (docs.length === 0) {
      toast.error('Please select at least one document to request.');
      return;
    }

    setIsSending(true);
    try {
      if (email.trim() !== (pc.customer?.email || '') && pc.customer?.id) {
        await customerApi.update(pc.customer.id, { email: email.trim() });
        toast.success('Customer email updated in database.');
      }

      const res = await passportingApi.requestDocuments(pc.id, docs);
      if (res.data.success) {
        setResult(res.data);
        if (res.data.mail_error) {
          toast.error('Document request created, but email dispatch failed.');
        } else {
          toast.success('Document request email sent successfully.');
        }
      } else {
        toast.error(res.data.message || 'Failed to send document request.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to send document request.');
    } finally {
      setIsSending(false);
    }
  };

  if (result) {
    const isError = !!result.mail_error;
    return (
      <Modal isOpen onClose={onClose} title="Request Created" size="sm">
        <div className="space-y-5 p-2 font-sans">
          {isError ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 flex items-start gap-3">
              <LuTriangleAlert size={20} className="shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-extrabold uppercase tracking-wider">Email Delivery Failed</p>
                <p className="text-xs opacity-90 leading-relaxed">
                  The upload link was generated, but sending the email failed: <code className="bg-amber-100/50 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono break-all">{result.mail_error}</code>.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/30 flex items-start gap-3">
              <LuCircleCheck size={20} className="shrink-0 text-emerald-500 dark:text-emerald-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-extrabold uppercase tracking-wider">Email Sent Successfully</p>
                <p className="text-xs opacity-90 leading-relaxed">
                  The document request link has been emailed to <strong className="font-semibold">{result.email_sent_to}</strong>.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-450 uppercase tracking-wider">Secure Document Upload Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={result.link}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-gray-850 text-gray-700 dark:text-gray-303 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(result.link);
                    toast.success('Link copied to clipboard!');
                  } catch (err) {
                    toast.error('Failed to copy link.');
                  }
                }}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/15"
              >
                <LuCopy size={14} />
                <span>Copy</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-850">
            <Button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="bg-blue-600 hover:bg-blue-700 shadow-md"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Request Documents Online" size="sm">
      <div className="space-y-4 p-2 font-sans">
        <div>
          <label className="block text-[10px] font-bold text-gray-455 uppercase tracking-wider mb-1.5">Customer Email Address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="customer@example.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-455 uppercase tracking-wider mb-2">Select Documents to Request</label>
          {items.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-2">No documents in checklist. Please add checklist items first.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {items.map(item => (
                <label key={item} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!selectedDocs[item]}
                    onChange={() => handleToggle(item)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{item}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose} disabled={isSending}>Cancel</Button>
          <Button onClick={handleSend} isLoading={isSending} disabled={!email.trim() || Object.keys(selectedDocs).filter(k => selectedDocs[k]).length === 0}>
            Send Email Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}
