import type { JoinersData } from './customTransactionTypes';

interface CategoryFormJoinersProps {
  value: JoinersData;
  onChange: (patch: Partial<JoinersData>) => void;
}

export default function CategoryFormJoiners({ value, onChange }: CategoryFormJoinersProps) {
  return (
    <div className="space-y-4 p-5 rounded-3xl bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/70">
      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1 mb-2">Joiner Tour Custom Specifications</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tour Destination / Code</label>
          <input
            type="text"
            placeholder="e.g. Sagada Weekend Joiners"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.tourCode}
            onChange={(e) => onChange({ tourCode: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Travel Date</label>
          <input
            type="text"
            placeholder="e.g. June 19, 2026"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.travelDate}
            onChange={(e) => onChange({ travelDate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Pax Count</label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.paxCount}
            onChange={(e) => onChange({ paxCount: e.target.value.replace(/[^0-9]/g, '') })}
            onKeyDown={(e) => {
              if (e.ctrlKey || e.metaKey) return;
              if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Pickup Location & Time</label>
          <input
            type="text"
            placeholder="e.g. MoA Globe, 10:00 PM"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.pickupLocation}
            onChange={(e) => onChange({ pickupLocation: e.target.value })}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Drop Off Location</label>
        <input
          type="text"
          placeholder="e.g. Baguio City Center"
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
          value={value.dropoffLocation}
          onChange={(e) => onChange({ dropoffLocation: e.target.value })}
        />
      </div>
    </div>
  );
}
