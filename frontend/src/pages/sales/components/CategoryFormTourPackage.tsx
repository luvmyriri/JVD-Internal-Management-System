import type { TourPackageData } from './customTransactionTypes';

interface CategoryFormTourPackageProps {
  value: TourPackageData;
  onChange: (patch: Partial<TourPackageData>) => void;
}

export default function CategoryFormTourPackage({ value, onChange }: CategoryFormTourPackageProps) {
  return (
    <div className="space-y-4 p-5 rounded-3xl bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/70">
      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1 mb-2">Tour Package Custom Specifications</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tour Destination</label>
          <input
            type="text"
            placeholder="e.g. Boracay 3D2N"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.destination}
            onChange={(e) => onChange({ destination: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Travel Dates</label>
          <input
            type="text"
            placeholder="e.g. June 15-18, 2026"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.travelDates}
            onChange={(e) => onChange({ travelDates: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Adults</label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.adults}
            onChange={(e) => onChange({ adults: e.target.value.replace(/[^0-9]/g, '') })}
            onKeyDown={(e) => {
              if (e.ctrlKey || e.metaKey) return;
              if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Children</label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.children}
            onChange={(e) => onChange({ children: e.target.value.replace(/[^0-9]/g, '') })}
            onKeyDown={(e) => {
              if (e.ctrlKey || e.metaKey) return;
              if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Accommodation</label>
          <select
            className="w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.accommodation}
            onChange={(e) => onChange({ accommodation: e.target.value })}
          >
            {['Hotel', 'Resort', 'Transient', 'Hostel', 'None'].map(acc => (
              <option key={acc} value={acc}>{acc}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Itinerary / Specifics</label>
        <textarea
          placeholder="Include flight detail, preferred hotels, or tours list..."
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[80px] dark:text-white"
          value={value.itinerary}
          onChange={(e) => onChange({ itinerary: e.target.value })}
        />
      </div>
    </div>
  );
}
