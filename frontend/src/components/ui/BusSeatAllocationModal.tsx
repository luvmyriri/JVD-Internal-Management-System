import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  LuBus, 
  LuPlus, 
  LuTrash2, 
  LuUserCheck,
  LuCircleAlert,
} from 'react-icons/lu';
import { Modal, Button } from './index';
import BusLayout from './BusLayout';
import { fleetApi } from '../../api/fleet';
import { educationalTourApi } from '../../api/educationalTours';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

export interface PassengerItem {
  id?: string | number;
  first_name: string;
  last_name: string;
  role?: string;
  seat_code?: string;
  bus_index?: number;
  date_of_birth?: string;
}

export interface AllocatedBus {
  bus_id: number;
  bus_name: string;
  plate_number: string;
  capacity: number;
  driver_id?: number;
  driver_name?: string;
  seat_assignments: Record<string, PassengerItem>; // seatCode -> PassengerItem
}

export interface DriverItem {
  id: number;
  first_name: string;
  last_name: string;
  available?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requiredCapacity?: number;
  passengers?: PassengerItem[];
  initialAllocations?: AllocatedBus[];
  availableDrivers?: DriverItem[];
  onSaveAllocations: (allocations: AllocatedBus[]) => void;
}

export default function BusSeatAllocationModal({
  isOpen,
  onClose,
  requiredCapacity = 49,
  passengers = [],
  initialAllocations = [],
  availableDrivers = [],
  onSaveAllocations,
}: Props) {
  const { theme } = useTheme();

  // Fetch real fleet buses from API
  const { data: busesResponse } = useQuery({
    queryKey: ['fleet-buses-modal'],
    queryFn: () => fleetApi.list({ per_page: 100 }).then(r => r.data),
    enabled: isOpen,
  });

  // Fetch drivers from API if not provided
  const { data: driversResponse } = useQuery({
    queryKey: ['fleet-drivers-modal'],
    queryFn: () => educationalTourApi.resources(new Date().toISOString().slice(0, 10), new Date().toISOString().slice(0, 10)),
    enabled: isOpen && availableDrivers.length === 0,
  });

  const fleetBuses = useMemo(() => {
    const raw = (busesResponse as any)?.data ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [busesResponse]);

  const driversList = useMemo<DriverItem[]>(() => {
    if (availableDrivers && availableDrivers.length > 0) return availableDrivers;
    if (driversResponse?.drivers && driversResponse.drivers.length > 0) return driversResponse.drivers;
    return [];
  }, [availableDrivers, driversResponse]);

  const [allocations, setAllocations] = useState<AllocatedBus[]>([]);
  const [activeBusIdx, setActiveBusIdx] = useState<number>(0);
  const [selectedPassenger, setSelectedPassenger] = useState<PassengerItem | null>(null);

  // Initialize allocations when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialAllocations.length > 0) {
        setAllocations(initialAllocations);
      } else {
        const neededBusCount = Math.max(1, Math.ceil(requiredCapacity / 49));
        const newAllocations: AllocatedBus[] = [];

        for (let i = 0; i < neededBusCount; i++) {
          const fleet = fleetBuses[i % (fleetBuses.length || 1)];
          const driver = driversList[i % (driversList.length || 1)];
          if (fleet) {
            newAllocations.push({
              bus_id: fleet.id,
              bus_name: `${fleet.model || 'Tourist Bus'} (${fleet.seating_capacity || 49} Seater)`,
              plate_number: fleet.plate_number,
              capacity: fleet.seating_capacity || 49,
              driver_id: fleet.assigned_driver || driver?.id || undefined,
              driver_name: fleet.driver
                ? `${fleet.driver.first_name} ${fleet.driver.last_name}`
                : driver
                ? `${driver.first_name} ${driver.last_name}`
                : undefined,
              seat_assignments: {},
            });
          } else {
            newAllocations.push({
              bus_id: Date.now() + i,
              bus_name: `49-Seater Tourist Bus #${i + 1}`,
              plate_number: `JVD-BUS-${i + 1}`,
              capacity: 49,
              driver_id: driver?.id || undefined,
              driver_name: driver ? `${driver.first_name} ${driver.last_name}` : undefined,
              seat_assignments: {},
            });
          }
        }
        setAllocations(newAllocations);
      }
      setActiveBusIdx(0);
      setSelectedPassenger(passengers[0] ?? null);
    }
  }, [isOpen, initialAllocations, fleetBuses, driversList, requiredCapacity, passengers]);

  const activeBus = allocations[activeBusIdx] ?? null;

  const handleChangeDriver = (driverId: number) => {
    if (!activeBus) return;
    const selectedDriver = driversList.find((d) => d.id === driverId);
    const updated = [...allocations];
    updated[activeBusIdx] = {
      ...updated[activeBusIdx],
      driver_id: driverId || undefined,
      driver_name: selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : undefined,
    };
    setAllocations(updated);
  };

  // Add a new bus slot
  const handleAddBus = () => {
    const nextIdx = allocations.length;
    const availableFleet = fleetBuses.find(b => !allocations.some(a => a.bus_id === b.id)) ?? fleetBuses[nextIdx % fleetBuses.length];
    
    const newBus: AllocatedBus = availableFleet ? {
      bus_id: availableFleet.id,
      bus_name: `${availableFleet.model || 'Tourist Bus'} (${availableFleet.seating_capacity || 45} Seater)`,
      plate_number: availableFleet.plate_number,
      capacity: availableFleet.seating_capacity || 45,
      driver_id: availableFleet.assigned_driver || undefined,
      driver_name: availableFleet.driver ? `${availableFleet.driver.first_name} ${availableFleet.driver.last_name}` : undefined,
      seat_assignments: {},
    } : {
      bus_id: Date.now(),
      bus_name: `Additional Bus #${nextIdx + 1} (45 Seater)`,
      plate_number: `JVD-BUS-${nextIdx + 1}`,
      capacity: 45,
      seat_assignments: {},
    };

    setAllocations([...allocations, newBus]);
    setActiveBusIdx(nextIdx);
    toast.success(`Bus #${nextIdx + 1} added to allocation`);
  };

  // Remove a bus slot
  const handleRemoveBus = (idx: number) => {
    if (allocations.length <= 1) {
      toast.error('At least one bus allocation is required.');
      return;
    }
    const updated = allocations.filter((_, i) => i !== idx);
    setAllocations(updated);
    setActiveBusIdx(Math.max(0, idx - 1));
  };

  // Change bus model for active slot
  const handleChangeFleetBus = (busId: number) => {
    const selected = fleetBuses.find(b => b.id === busId);
    if (!selected || !activeBus) return;

    const updated = [...allocations];
    updated[activeBusIdx] = {
      ...updated[activeBusIdx],
      bus_id: selected.id,
      bus_name: `${selected.model || 'Tourist Bus'} (${selected.seating_capacity || 45} Seater)`,
      plate_number: selected.plate_number,
      capacity: selected.seating_capacity || 45,
      driver_id: selected.assigned_driver || undefined,
      driver_name: selected.driver ? `${selected.driver.first_name} ${selected.driver.last_name}` : undefined,
    };
    setAllocations(updated);
  };

  // Assign or unassign seat to selected passenger
  const handleToggleSeat = (seatCode: string) => {
    if (!activeBus) return;

    const currentAssignments = { ...activeBus.seat_assignments };

    // If seat already assigned, unassign it
    if (currentAssignments[seatCode]) {
      delete currentAssignments[seatCode];
      const updated = [...allocations];
      updated[activeBusIdx].seat_assignments = currentAssignments;
      setAllocations(updated);
      return;
    }

    // If a passenger is selected, assign seat to passenger
    if (selectedPassenger) {
      // Remove passenger from any other seat in active bus
      Object.keys(currentAssignments).forEach(k => {
        if (
          currentAssignments[k].first_name === selectedPassenger.first_name &&
          currentAssignments[k].last_name === selectedPassenger.last_name
        ) {
          delete currentAssignments[k];
        }
      });

      currentAssignments[seatCode] = {
        ...selectedPassenger,
        seat_code: seatCode,
        bus_index: activeBusIdx,
      };

      const updated = [...allocations];
      updated[activeBusIdx].seat_assignments = currentAssignments;
      setAllocations(updated);

      // Auto advance to next unassigned passenger if any
      const assignedNames = new Set(Object.values(currentAssignments).map(p => `${p.first_name} ${p.last_name}`));
      const nextUnassigned = passengers.find(p => !assignedNames.has(`${p.first_name} ${p.last_name}`));
      if (nextUnassigned) {
        setSelectedPassenger(nextUnassigned);
      }
    } else {
      // Generic seat reservation
      currentAssignments[seatCode] = {
        first_name: 'Reserved',
        last_name: `Seat ${seatCode}`,
        seat_code: seatCode,
        bus_index: activeBusIdx,
      };

      const updated = [...allocations];
      updated[activeBusIdx].seat_assignments = currentAssignments;
      setAllocations(updated);
    }
  };


  const totalAssignedSeats = useMemo(() => {
    return allocations.reduce((sum, b) => sum + Object.keys(b.seat_assignments).length, 0);
  }, [allocations]);

  const totalAllocatedCapacity = useMemo(() => {
    return allocations.reduce((sum, b) => sum + (b.capacity || 49), 0);
  }, [allocations]);

  const handleSave = () => {
    onSaveAllocations(allocations);
    toast.success(`Allocated ${allocations.length} bus(es) with ${totalAssignedSeats} seat reservation(s)`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Multi-Bus Allocation & Interactive Seat Selector"
      size="xl"
    >
      <div className="space-y-6 p-1">
        {/* Top Capacity Banner */}
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-blue-50/60 border-blue-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <LuBus size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                Group Fleet Allocation ({allocations.length} Bus{allocations.length !== 1 ? 'es' : ''})
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Total Allocated Capacity: <strong className="text-blue-600 dark:text-blue-400">{totalAllocatedCapacity} Seats</strong> · Target Group Size: <strong>{requiredCapacity} Passengers</strong>
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddBus}
            className="flex items-center gap-1.5 text-xs shrink-0"
          >
            <LuPlus size={14} /> Add Additional Bus
          </Button>
        </div>

        {/* Bus Tabs Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100 dark:border-gray-800 custom-scrollbar">
          {allocations.map((bus, idx) => {
            const assignedCount = Object.keys(bus.seat_assignments).length;
            const isActive = idx === activeBusIdx;
            return (
              <div
                key={idx}
                onClick={() => setActiveBusIdx(idx)}
                className={`group cursor-pointer px-4 py-2.5 rounded-xl border flex items-center gap-3 transition-all shrink-0 ${
                  isActive
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <LuBus size={16} />
                  <div>
                    <p className="text-xs font-bold leading-tight">Bus #{idx + 1}: {bus.plate_number}</p>
                    <p className={`text-[9.5px] font-medium ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                      {assignedCount} / {bus.capacity} seats reserved
                    </p>
                  </div>
                </div>

                {allocations.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveBus(idx); }}
                    className={`p-1 rounded-lg hover:bg-red-500/20 opacity-60 hover:opacity-100 transition-all ${
                      isActive ? 'text-white' : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <LuTrash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {activeBus && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Bus Info & Passenger Roster Selector (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Fleet Bus Picker */}
              <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                  Assigned Fleet Bus & Driver
                </label>
                <select
                  value={activeBus.bus_id}
                  onChange={(e) => handleChangeFleetBus(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                  }`}
                >
                  {fleetBuses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.plate_number} — {b.model || 'Tourist Bus'} ({b.seating_capacity || 45} Pax)
                    </option>
                  ))}
                </select>

                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mt-3 mb-1.5">
                  Assigned Bus Driver
                </label>
                <select
                  value={activeBus.driver_id || ''}
                  onChange={(e) => handleChangeDriver(Number(e.target.value))}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                  }`}
                >
                  <option value="">-- Select Driver --</option>
                  {driversList.map((d) => (
                    <option key={d.id} value={d.id}>
                      Driver: {d.first_name} {d.last_name} {d.available === false ? '(Busy)' : ''}
                    </option>
                  ))}
                </select>

                {activeBus.driver_name ? (
                  <div className="mt-3 flex items-center justify-between text-xs p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <LuUserCheck size={14} /> Assigned Driver: {activeBus.driver_name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">Assigned</span>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between text-xs p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <LuCircleAlert size={14} /> Driver Not Assigned
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded">Action Required</span>
                  </div>
                )}
              </div>

              {/* Passenger Roster List for Seat Binding */}
              {passengers.length > 0 && (
                <div className={`p-4 rounded-2xl border space-y-3 ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Passenger Manifest ({passengers.length})
                    </span>
                    <span className="text-[10px] text-gray-400">Click a name, then pick a seat</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {passengers.map((p, pIdx) => {
                      const fullName = `${p.first_name} ${p.last_name}`;
                      const isSelected = selectedPassenger && `${selectedPassenger.first_name} ${selectedPassenger.last_name}` === fullName;

                      // Check if already assigned a seat in active bus
                      const assignedSeatCode = Object.keys(activeBus.seat_assignments).find(
                        k => activeBus.seat_assignments[k].first_name === p.first_name && activeBus.seat_assignments[k].last_name === p.last_name
                      );

                      return (
                        <div
                          key={pIdx}
                          onClick={() => setSelectedPassenger(p)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                              : assignedSeatCode
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-gray-700 dark:text-gray-300'
                              : 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}>
                              {p.first_name[0]}{p.last_name[0]}
                            </div>
                            <div>
                              <p className="text-xs font-bold leading-tight">{fullName}</p>
                              {p.role && <p className="text-[9px] text-gray-400 uppercase">{p.role} {p.date_of_birth ? `· DOB: ${p.date_of_birth}` : ''}</p>}
                            </div>
                          </div>

                          {assignedSeatCode ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                              Seat {assignedSeatCode}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Unassigned</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive 49-Seater Bus Seat Blueprint (7 cols) */}
            <div className="lg:col-span-7">
              <div className={`p-5 rounded-3xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                {/* Bus Cabin Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-500">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider">
                    <LuBus size={18} /> Bus #{activeBusIdx + 1} Blueprint ({activeBus.capacity || 49} Seats)
                  </div>
                  <span className="text-[11px] font-bold text-gray-400">
                    {Object.keys(activeBus.seat_assignments).length} seat(s) reserved
                  </span>
                </div>

                {/* Unified Bus Layout Component */}
                <div className="overflow-x-auto p-2">
                  <BusLayout
                    totalSeats={activeBus.capacity || 49}
                    hasRestroom={false}
                    selectedSeats={Object.keys(activeBus.seat_assignments)}
                    occupiedSeats={[]}
                    onSeatToggle={(seatNumber) => handleToggleSeat(seatNumber)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="text-xs text-gray-500 font-medium">
            Total Allocated: <strong className="text-gray-900 dark:text-white">{totalAssignedSeats} / {totalAllocatedCapacity} Seats</strong>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} className="px-6">
              Confirm & Save Allocations
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
