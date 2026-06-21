import { LuCheck } from 'react-icons/lu';
import type { EduTourData } from './customTransactionTypes';

interface CategoryFormEducationalTourProps {
  value: EduTourData;
  onChange: (patch: Partial<EduTourData>) => void;
  buses: any[];
}

export default function CategoryFormEducationalTour({ value, onChange, buses }: CategoryFormEducationalTourProps) {
  return (
    <div className="space-y-4 p-5 rounded-3xl bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/70">
      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1 mb-2">Educational Tour Custom Specifications</p>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">School / Institution Name</label>
        <input
          type="text"
          placeholder="e.g. Camarin High School"
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
          value={value.schoolName}
          onChange={(e) => onChange({ schoolName: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Grade / Year Level</label>
          <input
            type="text"
            placeholder="e.g. Grade 10 & 11"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.gradeLevel}
            onChange={(e) => onChange({ gradeLevel: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Expected Headcount</label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.expectedPax}
            onChange={(e) => onChange({ expectedPax: e.target.value.replace(/[^0-9]/g, '') })}
            onKeyDown={(e) => {
              if (e.ctrlKey || e.metaKey) return;
              if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
              }
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Service Date</label>
          <input
            type="date"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.serviceDate}
            onChange={(e) => onChange({ serviceDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Assigned Bus Unit (Optional)</label>
          <select
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.busId}
            onChange={(e) => onChange({ busId: e.target.value })}
          >
            <option value="">-- Let Dispatch Assign Later --</option>
            {buses.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.bus_number} - {b.plate_number} ({b.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Itinerary Stops</label>
        <textarea
          placeholder="e.g. Science Centrum, Planetarium, Ocean Park..."
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[60px] dark:text-white"
          value={value.stops}
          onChange={(e) => onChange({ stops: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Package Inclusions</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(value.inclusions).map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ inclusions: { ...value.inclusions, [key]: !val } })}
              className={`flex items-center gap-2 p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                val
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                  : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-400 hover:border-gray-205'
              }`}
            >
              <div className={`w-4 h-4 rounded flex items-center justify-center border ${val ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                {val && <LuCheck className="w-3 h-3" />}
              </div>
              <span className="capitalize">{key === 'meals' ? 'Student Meals' : key === 'coordinator' ? 'Tour Coordinator' : key === 'insurance' ? 'Travel Insurance' : 'Souvenir T-Shirt'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
