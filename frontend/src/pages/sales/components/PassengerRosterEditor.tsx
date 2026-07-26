import { LuPlus, LuTrash2, LuUserCheck } from 'react-icons/lu';
import type { PassengerInput } from '../../../api/contracts';

export interface PassengerRosterItem extends PassengerInput {
  role?: 'student' | 'adult' | 'child' | 'tour_guide';
  seat_code?: string;
}

interface PassengerRosterEditorProps {
  value: PassengerRosterItem[];
  onChange: (rows: PassengerRosterItem[]) => void;
  label?: string;
}

/** Repeatable passenger/applicant roster editor — shared across Tour Package, Educational Tour, Visa Processing, Joiners, Booking. */
export default function PassengerRosterEditor({
  value,
  onChange,
  label = 'Passenger Manifest & Seat Roster',
}: PassengerRosterEditorProps) {
  const addRow = (role: 'student' | 'adult' | 'child' | 'tour_guide' = 'adult') =>
    onChange([...value, { first_name: '', last_name: '', role }]);

  const removeRow = (index: number) => onChange(value.filter((_, i) => i !== index));

  const updateRow = (index: number, patch: Partial<PassengerRosterItem>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label} ({value.length})</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addRow('tour_guide')}
            className="flex items-center gap-1 text-[10px] font-black text-purple-600 uppercase tracking-widest hover:text-purple-700"
          >
            <LuPlus className="w-3 h-3" /> + Tour Guide
          </button>
          <button
            type="button"
            onClick={() => addRow('adult')}
            className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700"
          >
            <LuPlus className="w-3 h-3" /> + Passenger
          </button>
        </div>
      </div>

      {value.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center text-xs font-semibold text-gray-400 dark:border-gray-800">
          No passengers added to manifest yet. Click &quot;+ Passenger&quot; or &quot;+ Tour Guide&quot; above.
        </div>
      ) : (
        value.map((p, i) => (
          <div key={i} className="p-3.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-black text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                {i + 1}
              </span>
              
              <select
                value={p.role || 'adult'}
                onChange={(e) => updateRow(i, { role: e.target.value as any })}
                className="rounded-xl border border-gray-200 bg-white px-2 py-1 text-xs font-bold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="student">Student</option>
                <option value="tour_guide">Tour Guide</option>
                <option value="adult">Adult</option>
                <option value="child">Child</option>
              </select>

              <input
                type="text"
                placeholder="First Name"
                value={p.first_name}
                onChange={(e) => updateRow(i, { first_name: e.target.value })}
                className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={p.last_name}
                onChange={(e) => updateRow(i, { last_name: e.target.value })}
                className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
              />

              <div className="w-24">
                <input
                  type="text"
                  placeholder="Seat #"
                  value={p.seat_code || ''}
                  onChange={(e) => updateRow(i, { seat_code: e.target.value })}
                  className="w-full px-2 py-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-black text-blue-700 dark:text-blue-300 text-center"
                />
              </div>

              <button type="button" onClick={() => removeRow(i)} className="text-gray-300 hover:text-rose-500 shrink-0 p-1">
                <LuTrash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-0.5">
                  Date of Birth * (Insurance Policy)
                </label>
                <input
                  type="date"
                  value={p.date_of_birth || ''}
                  onChange={(e) => updateRow(i, { date_of_birth: e.target.value })}
                  className="w-full px-3 py-1.5 bg-blue-50/50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">
                  Special Requests / Dietary Notes
                </label>
                <input
                  type="text"
                  placeholder="Dietary / Medical / Notes"
                  value={p.dietary_restrictions || p.special_needs || ''}
                  onChange={(e) => updateRow(i, { dietary_restrictions: e.target.value, special_needs: e.target.value })}
                  className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
