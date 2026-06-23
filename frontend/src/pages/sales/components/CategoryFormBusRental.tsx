import { LuCheck } from 'react-icons/lu';
import BusLayout from '../../../components/ui/BusLayout';
import type { BusRentalData } from './customTransactionTypes';

interface CategoryFormBusRentalProps {
  value: BusRentalData;
  onChange: (patch: Partial<BusRentalData>) => void;
  buses: any[];
  drivers: any[];
  occupiedSeats: string[];
}

export default function CategoryFormBusRental({ value, onChange, buses, drivers, occupiedSeats }: CategoryFormBusRentalProps) {
  return (
    <div className="space-y-4 p-5 rounded-3xl bg-gray-50/40 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/70">
      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1 mb-2">Bus Rental Custom Specifications</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Vehicle Type</label>
          <select
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.vehicleType}
            onChange={(e) => onChange({ vehicleType: e.target.value })}
          >
            {['Bus', 'Coaster', 'Van', 'Sedan', 'SUV'].map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Number of Days</label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.days}
            onChange={(e) => onChange({ days: e.target.value.replace(/[^0-9]/g, '') })}
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
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Travel Date</label>
          <input
            type="date"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white"
            value={value.travelDate}
            onChange={(e) => {
              const selectedBusObj = buses.find((b: any) => b.id === value.busId);
              const capacity = selectedBusObj?.seating_capacity || 49;
              const allSeats = value.busId ? Array.from({ length: capacity }, (_, i) => String(i + 1)) : [];
              onChange({ travelDate: e.target.value, selectedSeats: allSeats });
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Assign Bus</label>
          <select
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
            value={value.busId || ''}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              const selectedBusObj = buses.find((b: any) => b.id === id);
              let driverIdVal = null;
              let driverNameVal = '';
              let allSeats: string[] = [];
              if (selectedBusObj) {
                const capacity = selectedBusObj.seating_capacity || 49;
                allSeats = Array.from({ length: capacity }, (_, i) => String(i + 1));
                if (selectedBusObj.driver) {
                  driverIdVal = selectedBusObj.driver.id;
                  driverNameVal = `${selectedBusObj.driver.first_name} ${selectedBusObj.driver.last_name}`;
                }
              }
              onChange({ busId: id, selectedSeats: allSeats, driverId: driverIdVal, driverName: driverNameVal });
            }}
          >
            <option value="">Select a Bus...</option>
            {buses.filter((b: any) => b.status?.toLowerCase() === 'available').map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.plate_number} - {b.model} ({b.seating_capacity} Seaters)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Assign Driver</label>
          <select
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
            value={value.driverId || ''}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              const d = drivers.find((x: any) => x.id === id);
              const name = d ? `${d.first_name} ${d.last_name}` : '';
              onChange({ driverId: id, driverName: name });
            }}
          >
            <option value="">Select a Driver...</option>
            {drivers.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.first_name} {d.last_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          {/* Space holder */}
        </div>
      </div>

      {value.busId && value.travelDate && (
        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Select Seats</label>
          <div className="p-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
            <BusLayout
              hasRestroom={buses.find((b: any) => b.id === value.busId)?.bus_category === 'VIP'}
              seats={buses.find((b: any) => b.id === value.busId)?.custom_seats || []}
              totalSeats={buses.find((b: any) => b.id === value.busId)?.seating_capacity || 49}
              selectedSeats={value.selectedSeats}
              occupiedSeats={occupiedSeats}
              onSeatToggle={(seatNum) => {
                // Read-only for custom Bus Rentals
                return;
              }}
            />
          </div>
          {value.selectedSeats.length > 0 && (
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest pl-1">
              Selected: {value.selectedSeats.join(', ')} ({value.selectedSeats.length} seats selected)
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2 md:col-span-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Route / Destination</label>
          <input
            type="text"
            placeholder="e.g. Caloocan to Baguio City"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.route}
            onChange={(e) => onChange({ route: e.target.value })}
          />
        </div>
        <div className="space-y-2 col-span-2 md:col-span-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Service Date</label>
          <input
            type="date"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.serviceDate}
            onChange={(e) => onChange({ serviceDate: e.target.value })}
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
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              onChange({ paxCount: val });
            }}
            onKeyDown={(e) => {
              if (e.ctrlKey || e.metaKey) return;
              if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Pickup Location</label>
          <input
            type="text"
            placeholder="e.g. SM North EDSA"
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-600/5 transition-all dark:text-white"
            value={value.pickupLocation}
            onChange={(e) => onChange({ pickupLocation: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Rental Inclusions</label>
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
              <span className="capitalize">{key === 'driver' ? 'Driver Included' : key === 'fuel' ? 'Fuel Included' : key === 'toll' ? 'Toll Fees' : 'Insurance'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
