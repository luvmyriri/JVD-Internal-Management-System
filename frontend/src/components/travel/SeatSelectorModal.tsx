import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LuBus, LuCheck, LuX, LuCircleAlert, LuLoaderCircle, LuUserCheck } from 'react-icons/lu';
import client from '../../api/client';
import BusLayout from '../ui/BusLayout';

export type VehicleBookingMode = 'entire_vehicle' | 'specific_seats';

export interface SeatSelectionResult {
  bookingMode: VehicleBookingMode;
  busId: number;
  busPlate: string;
  selectedSeats: string[];
  paxCount: number;
  driverId?: number;
  driverName?: string;
}

interface SeatSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: SeatSelectionResult) => void;
  buses: Array<{ id: number; plate_number: string; model: string; seating_capacity: number; driver?: any }>;
  initialBusId?: number;
  initialMode?: VehicleBookingMode;
  initialSeats?: string[];
  travelDate?: string;
  returnDate?: string;
  paxCount?: number;
  packageName?: string;
}

export default function SeatSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  buses = [],
  initialBusId,
  initialMode = 'specific_seats',
  initialSeats = [],
  travelDate,
  returnDate,
  paxCount = 1,
  packageName = 'Selected Package',
}: SeatSelectorModalProps) {
  const [selectedBusId, setSelectedBusId] = useState<number | null>(initialBusId || (buses[0]?.id ?? null));
  const [bookingMode, setBookingMode] = useState<VehicleBookingMode>(initialMode);
  const [selectedSeats, setSelectedSeats] = useState<string[]>(initialSeats);

  useEffect(() => {
    if (initialBusId) setSelectedBusId(initialBusId);
    if (initialMode) setBookingMode(initialMode);
    if (initialSeats) setSelectedSeats(initialSeats);
  }, [initialBusId, initialMode, initialSeats, isOpen]);

  // Set default bus if none selected
  useEffect(() => {
    if (!selectedBusId && buses.length > 0) {
      setSelectedBusId(buses[0].id);
    }
  }, [buses, selectedBusId]);

  const activeBus = useMemo(() => {
    return buses.find((b) => b.id === selectedBusId) || buses[0] || null;
  }, [buses, selectedBusId]);

  const startDate = travelDate || new Date().toISOString().split('T')[0];
  const endDate = returnDate || startDate;

  // Fetch real-time bus & seat availability from backend API
  const { data: availabilityResponse, isLoading, refetch } = useQuery({
    queryKey: ['bus-availability', selectedBusId, startDate, endDate],
    queryFn: async () => {
      if (!selectedBusId) return null;
      const res = await client.get('/api/sales/bus-availability', {
        params: { bus_id: selectedBusId, starts_at: startDate, ends_at: endDate },
      });
      return res.data?.data;
    },
    enabled: isOpen && !!selectedBusId,
  });

  const occupiedSeats: string[] = availabilityResponse?.occupied_seats || [];
  const isWholeVehicleBooked: boolean = availabilityResponse?.is_whole_vehicle_booked || false;
  const seatingCapacity: number = availabilityResponse?.seating_capacity || activeBus?.seating_capacity || 49;

  // Auto-select first available seat when opening modal in specific_seats mode
  useEffect(() => {
    if (isOpen && bookingMode === 'specific_seats' && selectedSeats.length === 0 && !isWholeVehicleBooked) {
      for (let i = 1; i <= seatingCapacity; i++) {
        const code = String(i);
        if (!occupiedSeats.includes(code)) {
          setSelectedSeats([code]);
          break;
        }
      }
    }
  }, [isOpen, bookingMode, seatingCapacity, occupiedSeats, isWholeVehicleBooked]);

  const handleSeatToggle = (seatNumber: string) => {
    if (occupiedSeats.includes(seatNumber) || isWholeVehicleBooked) return;

    setSelectedSeats((prev) => {
      const exists = prev.includes(seatNumber);
      if (exists) {
        return prev.filter((s) => s !== seatNumber);
      } else {
        return [...prev, seatNumber].sort((a, b) => Number(a) - Number(b));
      }
    });
  };

  const handleConfirm = () => {
    if (!activeBus) return;

    if (bookingMode === 'entire_vehicle') {
      // Auto-select all seats for whole vehicle charter
      const allSeats = Array.from({ length: seatingCapacity }, (_, i) => String(i + 1));
      onConfirm({
        bookingMode: 'entire_vehicle',
        busId: activeBus.id,
        busPlate: activeBus.plate_number,
        selectedSeats: allSeats,
        paxCount: seatingCapacity,
        driverId: activeBus.driver?.id,
        driverName: activeBus.driver ? `${activeBus.driver.first_name} ${activeBus.driver.last_name}` : undefined,
      });
    } else {
      if (selectedSeats.length === 0) {
        alert('Please select at least 1 seat before proceeding to checkout.');
        return;
      }
      onConfirm({
        bookingMode: 'specific_seats',
        busId: activeBus.id,
        busPlate: activeBus.plate_number,
        selectedSeats,
        paxCount: selectedSeats.length,
        driverId: activeBus.driver?.id,
        driverName: activeBus.driver ? `${activeBus.driver.first_name} ${activeBus.driver.last_name}` : undefined,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                <LuBus className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  Vehicle & Seat Selector
                </h3>
                <p className="text-xs font-semibold text-gray-500">
                  {packageName} · {startDate} {returnDate && returnDate !== startDate ? `to ${returnDate}` : ''}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        {/* Vehicle Selection & Mode Toggles */}
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            
            {/* Bus Select */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Assigned Fleet Vehicle & Driver
              </label>
              <select
                value={selectedBusId || ''}
                onChange={(e) => {
                  setSelectedBusId(Number(e.target.value));
                  setSelectedSeats([]);
                }}
                className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs font-bold text-gray-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.plate_number} — {bus.model} ({bus.seating_capacity} Seats) {bus.driver ? `· Driver: ${bus.driver.first_name} ${bus.driver.last_name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Select */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Booking Option
              </label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBookingMode('specific_seats')}
                  className={`flex items-center justify-center gap-2 rounded-2xl p-3 text-xs font-black transition-all border ${
                    bookingMode === 'specific_seats'
                      ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  <LuUserCheck className="h-4 w-4" /> Specific Seats
                </button>
                <button
                  type="button"
                  onClick={() => setBookingMode('entire_vehicle')}
                  className={`flex items-center justify-center gap-2 rounded-2xl p-3 text-xs font-black transition-all border ${
                    bookingMode === 'entire_vehicle'
                      ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm dark:bg-amber-950/50 dark:text-amber-300'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  <LuBus className="h-4 w-4" /> Entire Vehicle
                </button>
              </div>
            </div>
          </div>

          {/* Availability Alert Banner */}
          {isWholeVehicleBooked && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              <LuCircleAlert className="h-5 w-5 shrink-0 text-rose-600" />
              <span>
                This vehicle is already fully chartered or booked for the selected travel window ({startDate}). Please choose another bus or adjust your travel dates.
              </span>
            </div>
          )}

          {/* Interactive Seat Map View */}
          <div className="mt-4 min-h-[320px] rounded-3xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
            {isLoading ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-gray-400">
                <LuLoaderCircle className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                <span className="text-xs font-bold">Checking real-time seat availability...</span>
              </div>
            ) : bookingMode === 'entire_vehicle' ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center p-6 space-y-3 bg-amber-500/5 rounded-3xl border border-amber-200 dark:border-amber-800/40">
                <LuBus className="h-12 w-12 text-amber-500" />
                <h4 className="text-base font-black text-amber-900 dark:text-amber-300">Entire Vehicle Charter Selected</h4>
                <p className="max-w-md text-xs font-semibold text-amber-700 dark:text-amber-400">
                  All {seatingCapacity} seats on bus {activeBus?.plate_number} will be exclusively reserved for your party. No other seats will be available to public joiners.
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between px-2">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                    Selected Seats ({selectedSeats.length}): {selectedSeats.join(', ') || 'None'}
                  </span>
                  <span className="text-xs font-bold text-blue-600">
                    Occupied: {occupiedSeats.length} / {seatingCapacity}
                  </span>
                </div>
                <BusLayout
                  totalSeats={seatingCapacity}
                  selectedSeats={selectedSeats}
                  occupiedSeats={occupiedSeats}
                  onSeatToggle={handleSeatToggle}
                  compact={false}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
          <div className="text-xs font-bold text-gray-500">
            {bookingMode === 'entire_vehicle'
              ? `Whole Vehicle Charter (${seatingCapacity} Pax Capacity)`
              : `${selectedSeats.length} seat(s) selected`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isWholeVehicleBooked}
              className={`inline-flex items-center gap-2 rounded-2xl px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all ${
                isWholeVehicleBooked
                  ? 'bg-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
              }`}
            >
              <LuCheck className="h-4 w-4" /> Confirm & Proceed
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
