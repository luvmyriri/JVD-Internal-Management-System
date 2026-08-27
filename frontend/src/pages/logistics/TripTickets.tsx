import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { tripTicketApi } from '../../api/operations';
import { formatMoneyInput, parseMoneyInput } from '../../utils';

import type { TripTicket } from '../../types';
import { Modal, Button } from '../../components/ui';
import { DataTable, TimeframeFilter, type Column, type DateRangeValue } from '../../components/ds';
import { useBuses } from '../../hooks/useFleet';
import { useUsers } from '../../hooks/useUsers';
import TripLocationMapPicker from '../../components/travel/TripLocationMapPicker';
import { printTripTicket } from './printTripTicket';

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function TripTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  const isIntl = type === 'international';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
      isIntl
        ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900/40'
        : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-900/40'
    }`}>
      {isIntl ? 'International' : 'Domestic'}
    </span>
  );
}



import TripDrawer from '../../components/drawers/TripDrawer';

function TripTicketFormModal({ ticket, onClose }: { ticket?: TripTicket; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: busesData } = useBuses({ per_page: 999 });
  const { data: driversData } = useUsers({ role: 'driver', per_page: 999 });

  const buses = busesData?.data || [];
  const drivers = driversData?.data || [];
  const isSalesSynchronized = Boolean(ticket?.sales_order_item);
  const canReassignFromDtt = ['private_tour', 'transfer_service'].includes(ticket?.sales_order_item?.service_type || '');

  const [form, setForm] = useState({
    control_no: ticket?.control_no || '',
    issue_date: ticket?.issue_date ? ticket.issue_date.split('T')[0] : new Date().toISOString().split('T')[0],
    date_of_travel: ticket?.date_of_travel ? ticket.date_of_travel.split('T')[0] : new Date().toISOString().split('T')[0],
    duration: ticket?.duration || '',
    pick_up: ticket?.pick_up || '',
    drop_off: ticket?.drop_off || '',
    bus_id: ticket?.bus_id || '' as string | number,
    plate_no: ticket?.plate_no || '',
    no_of_passengers: (ticket?.no_of_passengers || 1).toString(),
    driver_id: ticket?.driver_id || '' as string | number,
    meal_allowance: formatMoneyInput(String(ticket?.meal_allowance || 0)),
    diesel: formatMoneyInput(String(ticket?.diesel || 0)),
    sop: formatMoneyInput(String(ticket?.sop || 0)),
    easy_trip: formatMoneyInput(String(ticket?.easy_trip || 0)),
    autosweep: formatMoneyInput(String(ticket?.autosweep || 0)),
    passenger_name: ticket?.passenger_name || '',
    trip_type: (ticket as any)?.trip_type || 'domestic' as 'domestic' | 'international',
    odometer_reading: (ticket as any)?.odometer_reading?.toString() || '',
  });

  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isCheckingConflict, setIsCheckingConflict] = useState<boolean>(false);
  const [overrideConflict, setOverrideConflict] = useState<boolean>(false);

  // Automated background calculation of distance, fuel (DOE rates) & tolls based on pickup/dropoff route
  useEffect(() => {
    if (isSalesSynchronized) return;
    if (!form.pick_up && !form.drop_off) return;
    const routeStr = `${form.pick_up} ${form.drop_off}`.toLowerCase();
    let estKm = 120;
    if (routeStr.includes('baguio') || routeStr.includes('ilocos') || routeStr.includes('bicol')) estKm = 320;
    else if (routeStr.includes('subic') || routeStr.includes('clark') || routeStr.includes('batangas') || routeStr.includes('la union')) estKm = 180;
    else if (routeStr.includes('tagaytay') || routeStr.includes('laguna') || routeStr.includes('cavite')) estKm = 90;

    const fuelLiters = estKm / 5.5;
    const doeFuelRate = 68.50;
    const estDieselCost = Math.round(fuelLiters * doeFuelRate);

    const estEasyTrip = routeStr.includes('nlex') || routeStr.includes('sctex') || routeStr.includes('subic') || routeStr.includes('baguio') ? 450 : 200;
    const estAutosweep = routeStr.includes('slex') || routeStr.includes('skyway') || routeStr.includes('calax') || routeStr.includes('batangas') || routeStr.includes('tagaytay') ? 520 : 250;

    setForm(prev => ({
      ...prev,
      diesel: prev.diesel === '0' || !prev.diesel ? formatMoneyInput(String(estDieselCost)) : prev.diesel,
      easy_trip: prev.easy_trip === '0' || !prev.easy_trip ? formatMoneyInput(String(estEasyTrip)) : prev.easy_trip,
      autosweep: prev.autosweep === '0' || !prev.autosweep ? formatMoneyInput(String(estAutosweep)) : prev.autosweep,
      odometer_reading: prev.odometer_reading === '0' || !prev.odometer_reading ? String(estKm) : prev.odometer_reading,
    }));
  }, [form.pick_up, form.drop_off, isSalesSynchronized]);

  useEffect(() => {
    let active = true;
    if (!form.date_of_travel) {
      setConflicts([]);
      setOverrideConflict(false);
      return;
    }

    const check = async () => {
      setIsCheckingConflict(true);
      try {
        const driverVal = form.driver_id ? Number(form.driver_id) : null;
        const busVal = form.bus_id ? Number(form.bus_id) : null;

        if (!driverVal && !busVal) {
          setConflicts([]);
          setOverrideConflict(false);
          setIsCheckingConflict(false);
          return;
        }

        setOverrideConflict(false);

        const res = await tripTicketApi.checkConflict({
          date_of_travel: form.date_of_travel,
          duration: form.duration || null,
          driver_id: driverVal,
          bus_id: busVal,
          exclude_id: ticket?.id || null,
        });

        if (active) {
          setConflicts(res.conflicts || []);
        }
      } catch (err) {
        console.error('Error checking scheduling conflict:', err);
      } finally {
        if (active) {
          setIsCheckingConflict(false);
        }
      }
    };

    const timer = setTimeout(check, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.date_of_travel, form.duration, form.driver_id, form.bus_id, ticket?.id]);

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (ticket) {
        return tripTicketApi.update(ticket.id, { ...data, status: 'approved' });
      }
      return tripTicketApi.create(data);
    },
    onSuccess: () => {
      toast.success(ticket ? 'Trip Ticket approved successfully' : 'Trip Ticket created successfully');
      qc.invalidateQueries({ queryKey: ['trip-tickets'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Failed to ${ticket ? 'approve' : 'create'} trip ticket`);
    },
  });

  const canOverride = user?.role === 'super_admin' || user?.role === 'executive_vice_president' || user?.role === 'operations_manager' || user?.tags?.includes('process:override_schedule');
  const isSubmitDisabled = mutation.isPending || isCheckingConflict || (conflicts.length > 0 && (!canOverride || !overrideConflict));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare payload, casting optional and required numeric values
    const payload = {
      ...form,
      bus_id: form.bus_id ? Number(form.bus_id) : null,
      driver_id: form.driver_id ? Number(form.driver_id) : null,
      no_of_passengers: Number(form.no_of_passengers),
      meal_allowance: Number(parseMoneyInput(String(form.meal_allowance || 0))),
      diesel: Number(parseMoneyInput(String(form.diesel || 0))),
      sop: Number(parseMoneyInput(String(form.sop || 0))),
      easy_trip: Number(parseMoneyInput(String(form.easy_trip || 0))),
      autosweep: Number(parseMoneyInput(String(form.autosweep || 0))),
    };

    // If bus is selected, sync plate_no with that bus's plate_number for safety
    if (payload.bus_id) {
      const selectedBus = buses.find(b => b.id === payload.bus_id);
      if (selectedBus) {
        payload.plate_no = selectedBus.plate_number;
      }
    }

    mutation.mutate(payload);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={ticket ? (ticket.status === 'draft' ? "Customize & Approve Trip Ticket" : "Edit Customized DTT") : "New Trip Ticket"} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 p-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
        {ticket?.sales_order_item && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
            <p className="font-black">Sales-synchronized trip</p>
            <p className="mt-1 text-xs leading-5 opacity-80">
              Schedule, route, passengers, and original dispatch assignments came from {ticket.sales_order_item.title}. Update booking facts in Sales; continue here with allowances, pre-trip approval, and completion.
              {canReassignFromDtt ? ' Vehicle and driver reassignment remains available for this service.' : ''}
            </p>
          </div>
        )}

        {/* Section 1: Document Details */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30" open>
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span>Document Details</span>
          </summary>
          <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Control Number</label>
                <input
                  type="text"
                  readOnly
                  value={form.control_no || 'Auto-generated'}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  placeholder="Auto-generated"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Issue Date</label>
                <input
                  type="date"
                  required
                  value={form.issue_date}
                  onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date of Travel</label>
                <input
                  type="date"
                  required
                  disabled={isSalesSynchronized}
                  value={form.date_of_travel}
                  onChange={e => setForm(p => ({ ...p, date_of_travel: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {/* Trip Type */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Trip Type</label>
              <div className="flex gap-3">
                {(['domestic', 'international'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    disabled={isSalesSynchronized}
                    onClick={() => setForm(p => ({ ...p, trip_type: t }))}
                    className={`flex-1 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest border-2 transition-all ${
                      form.trip_type === t
                        ? t === 'international'
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'bg-teal-600 border-teal-600 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {t === 'international' ? 'International' : 'Domestic'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </details>

        {/* Section 2: Route & Passenger Details */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30" open>
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span>Route & Passenger Details</span>
          </summary>
          <div className="p-4 pt-0 space-y-4">
            {/* Interactive Location Map Pinning & Fuel Auto-Calculator */}
            {!isSalesSynchronized && (
              <TripLocationMapPicker
                pickupLocation={form.pick_up || 'JVD Terminal, Manila'}
                dropOffLocation={form.drop_off || 'Tagaytay City'}
                vehicleType={(buses.find(b => String(b.id) === String(form.bus_id)) as any)?.vehicle_type || 'Bus'}
                onLocationSelect={(pickup, dropoff, _distance, _liters, cost) => {
                  setForm(p => ({
                    ...p,
                    pick_up: pickup,
                    drop_off: dropoff,
                    diesel: formatMoneyInput(String(cost)),
                  }));
                  toast.success('Route pinned and diesel cost auto-calculated!');
                }}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pick Up Location</label>
                <input
                  type="text"
                  required
                  readOnly={isSalesSynchronized}
                  value={form.pick_up}
                  onChange={e => setForm(p => ({ ...p, pick_up: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. JVD Terminal, Cubao"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Drop Off Location</label>
                <input
                  type="text"
                  required
                  readOnly={isSalesSynchronized}
                  value={form.drop_off}
                  onChange={e => setForm(p => ({ ...p, drop_off: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Baguio City Terminal"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">No. of Passengers</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  readOnly={isSalesSynchronized}
                  value={form.no_of_passengers}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setForm(p => ({ ...p, no_of_passengers: val }));
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Passenger / Group Name</label>
                <input
                  type="text"
                  readOnly={isSalesSynchronized}
                  value={form.passenger_name}
                  onChange={e => setForm(p => ({ ...p, passenger_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Lakbay Aral Tour Group"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Duration / Notes</label>
                <input
                  type="text"
                  readOnly={isSalesSynchronized}
                  value={form.duration}
                  onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 3 Days Roundtrip"
                />
              </div>
            </div>
          </div>
        </details>

        {/* Section 3: Bus & Crew Assignment */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span>Bus & Crew Assignment</span>
          </summary>
          <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Driver</label>
                <select
                  disabled={isSalesSynchronized && !canReassignFromDtt}
                  value={form.driver_id}
                  onChange={e => setForm(p => ({ ...p, driver_id: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-transparent"
                >
                  <option value="">Select a Driver (TBA)</option>
                  {drivers.map((driver: any) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Vehicle (Fleet)</label>
                <select
                  disabled={isSalesSynchronized && !canReassignFromDtt}
                  value={form.bus_id}
                  onChange={e => setForm(p => ({ ...p, bus_id: e.target.value, plate_no: '' }))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-transparent"
                >
                  <option value="">Select a Fleet Bus (or type manual)</option>
                  {buses.map((bus: any) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.plate_number} ({bus.model || 'Bus'}) {bus.bus_category ? `• ${bus.bus_category}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Plate Number (Manual Override)</label>
                <input
                  type="text"
                  disabled={!!form.bus_id || (isSalesSynchronized && !canReassignFromDtt)}
                  value={form.bus_id ? buses.find((b: any) => b.id === Number(form.bus_id))?.plate_number || '' : form.plate_no}
                  onChange={e => setForm(p => ({ ...p, plate_no: e.target.value }))}
                  placeholder={form.bus_id ? "Auto-synced with fleet" : "e.g. NDG-5818"}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-800"
                />
              </div>
            </div>
            {conflicts.length > 0 && (() => {
              const canOverride = user?.role === 'super_admin' || user?.role === 'executive_vice_president' || user?.role === 'operations_manager' || user?.tags?.includes('process:override_schedule');
              return (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
                    <span className="text-base">⚠️</span>
                    <span className="text-xs font-black uppercase tracking-widest">Schedule Conflict Detected</span>
                  </div>
                  <div className="space-y-1">
                    {conflicts.map((c, i) => (
                      <p key={i} className="text-xs text-red-700 dark:text-red-400 font-semibold leading-relaxed">
                        {c.message}
                      </p>
                    ))}
                  </div>
                  {canOverride ? (
                    <label className="flex items-center gap-2 mt-3 p-2 bg-white/50 dark:bg-black/10 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overrideConflict}
                        onChange={(e) => setOverrideConflict(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-red-800 dark:text-red-300">
                        Override schedule conflict (Administrator bypass)
                      </span>
                    </label>
                  ) : (
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-wider mt-2">
                      Submission blocked. Only administrators can override scheduling conflicts.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </details>

        {/* Section 4: Operational Allowances */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span>Operational Allowances (₱)</span>
          </summary>
          <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Meal</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.meal_allowance}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setForm(p => ({ ...p, meal_allowance: formatted }));
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SOP</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.sop}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setForm(p => ({ ...p, sop: formatted }));
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">EasyTrip</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.easy_trip}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setForm(p => ({ ...p, easy_trip: formatted }));
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">AutoSweep</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.autosweep}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setForm(p => ({ ...p, autosweep: formatted }));
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </details>

        {ticket && (
          <div className="mx-2 mb-2 px-5 py-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl">
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Auto-Budget Notice</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Upon approval, a <strong>Cash Budget Request</strong> will be automatically created in the Operations module based on the allowances entered above.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {ticket ? "Approve & Send to Cash Budgets" : "Create Ticket"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function TripTickets() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [tripTypeFilter, setTripTypeFilter] = useState<'all' | 'domestic' | 'international'>('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: '', to: '' });
  const [selectedTicket, setSelectedTicket] = useState<TripTicket | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TripTicket | null>(null);

  const { data: response, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['trip-tickets'],
    queryFn: () => tripTicketApi.getAll(),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const tickets: TripTicket[] = Array.isArray(response) ? response : (response as any)?.data || [];

  const filtered = tickets.filter((t) => {
    const matchSearch =
      t.control_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.pick_up?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.drop_off?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tour_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tour_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.invoice?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.invoice?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.sales_order_item?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = tripTypeFilter === 'all' || (t as any).trip_type === tripTypeFilter;
    const travel = (t.date_of_travel ?? '').slice(0, 10);
    const matchDate = (!dateRange.from || travel >= dateRange.from) && (!dateRange.to || travel <= dateRange.to);
    return matchSearch && matchType && matchDate;
  });

  const columns: Column<TripTicket>[] = [
    {
      key: 'control_no',
      header: 'Control No.',
      render: (ticket) => (
        <span className="font-bold text-gray-900 dark:text-white">{ticket.control_no}</span>
      ),
    },
    {
      key: 'date_of_travel',
      header: 'Travel Date',
      render: (ticket) => (
        <span className="text-gray-600 dark:text-gray-300">{ticket.date_of_travel}</span>
      ),
    },
    {
      key: 'origin',
      header: 'Origin',
      render: (ticket) => ticket.educational_tour_package_id ? (
        <div>
          <div className="font-bold text-blue-700 dark:text-blue-300">Educational Tour</div>
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">{ticket.tour_name}</div>
          <div className="text-xs text-gray-400">{ticket.tour_code}</div>
        </div>
      ) : ticket.sales_order_item ? (
        <div>
          <div className="font-bold text-blue-700 dark:text-blue-300">Sales handoff</div>
          <div className="text-xs text-gray-500">{ticket.invoice?.invoice_number || ticket.sales_order_item.order?.order_number}</div>
          <div className="max-w-48 truncate text-xs text-gray-400">{ticket.sales_order_item.title}</div>
        </div>
      ) : (
        <span className="text-xs font-semibold text-gray-500">Manual dispatch</span>
      ),
    },
    {
      key: 'route',
      header: 'Route',
      render: (ticket) => (
        <>
          <div className="text-gray-900 dark:text-gray-300 font-medium">{ticket.pick_up}</div>
          <div className="text-gray-500 text-xs">to {ticket.drop_off}</div>
        </>
      ),
    },
    {
      key: 'bus_driver',
      header: 'Bus/Driver',
      render: (ticket) => (
        <div className="text-gray-600 dark:text-gray-300">
          <div>{ticket.bus?.plate_number || ticket.plate_no || 'TBA'}</div>
          <div className="text-xs text-gray-500">{ticket.driver?.name || 'TBA'}</div>
        </div>
      ),
    },
    {
      key: 'trip_type',
      header: 'Trip Type',
      render: (ticket) => <TripTypeBadge type={(ticket as any).trip_type} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (ticket) => <StatusBadge status={ticket.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (ticket) => (
        <button onClick={() => setSelectedTicket(ticket)} className="px-3.5 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all cursor-pointer">
          Details
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4 md:space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div>
          <div className="flex items-center gap-3 text-sm font-bold text-blue-600 dark:text-blue-500 mb-2 uppercase tracking-widest">
            Logistics Module
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Trip Tickets</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <div className="relative group w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search route or control no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-5 py-3 w-full sm:w-64 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>
          {/* Trip Type Filter */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
            {(['all', 'domestic', 'international'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => setTripTypeFilter(t)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  tripTypeFilter === t
                    ? t === 'international'
                      ? 'bg-violet-600 text-white'
                      : t === 'domestic'
                        ? 'bg-teal-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-white shadow'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'
                }`}>
                {t === 'international' ? 'International' : t === 'domestic' ? 'Domestic' : 'All'}
              </button>
            ))}
          </div>
          <TimeframeFilter value={dateRange} onChange={setDateRange} />
          {user?.role !== 'driver' && (
            <button onClick={() => setShowCreate(true)} className="flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer">
              + New Trip Ticket
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm relative">
        {isPlaceholderData && (
          <div className="absolute top-0 left-0 w-full h-1 z-10 overflow-hidden bg-blue-100/50 dark:bg-blue-950/50">
            <div className="h-full bg-blue-600 dark:bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out] w-1/2 rounded-full" />
          </div>
        )}
        <DataTable
          columns={columns}
          data={isLoading ? [] : filtered}
          rowKey={(ticket) => ticket.id}
          empty={
            isLoading ? (
              <div className="px-8 py-12 text-center text-gray-500">Loading trip tickets...</div>
            ) : (
              <div className="px-8 py-12 text-center text-gray-500">No trip tickets found.</div>
            )
          }
          className="border-0 rounded-none bg-transparent"
        />
      </div>

      {selectedTicket && (
        <TripDrawer
          ticket={selectedTicket}
          isOpen={true}
          onClose={() => setSelectedTicket(null)}
          onCustomizeApprove={setEditingTicket}
          onPrint={printTripTicket}
        />
      )}

      {showCreate && (
        <TripTicketFormModal onClose={() => setShowCreate(false)} />
      )}

      {editingTicket && (
        <TripTicketFormModal ticket={editingTicket} onClose={() => setEditingTicket(null)} />
      )}
    </div>
  );
}
