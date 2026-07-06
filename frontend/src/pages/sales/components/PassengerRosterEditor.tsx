import { LuPlus, LuTrash2 } from 'react-icons/lu';
import type { PassengerInput } from '../../../api/contracts';

interface PassengerRosterEditorProps {
  value: PassengerInput[];
  onChange: (rows: PassengerInput[]) => void;
  label?: string;
}

/** Repeatable passenger/applicant roster editor — shared across Tour Package, Visa Processing, Joiners, Booking. */
export default function PassengerRosterEditor({ value, onChange, label = 'Passenger / Applicant Roster (Optional)' }: PassengerRosterEditorProps) {
  const addRow = () => onChange([...value, { first_name: '', last_name: '' }]);
  const removeRow = (index: number) => onChange(value.filter((_, i) => i !== index));
  const updateRow = (index: number, patch: Partial<PassengerInput>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pl-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
        <button type="button" onClick={addRow} className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest">
          <LuPlus className="w-3 h-3" /> Add Person
        </button>
      </div>

      {value.map((p, i) => (
        <div key={i} className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="First Name"
              value={p.first_name}
              onChange={(e) => updateRow(i, { first_name: e.target.value })}
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={p.last_name}
              onChange={(e) => updateRow(i, { last_name: e.target.value })}
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
            />
            <button type="button" onClick={() => removeRow(i)} className="text-gray-300 hover:text-rose-500 shrink-0">
              <LuTrash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Passport No. (optional)"
              value={p.passport_number || ''}
              onChange={(e) => updateRow(i, { passport_number: e.target.value })}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
            />
            <input
              type="text"
              placeholder="Dietary Restrictions (optional)"
              value={p.dietary_restrictions || ''}
              onChange={(e) => updateRow(i, { dietary_restrictions: e.target.value })}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
