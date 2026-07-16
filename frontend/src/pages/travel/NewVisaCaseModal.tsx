import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LuChevronRight } from 'react-icons/lu';
import { passportingApi } from '../../api/passporting';
import { Modal, Button } from '../../components/ui';
import { COUNTRIES, calculateAge } from './visaProcessing.constants';

export default function NewVisaCaseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [visaType, setVisaType] = useState('Tourist');

  const filteredCountries = useMemo(() => {
    if (!destinationInput.trim()) return [];
    const query = destinationInput.toLowerCase();
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query)
    );
  }, [destinationInput]);

  const mutation = useMutation({
    mutationFn: (resolvedCode: string) => passportingApi.create({
      first_name: firstName.trim(),
      middle_name: middleName.trim() || undefined,
      last_name: lastName.trim(),
      suffix: suffix.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      birth_date: birthDate || undefined,
      case_type: 'visa',
      destination_country: resolvedCode,
      visa_type: visaType,
      checklist: {}
    }),
    onSuccess: () => {
      toast.success('Visa case opened!');
      qc.invalidateQueries({ queryKey: ['visa_cases'] });
      onClose();
    },
    onError: () => toast.error('Failed to open case.'),
  });

  const handleSubmit = () => {
    let resolvedCode = destinationCountry;
    if (!resolvedCode && destinationInput.trim()) {
      const match = COUNTRIES.find(c =>
        c.name.toLowerCase() === destinationInput.trim().toLowerCase() ||
        c.code.toLowerCase() === destinationInput.trim().toLowerCase()
      );
      if (match) {
        resolvedCode = match.code;
      } else {
        resolvedCode = destinationInput.trim();
      }
    }
    mutation.mutate(resolvedCode);
  };

  return (
    <Modal isOpen onClose={onClose} title="Open Visa Case" size="lg">
      <div className="flex flex-col p-2">
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
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">
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

              <div className="relative">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Destination Country *</label>
                <input
                  type="text"
                  required
                  value={destinationInput}
                  onChange={e => {
                    setDestinationInput(e.target.value);
                    setDestinationCountry('');
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  placeholder="Type country name..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showSuggestions && filteredCountries.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                    {filteredCountries.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setDestinationInput(c.name);
                          setDestinationCountry(c.code);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-sm text-gray-800 dark:text-gray-200 transition-colors"
                      >
                        {c.name} ({c.code})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Visa Type *</label>
                <select
                  value={visaType}
                  onChange={e => setVisaType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Tourist">Tourist Visa</option>
                  <option value="Business">Business Visa</option>
                  <option value="Student">Student Visa</option>
                  <option value="Transit">Transit Visa</option>
                  <option value="Other">Other Visa</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold flex items-center gap-2 border border-blue-100/30 dark:border-blue-900/30">
                <span className="shrink-0 inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Passport: Filipino (PH)</span>
              </div>
            </div>
          </details>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} isLoading={mutation.isPending} disabled={!firstName.trim() || !lastName.trim() || !destinationInput.trim() || !visaType}>
              Open Visa Case
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
