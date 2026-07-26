import { LuPlus, LuTrash2, LuCalendar, LuSparkles } from 'react-icons/lu';
import type { ItineraryDayInput } from '../../../api/contracts';

interface ItineraryBuilderProps {
  value: ItineraryDayInput[];
  onChange: (rows: ItineraryDayInput[]) => void;
  readOnly?: boolean;
}

/** Repeatable day-by-day itinerary row editor — supports 1-Day, Multi-Day, and Customized Tours. */
export default function ItineraryBuilder({ value = [], onChange, readOnly = false }: ItineraryBuilderProps) {
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

  const applyPresetTemplate = (type: '1day' | '3d2n') => {
    if (type === '1day') {
      onChange([
        {
          day_number: 1,
          location: 'Destination Highlights',
          activity_description: '05:00 AM Departure -> 08:30 AM Arrival & Morning Sightseeing -> 12:00 PM Buffet Lunch -> 02:00 PM Afternoon Tour & Attractions -> 05:00 PM Return Trip Home.',
          meal_plan: 'Lunch Included',
          accommodation_name: 'N/A (1-Day Tour)',
        },
      ]);
    } else if (type === '3d2n') {
      onChange([
        {
          day_number: 1,
          location: 'Arrival & Check-in',
          activity_description: 'Departure & travel to destination -> Arrival & Hotel Check-in -> Afternoon orientation tour -> Free time.',
          meal_plan: 'Welcome Lunch / Dinner',
          accommodation_name: 'Hotel Accommodation',
        },
        {
          day_number: 2,
          location: 'Full Day Island & Cultural Tour',
          activity_description: 'Hotel Breakfast -> Full day guided sightseeing & main tourist attraction visits -> Lunch break -> Sunset viewpoint.',
          meal_plan: 'Breakfast Included',
          accommodation_name: 'Hotel Accommodation',
        },
        {
          day_number: 3,
          location: 'Souvenir Shopping & Homeward Departure',
          activity_description: 'Hotel Breakfast & Check-out -> Local market & pasalubong souvenir shopping -> Departure back to origin.',
          meal_plan: 'Breakfast Included',
          accommodation_name: 'N/A',
        },
      ]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Tour Itinerary Builder ({value.length} {value.length === 1 ? 'Day' : 'Days'})
        </label>
        
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
              <LuSparkles className="h-3 w-3 text-amber-500" /> Templates:
            </span>
            <button
              type="button"
              onClick={() => applyPresetTemplate('1day')}
              className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
            >
              1-Day Tour
            </button>
            <button
              type="button"
              onClick={() => applyPresetTemplate('3d2n')}
              className="rounded-lg border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300"
            >
              3D2N Tour
            </button>
            <button
              type="button"
              onClick={addDay}
              className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow hover:bg-blue-700"
            >
              <LuPlus className="h-3 w-3" /> Add Day
            </button>
          </div>
        )}
      </div>

      {value.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-xs font-semibold text-gray-400 dark:border-gray-800">
          No itinerary days added yet. Click &quot;Add Day&quot; or pick a template above.
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((day, i) => (
            <div
              key={i}
              className="relative space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                  <LuCalendar className="h-3 w-3" /> Day {day.day_number}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeDay(i)}
                    className="text-gray-300 hover:text-rose-500 transition-colors"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Date (Optional)</label>
                  <input
                    type="date"
                    disabled={readOnly}
                    value={day.date || ''}
                    onChange={(e) => updateDay(i, { date: e.target.value })}
                    className="mt-0.5 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Location / Route</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    placeholder="e.g. Tagaytay City"
                    value={day.location || ''}
                    onChange={(e) => updateDay(i, { location: e.target.value })}
                    className="mt-0.5 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Activity & Schedule Description</label>
                <textarea
                  disabled={readOnly}
                  placeholder="Describe activities, visits, and timeline for this day..."
                  value={day.activity_description || ''}
                  onChange={(e) => updateDay(i, { activity_description: e.target.value })}
                  className="mt-0.5 min-h-[60px] w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Meal Plan</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    placeholder="e.g. Breakfast Included"
                    value={day.meal_plan || ''}
                    onChange={(e) => updateDay(i, { meal_plan: e.target.value })}
                    className="mt-0.5 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Accommodation</label>
                  <input
                    type="text"
                    disabled={readOnly}
                    placeholder="e.g. Midtown Hotel Baguio"
                    value={day.accommodation_name || ''}
                    onChange={(e) => updateDay(i, { accommodation_name: e.target.value })}
                    className="mt-0.5 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
