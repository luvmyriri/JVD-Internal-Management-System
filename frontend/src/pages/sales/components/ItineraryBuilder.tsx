import { LuPlus, LuTrash2 } from 'react-icons/lu';
import type { ItineraryDayInput } from '../../../api/contracts';

interface ItineraryBuilderProps {
  value: ItineraryDayInput[];
  onChange: (rows: ItineraryDayInput[]) => void;
}

/** Repeatable day-by-day itinerary row editor — shared across Tour Package / Educational Tour. */
export default function ItineraryBuilder({ value, onChange }: ItineraryBuilderProps) {
  const addDay = () => {
    onChange([...value, { day_number: value.length + 1, location: '', activity_description: '' }]);
  };

  const removeDay = (index: number) => {
    const rows = value.filter((_, i) => i !== index).map((row, i) => ({ ...row, day_number: i + 1 }));
    onChange(rows);
  };

  const updateDay = (index: number, patch: Partial<ItineraryDayInput>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pl-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Itinerary (Optional)</label>
        <button type="button" onClick={addDay} className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest">
          <LuPlus className="w-3 h-3" /> Add Day
        </button>
      </div>

      {value.map((day, i) => (
        <div key={i} className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Day {day.day_number}</span>
            <button type="button" onClick={() => removeDay(i)} className="text-gray-300 hover:text-rose-500">
              <LuTrash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={day.date || ''}
              onChange={(e) => updateDay(i, { date: e.target.value })}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
            />
            <input
              type="text"
              placeholder="Location"
              value={day.location || ''}
              onChange={(e) => updateDay(i, { location: e.target.value })}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
            />
          </div>
          <textarea
            placeholder="Activity description"
            value={day.activity_description || ''}
            onChange={(e) => updateDay(i, { activity_description: e.target.value })}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white min-h-[50px]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Meal Plan"
              value={day.meal_plan || ''}
              onChange={(e) => updateDay(i, { meal_plan: e.target.value })}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
            />
            <input
              type="text"
              placeholder="Accommodation"
              value={day.accommodation_name || ''}
              onChange={(e) => updateDay(i, { accommodation_name: e.target.value })}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
