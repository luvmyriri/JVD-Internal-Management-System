import { useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LuChevronRight } from 'react-icons/lu';
import { passportingApi } from '../../api/passporting';
import { Modal, Button } from '../../components/ui';
import { calculateAge } from './passporting.constants';

// ── New Case Modal ─────────────────────────────────────────────────────────────
export default function NewPassportCaseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');

  const mutation = useMutation({
    mutationFn: () => passportingApi.create({
      first_name: firstName.trim(),
      middle_name: middleName.trim() || undefined,
      last_name: lastName.trim(),
      suffix: suffix.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      birth_date: birthDate || undefined,
      case_type: 'passport',
    }),
    onSuccess: () => {
      toast.success('Passport case opened successfully!');
      qc.invalidateQueries({ queryKey: ['passport_cases'] });
      onClose();
    },
    onError: () => toast.error('Failed to open case.'),
  });

  return (
    <Modal isOpen onClose={onClose} title="Open New Passport Case" size="sm">
      <div className="overflow-y-auto custom-scrollbar max-h-[75vh] p-2">
        <div className="space-y-5">
          <details className="group" open>
            <summary className="flex items-center justify-between font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer list-none p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <span>Customer Details</span>
              <LuChevronRight className="transition-transform group-open:rotate-90 text-gray-400" />
            </summary>
            <div className="pt-4 px-1 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={e => setMiddleName(e.target.value)}
                    placeholder="Fitzgerald"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Suffix (optional)</label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={e => setSuffix(e.target.value)}
                    placeholder="Jr."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Contact Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="09171234567"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Birthdate</label>
                    {birthDate && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {calculateAge(birthDate)}
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Complete Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="123 Street, Manila"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold flex items-center gap-2 border border-blue-100/30 dark:border-blue-900/30">
                <span className="shrink-0 inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Passport: Filipino (PH)</span>
              </div>
            </div>
          </details>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending} disabled={!firstName.trim() || !lastName.trim()}>
              Open Passport Case
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
