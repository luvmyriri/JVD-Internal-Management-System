import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bus, CalendarClock, Eye, Pencil, Plus, Trash2, UserRound, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { educationalTourApi, type EducationalBooking } from '../../../api/educationalTours';
import { Button, Modal } from '../../../components/ds';
import PassengerManifestModal, { type PassengerManifestRow } from '../../../components/travel/PassengerManifestModal';

const toLocal = (value: string) => value ? new Date(value).toISOString().slice(0, 16) : '';

export default function EducationalBookingManager({ bookings, targetId }: { bookings: EducationalBooking[]; targetId?: string | null }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<EducationalBooking | null>(null);
  const [manifestOpen, setManifestOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const open = (booking: EducationalBooking) => {
    setSelected(booking);
    setForm({
      school_name: booking.school_name,
      contact_person: booking.contact_person,
      contact_email: booking.contact_email ?? '',
      contact_number: booking.contact_number ?? '',
      grade_level: booking.grade_level,
      starts_at: toLocal(booking.starts_at),
      ends_at: toLocal(booking.ends_at),
      pickup_location: booking.pickup_location,
      stops: (booking.stops_snapshot ?? booking.program?.default_stops ?? []).join('\n'),
      booking_mode: booking.booking_mode ?? 'entire_vehicle',
      selected_seats: (booking.selected_seats ?? []).join(', '),
      passengers: (booking.passengers ?? []).map((passenger: any, index) => ({
        ...passenger,
        rowId: passenger.rowId ?? `educational-${booking.id}-${index}`,
        role: passenger.role ?? 'student',
      })),
      assignments: booking.vehicles.map(vehicle => ({
        bus_id: String(vehicle.bus.id),
        driver_id: String(vehicle.driver.id),
        planned_passengers: String(vehicle.planned_passengers),
      })),
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
    queryKey: ['educational-manage-resources', form.starts_at, form.ends_at, selected?.id],
    queryFn: () => educationalTourApi.resources(form.starts_at, form.ends_at),
    enabled: Boolean(selected && validInterval),
  });

  const buses = useMemo(() => {
    const list = [...(resources?.buses ?? [])];
    selected?.vehicles.forEach(vehicle => {
      if (!list.some(bus => bus.id === vehicle.bus.id)) list.unshift({ ...vehicle.bus, available: true });
    });
    return list;
  }, [resources, selected]);
  const drivers = useMemo(() => {
    const list = [...(resources?.drivers ?? [])];
    selected?.vehicles.forEach(vehicle => {
      if (!list.some(driver => driver.id === vehicle.driver.id)) list.unshift({ ...vehicle.driver, available: true });
    });
    return list;
  }, [resources, selected]);

  const update = useMutation({
    mutationFn: () => educationalTourApi.updateBooking(selected!.id, {
      ...form,
      stops: String(form.stops || '').split('\n').map(item => item.trim()).filter(Boolean),
      selected_seats: String(form.selected_seats || '').split(',').map(item => item.trim()).filter(Boolean),
      passengers: form.passengers ?? [],
      assignments: (form.assignments ?? []).map((assignment: any) => ({
        bus_id: Number(assignment.bus_id),
        driver_id: Number(assignment.driver_id),
        planned_passengers: Number(assignment.planned_passengers),
      })),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['educational-bookings'] });
      toast.success('Educational booking, fleet and seating updated');
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
      return educationalTourApi.cancelBooking(selected!.id, reason.trim());
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
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Manage bookings</p><h2 className="text-lg font-black text-ink">Educational tour operations</h2></div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{bookings.length} records</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {bookings.slice(0, 12).map(booking => (
          <button key={booking.id} onClick={() => open(booking)} className="rounded-2xl border border-border p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50/40">
            <div className="flex items-start justify-between gap-3"><strong className="text-sm text-ink">{booking.school_name}</strong><Pencil className="h-4 w-4 text-emerald-600" /></div>
            <p className="mt-1 text-xs font-bold text-muted">{booking.reference} · {booking.program?.name}</p>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted"><CalendarClock className="h-4 w-4" /> {new Date(booking.starts_at).toLocaleString()}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted"><Bus className="h-4 w-4" /> {booking.vehicles.length} vehicle(s) · {booking.student_count + (booking.adult_count ?? (booking as any).chaperone_count ?? 0)} travelers</p>
          </button>
        ))}
      </div>

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={`Manage Educational Tour ${selected?.reference ?? ''}`} size="lg">
        <div className="grid gap-4 p-1 md:grid-cols-2">
          <label className="text-xs font-bold text-muted">School<input value={form.school_name ?? ''} onChange={e => setForm({ ...form, school_name: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted">Grade level<input value={form.grade_level ?? ''} onChange={e => setForm({ ...form, grade_level: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted">Contact person<input value={form.contact_person ?? ''} onChange={e => setForm({ ...form, contact_person: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted">Contact number<input value={form.contact_number ?? ''} onChange={e => setForm({ ...form, contact_number: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted md:col-span-2">Email<input type="email" value={form.contact_email ?? ''} onChange={e => setForm({ ...form, contact_email: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted">Departure<input type="datetime-local" value={form.starts_at ?? ''} onChange={e => setForm({ ...form, starts_at: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted">Return<input type="datetime-local" value={form.ends_at ?? ''} onChange={e => setForm({ ...form, ends_at: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted md:col-span-2">Pickup<input value={form.pickup_location ?? ''} onChange={e => setForm({ ...form, pickup_location: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
          <label className="text-xs font-bold text-muted">Booking mode<select value={form.booking_mode ?? 'entire_vehicle'} onChange={e => setForm({ ...form, booking_mode: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink"><option value="entire_vehicle">Entire vehicle</option><option value="selected_seats">Selected seats</option></select></label>
          <label className="text-xs font-bold text-muted">Selected seats<input value={form.selected_seats ?? ''} onChange={e => setForm({ ...form, selected_seats: e.target.value })} disabled={form.booking_mode !== 'selected_seats'} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink disabled:opacity-50" /></label>
          <label className="text-xs font-bold text-muted md:col-span-2">Stops (one per line)<textarea rows={3} value={form.stops ?? ''} onChange={e => setForm({ ...form, stops: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
        </div>

        <div className="mt-5 rounded-2xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between"><strong className="text-sm text-ink">Fleet and driver allocations</strong><Button variant="secondary" size="sm" onClick={() => setForm({ ...form, assignments: [...assignments, { bus_id: '', driver_id: '', planned_passengers: '1' }] })}><Plus className="h-4 w-4" /> Add vehicle</Button></div>
          <div className="space-y-3">
            {assignments.map((assignment, index) => (
              <div key={index} className="grid gap-2 rounded-xl bg-surface-alt p-3 md:grid-cols-[1fr_1fr_120px_40px]">
                <select value={assignment.bus_id} onChange={e => setForm({ ...form, assignments: assignments.map((item, itemIndex) => itemIndex === index ? { ...item, bus_id: e.target.value } : item) })} className="rounded-xl border border-border bg-surface p-2 text-xs text-ink"><option value="">Select vehicle</option>{buses.map(bus => <option key={bus.id} value={bus.id} disabled={!bus.available}>{bus.plate_number} · {bus.model} · {bus.seating_capacity} seats</option>)}</select>
                <select value={assignment.driver_id} onChange={e => setForm({ ...form, assignments: assignments.map((item, itemIndex) => itemIndex === index ? { ...item, driver_id: e.target.value } : item) })} className="rounded-xl border border-border bg-surface p-2 text-xs text-ink"><option value="">Select driver</option>{drivers.map(driver => <option key={driver.id} value={driver.id} disabled={!driver.available}>{driver.first_name} {driver.last_name}</option>)}</select>
                <input type="number" min={1} value={assignment.planned_passengers} onChange={e => setForm({ ...form, assignments: assignments.map((item, itemIndex) => itemIndex === index ? { ...item, planned_passengers: e.target.value } : item) })} className="rounded-xl border border-border bg-surface p-2 text-xs text-ink" />
                <button type="button" onClick={() => setForm({ ...form, assignments: assignments.filter((_, itemIndex) => itemIndex !== index) })} className="grid place-items-center text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs font-bold text-muted">Allocated travelers: {assignments.reduce((sum, item) => sum + Number(item.planned_passengers || 0), 0)} / {(selected?.student_count ?? 0) + ((selected as any)?.adult_count ?? selected?.chaperone_count ?? 0)}</p>
        </div>

        <label className="mt-4 block text-xs font-bold text-muted">Operations notes<textarea rows={3} value={form.operations_notes ?? ''} onChange={e => setForm({ ...form, operations_notes: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-ink" /></label>
        <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setManifestOpen(true)}><UserRound className="h-4 w-4" /> Edit passenger manifest ({form.passengers?.length ?? 0})</Button>{selected?.invoice?.id && <Button variant="secondary" onClick={() => navigate(`/sales/transactions/${selected.invoice.id}`)}><Eye className="h-4 w-4" /> Transaction details</Button>}</div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => cancel.mutate()} isLoading={cancel.isPending} className="!text-red-600"><XCircle className="h-4 w-4" /> Request cancellation</Button><Button onClick={() => update.mutate()} isLoading={update.isPending}>Save booking</Button></div>
        </div>
      </Modal>
      <PassengerManifestModal isOpen={manifestOpen} onClose={() => setManifestOpen(false)} onSave={rows => { setForm({ ...form, passengers: rows, selected_seats: rows.map(row => row.seat_code).filter(Boolean).join(', ') }); setManifestOpen(false); }} initialPassengers={(form.passengers ?? []) as PassengerManifestRow[]} totalSeats={Math.max(49, buses.find(bus => String(bus.id) === String(assignments[0]?.bus_id))?.seating_capacity ?? 49)} selectedSeats={String(form.selected_seats ?? '').split(',').map(item => item.trim()).filter(Boolean)} title="Educational passenger manifest and seats" />
    </section>
  );
}
