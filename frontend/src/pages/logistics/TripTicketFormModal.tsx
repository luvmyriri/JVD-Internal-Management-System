import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Route, BusFront, AlertCircle } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { tripTicketApi } from '../../api/operations';
import { formatMoneyInput, parseMoneyInput } from '../../utils';
import type { TripTicket } from '../../types';
import { Modal, Button } from '../../components/ui';
import { useBuses } from '../../hooks/useFleet';
import { useUsers } from '../../hooks/useUsers';
import TripLocationMapPicker from '../../components/travel/TripLocationMapPicker';

export interface TripTicketFormModalProps {
  ticket?: TripTicket;
  onClose: () => void;
  onSaved?: (ticket: TripTicket) => void;
}

export function TripTicketFormModal({ ticket, onClose, onSaved }: TripTicketFormModalProps) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: busesData } = useBuses({ per_page: 999 });
  const { data: driversData } = useUsers({ role: 'driver', per_page: 999 });

  const buses = busesData?.data || [];
  const drivers = driversData?.data || [];
  const isSalesSynchronized = Boolean(ticket?.sales_order_item);
  const canEditSalesFacts = !isSalesSynchronized || ['bus_rental', 'charter', 'private_tour', 'transfer_service'].includes(ticket?.sales_order_item?.service_type || '');

  const [form, setForm] = useState({
    control_no: ticket?.control_no || '',
    issue_date: ticket?.issue_date ? ticket.issue_date.split('T')[0] : new Date().toISOString().split('T')[0],
    date_of_travel: ticket?.date_of_travel ? ticket.date_of_travel.split('T')[0] : new Date().toISOString().split('T')[0],
    duration: ticket?.duration || '',
    pick_up: ticket?.pick_up || '',
    drop_off: ticket?.drop_off || ticket?.destination || '',
    bus_id: (ticket?.bus_id || '') as string | number,
    plate_no: ticket?.plate_no || '',
    no_of_passengers: (ticket?.no_of_passengers || 1).toString(),
    driver_id: (ticket?.driver_id || '') as string | number,
    meal_allowance: formatMoneyInput(String(ticket?.meal_allowance || 0)),
    diesel: formatMoneyInput(String(ticket?.diesel || 0)),
    sop: formatMoneyInput(String(ticket?.sop || 0)),
    easy_trip: formatMoneyInput(String(ticket?.easy_trip || 0)),
    autosweep: formatMoneyInput(String(ticket?.autosweep || 0)),
    passenger_name: ticket?.passenger_name || '',
    trip_type: ((ticket as any)?.trip_type || 'domestic') as 'domestic' | 'international',
    odometer_reading: (ticket as any)?.odometer_reading?.toString() || '',
  });

  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isCheckingConflict, setIsCheckingConflict] = useState<boolean>(false);
  const [overrideConflict, setOverrideConflict] = useState<boolean>(false);
  const [submitMode, setSubmitMode] = useState<'save' | 'approve'>('save');

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
        return tripTicketApi.update(ticket.id, data);
      }
      return tripTicketApi.create(data);
    },
    onSuccess: (res: any) => {
      const saved = res?.data || res;
      toast.success(ticket ? 'Trip Ticket updated successfully' : 'Trip Ticket created successfully');
      qc.invalidateQueries({ queryKey: ['trip-tickets'] });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['billing'] });
      if (ticket?.invoice_id) {
        qc.invalidateQueries({ queryKey: ['sales-transaction-details', ticket.invoice_id] });
      }
      onSaved?.(saved);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || `Failed to ${ticket ? 'update' : 'create'} trip ticket`);
    },
  });

  const canOverride = user?.role === 'super_admin' || user?.role === 'executive_vice_president' || user?.role === 'operations_manager' || user?.tags?.includes('process:override_schedule');
  const isSubmitDisabled = mutation.isPending || isCheckingConflict || (conflicts.length > 0 && (!canOverride || !overrideConflict));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      ...form,
      bus_id: form.bus_id ? Number(form.bus_id) : null,
      driver_id: form.driver_id ? Number(form.driver_id) : null,
      no_of_passengers: Number(form.no_of_passengers) || 1,
      meal_allowance: Number(parseMoneyInput(String(form.meal_allowance || 0))),
      diesel: Number(parseMoneyInput(String(form.diesel || 0))),
      sop: Number(parseMoneyInput(String(form.sop || 0))),
      easy_trip: Number(parseMoneyInput(String(form.easy_trip || 0))),
      autosweep: Number(parseMoneyInput(String(form.autosweep || 0))),
    };

    if (!canEditSalesFacts) {
      for (const field of ['date_of_travel', 'duration', 'pick_up', 'drop_off', 'bus_id', 'driver_id', 'no_of_passengers', 'plate_no']) {
        delete payload[field];
      }
    }
    if (isSalesSynchronized) {
      delete payload.duration;
    }

    if (overrideConflict) {
      payload.override_conflict = true;
    }

    if (ticket && (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'approve') {
      payload.status = 'approved';
    }

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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={ticket ? (ticket.status === 'draft' ? "Customize & Approve Trip Ticket" : "Edit Driver's Trip Ticket") : "New Trip Ticket"}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
        {ticket?.sales_order_item && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
            <p className="font-black flex items-center gap-2">
              <Route className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Sales-Synchronized Trip Ticket
            </p>
            <p className="mt-1 text-xs leading-5 opacity-90">
              Linked to booking: <strong>{ticket.sales_order_item.title}</strong>
              {ticket.assignment_index !== undefined ? ` (Unit #${Number(ticket.assignment_index) + 1})` : ''}.
              {canEditSalesFacts
                ? 'Vehicle, driver, schedule, route, and passenger changes here synchronize with the Sales booking, safety work orders, and fleet allocations.'
                : 'Schedule, route, passengers, vehicle, and driver are managed by the Sales booking. You can edit this ticket’s allowances and completion details here.'}
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
                  value={form.date_of_travel}
                  onChange={e => setForm(p => ({ ...p, date_of_travel: e.target.value }))}
                  disabled={!canEditSalesFacts}
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
            {canEditSalesFacts && <TripLocationMapPicker
              pickupLocation={form.pick_up || 'JVD Terminal, Manila'}
              dropOffLocation={form.drop_off || 'Tagaytay City'}
              vehicleType={(buses.find(b => String(b.id) === String(form.bus_id)) as any)?.vehicle_type || 'Bus'}
              onLocationSelect={(pickup, dropoff, _distance, _liters, cost) => {
                setForm(p => ({
                  ...p,
                  pick_up: pickup,
                  drop_off: dropoff,
                  diesel: isSalesSynchronized ? p.diesel : formatMoneyInput(String(cost)),
                }));
                toast.success(isSalesSynchronized ? 'Route updated' : 'Route pinned and diesel cost auto-calculated!');
              }}
            />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pick Up Location</label>
                <input
                  type="text"
                  required
                  value={form.pick_up}
                  onChange={e => setForm(p => ({ ...p, pick_up: e.target.value }))}
                  disabled={!canEditSalesFacts}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. JVD Terminal, Cubao"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Drop Off Location</label>
                <input
                  type="text"
                  required
                  value={form.drop_off}
                  onChange={e => setForm(p => ({ ...p, drop_off: e.target.value }))}
                  disabled={!canEditSalesFacts}
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
                  value={form.no_of_passengers}
                  disabled={!canEditSalesFacts}
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
                  value={form.duration}
                  onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
                  disabled={isSalesSynchronized}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 3 Days Roundtrip"
                />
              </div>
            </div>
          </div>
        </details>

        {/* Section 3: Bus & Crew Assignment */}
        <details className="group border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30" open>
          <summary className="cursor-pointer list-none flex justify-between items-center p-4 text-xs font-black text-blue-600 uppercase tracking-widest outline-none">
            <span>Bus & Crew Assignment</span>
          </summary>
          <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Driver</label>
                <select
                  value={form.driver_id}
                  onChange={e => setForm(p => ({ ...p, driver_id: e.target.value }))}
                  disabled={!canEditSalesFacts}
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
                  value={form.bus_id}
                  onChange={e => setForm(p => ({ ...p, bus_id: e.target.value, plate_no: '' }))}
                  disabled={!canEditSalesFacts}
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
                  disabled={!!form.bus_id}
                  readOnly={!canEditSalesFacts}
                  value={form.bus_id ? buses.find((b: any) => b.id === Number(form.bus_id))?.plate_number || '' : form.plate_no}
                  onChange={e => setForm(p => ({ ...p, plate_no: e.target.value }))}
                  placeholder={form.bus_id ? "Auto-synced with fleet" : "e.g. NDG-5818"}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-800"
                />
              </div>
            </div>
            {conflicts.length > 0 && (() => {
              const canOverrideUser = user?.role === 'super_admin' || user?.role === 'executive_vice_president' || user?.role === 'operations_manager' || user?.tags?.includes('process:override_schedule');
              return (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Schedule Conflict Detected</span>
                  </div>
                  <div className="space-y-1">
                    {conflicts.map((c, i) => (
                      <p key={i} className="text-xs text-red-700 dark:text-red-400 font-semibold leading-relaxed">
                        {c.message}
                      </p>
                    ))}
                  </div>
                  {canOverrideUser ? (
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
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Diesel</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.diesel}
                  onChange={e => {
                    const clean = parseMoneyInput(e.target.value);
                    if ((clean.split('.').length - 1) > 1) return;
                    const formatted = formatMoneyInput(e.target.value);
                    setForm(p => ({ ...p, diesel: formatted }));
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

          {ticket ? (
            <>
              <button
                type="submit"
                value="save"
                onClick={() => setSubmitMode('save')}
                disabled={isSubmitDisabled}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-2xl font-bold text-sm transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending && submitMode === 'save' && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Save Changes
              </button>

              {ticket.status === 'draft' && (
                <button
                  type="submit"
                  value="approve"
                  onClick={() => setSubmitMode('approve')}
                  disabled={isSubmitDisabled}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mutation.isPending && submitMode === 'approve' && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  Approve & Send to Cash Budgets
                </button>
              )}
            </>
          ) : (
            <button
              type="submit"
              value="save"
              onClick={() => setSubmitMode('save')}
              disabled={isSubmitDisabled}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Create Ticket
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

export default TripTicketFormModal;
