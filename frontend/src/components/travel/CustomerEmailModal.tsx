import { useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { Modal, Button } from '../ui';
import { customerApi } from '../../api/customers';

interface Props {
  customerId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerEmailModal({ customerId, isOpen, onClose }: Props) {
  const [form, setForm] = useState({ subject: '', message: '' });

  const mutation = useMutation({
    mutationFn: () => customerApi.sendEmail(customerId, form),
    onSuccess: () => {
      toast.success('Email sent securely to customer.');
      onClose();
      setForm({ subject: '', message: '' });
    },
    onError: () => toast.error('Failed to send email. Ensure the customer has a valid email address.'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Customer Outreach" size="lg">
      <div className="p-6">
        <div className="mb-4 text-sm text-gray-500 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
          <strong>Note:</strong> This message will be automatically formatted into the official JVD ETMC professional email template before sending.
        </div>

        <form id="email-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Subject *</label>
            <input
              type="text"
              required
              value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="Action Required: Flight Details"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Message *</label>
            <textarea
              required
              rows={8}
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              placeholder="Type your message here. It will be injected into the center of the email."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow resize-none bg-white dark:bg-gray-900"
            />
          </div>
        </form>
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 mt-6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button form="email-form" type="submit" isLoading={mutation.isPending}
            disabled={!form.subject || !form.message}>
            Send Email
          </Button>
        </div>
      </div>
    </Modal>
  );
}
