import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bus,
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  Phone,
  Mail,
  FileText,
  Trash2,
  Plus,
  X,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Pencil,
  Eye,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { charterApi, type CharterBooking } from '../../../api/charters';
import { Button } from '../../../components/ds';
import PassengerManifestModal, { type PassengerManifestRow } from '../../../components/travel/PassengerManifestModal';

const toLocal = (value: string) => value ? new Date(value).toISOString().slice(0, 16) : '';

export default function CharterBookingManager({ bookings, targetId }: { bookings: CharterBooking[]; targetId?: string | null }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CharterBooking | null>(null);
  const [manifestOpen, setManifestOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const open = (booking: CharterBooking) => {
    setSelected(booking);
    setForm({
      lead_name: booking.lead_name,
      lead_email: booking.lead_email ?? '',
      lead_contact: booking.lead_contact ?? '',
      starts_at: toLocal(booking.starts_at),
      ends_at: toLocal(booking.ends_at),
      pickup_location: booking.pickup_location,
      destination: booking.destination,
      stops: (booking.stops ?? []).join('\n'),
      passenger_count: booking.passenger_count,
      bus_id: String(booking.bus?.id ?? ''),
      driver_id: String(booking.driver?.id ?? ''),
      booking_mode: booking.booking_mode ?? 'entire_vehicle',
      selected_seats: (booking.selected_seats ?? []).join(', '),
      passengers: (booking.passengers ?? []).map((passenger: any, index) => ({
        ...passenger,
        rowId: passenger.rowId ?? `charter-${booking.id}-${index}`,
        role: passenger.role ?? 'adult',
      })),
      assignments: (booking.fleet_assignments?.length ? booking.fleet_assignments : [{
        bus_id: booking.bus?.id,
        driver_id: booking.driver?.id,
      }]).map(assignment => ({
        bus_id: String(assignment.bus_id ?? ''),
        driver_id: String(assignment.driver_id ?? ''),
      })),
      operations_notes: booking.operations_notes ?? '',
    });
  };

  useEffect(() => {
    if (!targetId) return;
    const booking = bookings.find(item => String(item.id) === targetId);
    if (booking) open(booking);
  }, [targetId, bookings]);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selected && !manifestOpen) {
        setSelected(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, manifestOpen]);

  const validInterval = Boolean(form.starts_at && form.ends_at && form.ends_at > form.starts_at);
  const { data: resources, isLoading: resourcesLoading } = useQuery({
    queryKey: ['charter-manage-resources', form.starts_at, form.ends_at, selected?.id],
    queryFn: () => charterApi.resources(form.starts_at, form.ends_at),
    enabled: Boolean(selected && validInterval),
  });

  const buses = useMemo(() => {
    const list = [...(resources?.buses ?? [])];
    if (selected?.bus && !list.some(bus => bus.id === selected.bus.id)) {
      list.unshift({ ...selected.bus, available: true });
    }
    return list;
  }, [resources, selected]);

  const drivers = useMemo(() => {
    const list = [...(resources?.drivers ?? [])];
    if (selected?.driver && !list.some(driver => driver.id === selected.driver!.id)) {
      list.unshift({ ...selected.driver, available: true });
    }
    return list;
  }, [resources, selected]);

  const update = useMutation({
    mutationFn: () => charterApi.updateBooking(selected!.id, {
      ...form,
      bus_id: Number(form.bus_id) || Number(form.assignments?.[0]?.bus_id) || null,
      driver_id: form.driver_id ? Number(form.driver_id) : (form.assignments?.[0]?.driver_id ? Number(form.assignments[0].driver_id) : null),
      passenger_count: Number(form.passenger_count),
      stops: String(form.stops || '').split('\n').map(item => item.trim()).filter(Boolean),
      selected_seats: String(form.selected_seats || '').split(',').map(item => item.trim()).filter(Boolean),
      passengers: form.passengers ?? [],
      assignments: (form.assignments ?? []).map((assignment: any) => ({
        bus_id: Number(assignment.bus_id) || null,
        driver_id: assignment.driver_id ? Number(assignment.driver_id) : null,
      })),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['charter-bookings'] });
      toast.success('Charter booking, fleet, and schedule updated');
      setSelected(null);
    },
    onError: (error: any) => {
      const errors = error?.response?.data?.errors as Record<string, string[]> | undefined;
      toast.error(errors ? Object.values(errors)[0]?.[0] : error?.response?.data?.message || 'Booking could not be updated');
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const reason = window.prompt('Reason for cancellation request:');
      if (!reason?.trim()) throw new Error('cancelled');
      return charterApi.cancelBooking(selected!.id, reason.trim());
    },
    onSuccess: () => {
      toast.success('Cancellation submitted for approval');
      setSelected(null);
    },
    onError: (error: any) => {
      if (error?.message !== 'cancelled') toast.error(error?.response?.data?.message || 'Cancellation request failed');
    },
  });

  const assignments = (form.assignments ?? []) as Array<Record<string, string>>;

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Manage bookings</p>
          <h2 className="text-lg font-black text-ink">Charter operations</h2>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          {bookings.length} {bookings.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {bookings.slice(0, 12).map(booking => {
          const isCurrent = selected?.id === booking.id;
          return (
            <button
              key={booking.id}
              onClick={() => open(booking)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                isCurrent
                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 ring-2 ring-blue-500/20 shadow-sm'
                  : 'border-border hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <strong className="text-sm font-black text-ink">{booking.lead_name}</strong>
                <Pencil className="h-4 w-4 text-blue-600 shrink-0" />
              </div>
              <p className="mt-1 text-xs font-bold text-muted font-mono">{booking.reference}</p>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                <CalendarClock className="h-4 w-4 text-slate-400" />
                {new Date(booking.starts_at).toLocaleDateString()} · {new Date(booking.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                <Bus className="h-4 w-4 text-slate-400" />
                {booking.bus?.plate_number ?? 'Unassigned'} · {booking.passenger_count} pax
              </p>
            </button>
          );
        })}
      </div>

      {/* Right-Side Slide-Over Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Blur Overlay */}
          <div
            onClick={() => setSelected(null)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
              
              {/* Drawer Header (Sticky) */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                      {selected.reference}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                      {selected.status ?? 'Confirmed'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Manage Charter Booking
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {selected.invoice?.id && (
                    <button
                      type="button"
                      onClick={() => navigate(`/sales/transactions/${selected.invoice.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 transition-all border border-blue-200 dark:border-blue-800"
                      title="View transaction invoice details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Invoice Details
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    title="Close drawer (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {/* 1. Client & Manifest Card */}
                <div className="p-5 rounded-3xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                        Client & Passenger Manifest
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setManifestOpen(true)}
                      className="!text-xs font-bold !bg-white dark:!bg-slate-900 border !border-slate-200 dark:!border-slate-700 shadow-xs hover:!border-blue-400"
                    >
                      <Users className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      Manifest ({form.passengers?.length ?? 0} Pax)
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="text-xs font-bold text-slate-500">
                      Lead Customer Name
                      <input
                        type="text"
                        value={form.lead_name ?? ''}
                        onChange={e => setForm({ ...form, lead_name: e.target.value })}
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                        placeholder="e.g. Jonathan Ramos"
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-500">
                      Contact Number
                      <input
                        type="text"
                        value={form.lead_contact ?? ''}
                        onChange={e => setForm({ ...form, lead_contact: e.target.value })}
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                        placeholder="e.g. 09068571389"
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-500 sm:col-span-2">
                      Email Address
                      <input
                        type="email"
                        value={form.lead_email ?? ''}
                        onChange={e => setForm({ ...form, lead_email: e.target.value })}
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                        placeholder="e.g. client@example.com"
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-500">
                      Total Passenger Count
                      <input
                        type="number"
                        min={1}
                        value={form.passenger_count ?? 1}
                        onChange={e => setForm({ ...form, passenger_count: e.target.value })}
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-500">
                      Booking Mode
                      <select
                        value={form.booking_mode ?? 'entire_vehicle'}
                        onChange={e => setForm({ ...form, booking_mode: e.target.value })}
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="entire_vehicle">Entire Vehicle Charter</option>
                        <option value="selected_seats">Specific Assigned Seats</option>
                      </select>
                    </label>

                    {form.booking_mode === 'selected_seats' && (
                      <label className="text-xs font-bold text-slate-500 sm:col-span-2">
                        Selected Seats (comma-separated)
                        <input
                          type="text"
                          value={form.selected_seats ?? ''}
                          onChange={e => setForm({ ...form, selected_seats: e.target.value })}
                          className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                          placeholder="e.g. 1A, 1B, 2A, 2B"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* 2. Route & Schedule Card */}
                <div className="p-5 rounded-3xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                      Trip Route & Schedule
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="text-xs font-bold text-slate-500">
                      Departure Date & Time
                      <input
                        type="datetime-local"
                        value={form.starts_at ?? ''}
                        onChange={e => setForm({ ...form, starts_at: e.target.value })}
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-500">
                      Return Date & Time
                      <input
                        type="datetime-local"
                        value={form.ends_at ?? ''}
                        onChange={e => setForm({ ...form, ends_at: e.target.value })}
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-500">
                      Pickup Origin
                      <input
                        type="text"
                        value={form.pickup_location ?? ''}
                        onChange={e => setForm({ ...form, pickup_location: e.target.value })}
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                        placeholder="e.g. Manila Hub / Caloocan"
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-500">
                      Drop-off Destination
                      <input
                        type="text"
                        value={form.destination ?? ''}
                        onChange={e => setForm({ ...form, destination: e.target.value })}
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                        placeholder="e.g. Laoag City"
                      />
                    </label>

                    <label className="text-xs font-bold text-slate-500 sm:col-span-2">
                      Intermediate Stops (one per line)
                      <textarea
                        rows={2}
                        value={form.stops ?? ''}
                        onChange={e => setForm({ ...form, stops: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                        placeholder="e.g. NLEX Shell Balagtas&#10;Tarlac City"
                      />
                    </label>
                  </div>
                </div>

                {/* 3. Fleet & Driver Allocations Deck */}
                <div className="p-5 rounded-3xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center">
                        <Bus className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                        Fleet & Driver Allocations ({assignments.length} {assignments.length === 1 ? 'Unit' : 'Units'})
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setForm({ ...form, assignments: [...assignments, { bus_id: '', driver_id: '' }] })}
                      className="!text-xs font-bold !bg-white dark:!bg-slate-900 border !border-slate-200 dark:!border-slate-700 shadow-xs hover:!border-amber-400"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Add Vehicle
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {assignments.map((assignment, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                            Vehicle Unit #{index + 1}
                          </span>
                          {assignments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = assignments.filter((_, itemIndex) => itemIndex !== index);
                                setForm({
                                  ...form,
                                  assignments: next,
                                  bus_id: next[0]?.bus_id ?? '',
                                  driver_id: next[0]?.driver_id ?? '',
                                });
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                              title="Remove this vehicle allocation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="text-xs font-bold text-slate-500">
                            Assigned Bus
                            <select
                              value={assignment.bus_id}
                              onChange={e => {
                                const val = e.target.value;
                                const next = assignments.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, bus_id: val } : item
                                );
                                setForm({
                                  ...form,
                                  assignments: next,
                                  bus_id: next[0]?.bus_id ?? '',
                                });
                              }}
                              className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="">Select fleet vehicle…</option>
                              {buses.map(bus => (
                                <option
                                  key={bus.id}
                                  value={bus.id}
                                  disabled={!bus.available && String(bus.id) !== assignment.bus_id}
                                >
                                  {bus.plate_number} · {bus.model} ({bus.seating_capacity} seats){!bus.available ? ' · busy' : ''}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="text-xs font-bold text-slate-500">
                            Assigned Driver
                            <select
                              value={assignment.driver_id}
                              onChange={e => {
                                const val = e.target.value;
                                const next = assignments.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, driver_id: val } : item
                                );
                                setForm({
                                  ...form,
                                  assignments: next,
                                  driver_id: next[0]?.driver_id ?? '',
                                });
                              }}
                              className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="">Unassigned (Assign later)</option>
                              {drivers.map(driver => (
                                <option
                                  key={driver.id}
                                  value={driver.id}
                                  disabled={!driver.available && String(driver.id) !== assignment.driver_id}
                                >
                                  {driver.first_name} {driver.last_name}{!driver.available ? ' · busy' : ''}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Operations & Dispatch Notes */}
                <div className="p-5 rounded-3xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                      Operations & Dispatch Notes
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={form.operations_notes ?? ''}
                    onChange={e => setForm({ ...form, operations_notes: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Enter dispatch reminders, toll account instructions, or special requests from the client…"
                  />
                </div>

              </div>

              {/* Drawer Sticky Footer Action Bar */}
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 sticky bottom-0 z-20 shadow-lg">
                <button
                  type="button"
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-800/60 transition-all disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Booking
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    Close
                  </button>

                  <Button
                    type="button"
                    onClick={() => update.mutate()}
                    isLoading={update.isPending}
                    className="!bg-blue-600 !text-white !font-black !px-6 !py-2.5 !rounded-xl shadow-md hover:!bg-blue-700 transition-all"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Passenger Manifest Sub-Modal */}
      <PassengerManifestModal
        isOpen={manifestOpen}
        onClose={() => setManifestOpen(false)}
        onSave={rows => {
          setForm({
            ...form,
            passengers: rows,
            selected_seats: rows.map(row => row.seat_code).filter(Boolean).join(', '),
          });
          setManifestOpen(false);
        }}
        initialPassengers={(form.passengers ?? []) as PassengerManifestRow[]}
        totalSeats={buses.find(bus => String(bus.id) === String(form.bus_id))?.seating_capacity ?? 49}
        selectedSeats={String(form.selected_seats ?? '').split(',').map(item => item.trim()).filter(Boolean)}
      />
    </section>
  );
}
