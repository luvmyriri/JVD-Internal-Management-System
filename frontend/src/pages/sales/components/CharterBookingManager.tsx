import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bus, CalendarClock, Eye, Pencil, Plus, Trash2, UserRound, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { charterApi, type CharterBooking } from '../../../api/charters';
import { Button, Modal } from '../../../components/ds';
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
      }]).map(assignment => ({ bus_id: String(assignment.bus_id ?? ''), driver_id: String(assignment.driver_id ?? '') })),
      operations_notes: booking.operations_notes ?? '',
    });
  };

  useEffect(() => {
    if (!targetId) return;
    const booking = bookings.find(item => String(item.id) === targetId);
    if (booking) open(booking);
  }, [targetId, bookings]);

  const validInterval = Boolean(form.starts_at && form.ends_at && form.ends_at > form.starts_at);
  const { data: resources } = useQuery({
    queryKey: ['charter-manage-resources', form.starts_at, form.ends_at, selected?.id],
    queryFn: () => charterApi.resources(form.starts_at, form.ends_at),
    enabled: Boolean(selected && validInterval),
  });

  const buses = useMemo(() => {
    const list = [...(resources?.buses ?? [])];
    if (selected?.bus && !list.some(bus => bus.id === selected.bus.id)) list.unshift({ ...selected.bus, available: true });
    return list;
  }, [resources, selected]);
  const drivers = useMemo(() => {
    const list = [...(resources?.drivers ?? [])];
    if (selected?.driver && !list.some(driver => driver.id === selected.driver!.id)) list.unshift({ ...selected.driver, available: true });
    return list;
  }, [resources, selected]);

  const update = useMutation({
    mutationFn: () => charterApi.updateBooking(selected!.id, {
      ...form,
      bus_id: Number(form.bus_id),
      driver_id: form.driver_id ? Number(form.driver_id) : null,
      passenger_count: Number(form.passenger_count),
      stops: String(form.stops || '').split('\n').map(item => item.trim()).filter(Boolean),
      selected_seats: String(form.selected_seats || '').split(',').map(item => item.trim()).filter(Boolean),
      passengers: form.passengers ?? [],
      assignments: (form.assignments ?? []).map((assignment: any) => ({
        bus_id: Number(assignment.bus_id),
        driver_id: assignment.driver_id ? Number(assignment.driver_id) : null,
      })),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['charter-bookings'] });
      toast.success('Charter booking, fleet and seating updated');
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
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Manage bookings</p><h2 className="text-lg font-black text-ink">Charter operations</h2></div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{bookings.length} records</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {bookings.slice(0, 12).map(booking => (
          <button key={booking.id} onClick={() => open(booking)} className="rounded-2xl border border-border p-4 text-left transition hover:border-blue-400 hover:bg-blue-50/40">
            <div className="flex items-start justify-between gap-3"><strong className="text-sm text-ink">{booking.lead_name}</strong><Pencil className="h-4 w-4 text-blue-600" /></div>
            <p className="mt-1 text-xs font-bold text-muted">{booking.reference}</p>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted"><CalendarClock className="h-4 w-4" /> {new Date(booking.starts_at).toLocaleString()}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted"><Bus className="h-4 w-4" /> {booking.bus?.plate_number ?? 'Unassigned'} · {booking.passenger_count} pax</p>
          </button>
        ))}
      </div>

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={`Manage Charter ${selected?.reference ?? ''}`} size="lg">
        <div className="grid gap-4 p-1 md:grid-cols-2">
          <label className="text-xs font-bold text-muted">Lead customer<input value={form.lead_name ?? ''} onChange={e => setForm({ ...form, lead_name: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted">Contact number<input value={form.lead_contact ?? ''} onChange={e => setForm({ ...form, lead_contact: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted md:col-span-2">Email<input type="email" value={form.lead_email ?? ''} onChange={e => setForm({ ...form, lead_email: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted">Departure<input type="datetime-local" value={form.starts_at ?? ''} onChange={e => setForm({ ...form, starts_at: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted">Return<input type="datetime-local" value={form.ends_at ?? ''} onChange={e => setForm({ ...form, ends_at: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted">Pickup<input value={form.pickup_location ?? ''} onChange={e => setForm({ ...form, pickup_location: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted">Destination<input value={form.destination ?? ''} onChange={e => setForm({ ...form, destination: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted">Passenger count<input type="number" min={1} value={form.passenger_count ?? 1} onChange={e => setForm({ ...form, passenger_count: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted">Booking mode<select value={form.booking_mode ?? 'entire_vehicle'} onChange={e => setForm({ ...form, booking_mode: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink"><option value="entire_vehicle">Entire vehicle</option><option value="selected_seats">Selected seats</option></select></label>
          <label className="text-xs font-bold text-muted md:col-span-2">Selected seats (comma-separated)<input value={form.selected_seats ?? ''} onChange={e => setForm({ ...form, selected_seats: e.target.value })} disabled={form.booking_mode !== 'selected_seats'} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink disabled:opacity-50" /></label>
          <div className="md:col-span-2 rounded-2xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between"><strong className="text-sm text-ink">Fleet and drivers</strong><Button variant="secondary" size="sm" onClick={() => setForm({ ...form, assignments: [...assignments, { bus_id: '', driver_id: '' }] })}><Plus className="h-4 w-4" /> Add vehicle</Button></div>
            <div className="space-y-2">
              {assignments.map((assignment, index) => (
                <div key={index} className="grid gap-2 rounded-xl bg-surface-alt p-3 md:grid-cols-[1fr_1fr_40px]">
                  <select value={assignment.bus_id} onChange={e => { const next = assignments.map((item, itemIndex) => itemIndex === index ? { ...item, bus_id: e.target.value } : item); setForm({ ...form, assignments: next, bus_id: next[0]?.bus_id ?? '' }); }} className="rounded-xl border border-border bg-surface p-2 text-xs text-ink"><option value="">Select vehicle</option>{buses.map(bus => <option key={bus.id} value={bus.id} disabled={!bus.available && String(bus.id) !== assignment.bus_id}>{bus.plate_number} · {bus.model} · {bus.seating_capacity} seats</option>)}</select>
                  <select value={assignment.driver_id} onChange={e => { const next = assignments.map((item, itemIndex) => itemIndex === index ? { ...item, driver_id: e.target.value } : item); setForm({ ...form, assignments: next, driver_id: next[0]?.driver_id ?? '' }); }} className="rounded-xl border border-border bg-surface p-2 text-xs text-ink"><option value="">Unassigned</option>{drivers.map(driver => <option key={driver.id} value={driver.id} disabled={!driver.available && String(driver.id) !== assignment.driver_id}>{driver.first_name} {driver.last_name}</option>)}</select>
                  <button type="button" disabled={assignments.length === 1} onClick={() => { const next = assignments.filter((_, itemIndex) => itemIndex !== index); setForm({ ...form, assignments: next, bus_id: next[0]?.bus_id ?? '', driver_id: next[0]?.driver_id ?? '' }); }} className="grid place-items-center text-red-500 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
          <label className="text-xs font-bold text-muted md:col-span-2">Stops (one per line)<textarea rows={3} value={form.stops ?? ''} onChange={e => setForm({ ...form, stops: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted md:col-span-2">Operations notes<textarea rows={3} value={form.operations_notes ?? ''} onChange={e => setForm({ ...form, operations_notes: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
        </div>
        <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setManifestOpen(true)}><UserRound className="h-4 w-4" /> Edit passenger manifest ({form.passengers?.length ?? 0})</Button>{selected?.invoice?.id && <Button variant="secondary" onClick={() => navigate(`/sales/transactions/${selected.invoice.id}`)}><Eye className="h-4 w-4" /> Transaction details</Button>}</div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => cancel.mutate()} isLoading={cancel.isPending} className="!text-red-600"><XCircle className="h-4 w-4" /> Request cancellation</Button><Button onClick={() => update.mutate()} isLoading={update.isPending}>Save booking</Button></div>
        </div>
      </Modal>
      <PassengerManifestModal isOpen={manifestOpen} onClose={() => setManifestOpen(false)} onSave={rows => { setForm({ ...form, passengers: rows, selected_seats: rows.map(row => row.seat_code).filter(Boolean).join(', ') }); setManifestOpen(false); }} initialPassengers={(form.passengers ?? []) as PassengerManifestRow[]} totalSeats={buses.find(bus => String(bus.id) === String(form.bus_id))?.seating_capacity ?? 49} selectedSeats={String(form.selected_seats ?? '').split(',').map(item => item.trim()).filter(Boolean)} />
    </section>
  );
}
