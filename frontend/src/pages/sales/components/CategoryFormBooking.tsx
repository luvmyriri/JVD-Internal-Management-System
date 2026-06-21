import type { BookingData } from './customTransactionTypes';

interface CategoryFormBookingProps {
  value: BookingData;
  onChange: (patch: Partial<BookingData>) => void;
}

export default function CategoryFormBooking({ value, onChange }: CategoryFormBookingProps) {
  return (
    <div className="space-y-4 p-5 rounded-3xl bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/70">
      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1 mb-2">Booking Reservation Custom Specifications</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Booking Type</label>
          <select
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.bookingType}
            onChange={(e) => onChange({ bookingType: e.target.value })}
          >
            {['Flight', 'Hotel', 'Activities / Attractions', 'Ferry', 'Bus Ticket', 'Others'].map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Reference / Confirmation Code</label>
          <input
            type="text"
            placeholder="e.g. PNR A1B2C3"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.referenceCode}
            onChange={(e) => onChange({ referenceCode: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Passenger / Guest Name(s)</label>
        <textarea
          placeholder="e.g. John Doe, Jane Doe"
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[60px] dark:text-white"
          value={value.guests}
          onChange={(e) => onChange({ guests: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Flight / Hotel / Reservation Details</label>
        <textarea
          placeholder="e.g. MNL-MPH PR2039 / Shangri-La Deluxe Room"
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all min-h-[60px] dark:text-white"
          value={value.details}
          onChange={(e) => onChange({ details: e.target.value })}
        />
      </div>
    </div>
  );
}
