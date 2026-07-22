import { useState, useMemo, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, GraduationCap, Plus, Route, School, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { educationalTourApi } from '../../api/educationalTours';
import { Button, Modal } from '../../components/ds';
import SalesCheckout, { type CartItem } from './SalesCheckout';

type Assignment = { bus_id: string; driver_id: string; planned_passengers: string };

const getTomorrowStartEnd = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  return { starts_at: `${dateStr}T08:00`, ends_at: `${dateStr}T17:00` };
};

const initialBooking = { program_id: '', school_name: 'St. Jude Academy', contact_person: 'Maria Santos', contact_email: 'maria.santos@stjude.edu.ph', contact_number: '09171234567', grade_level: 'Grade 10', starts_at: getTomorrowStartEnd().starts_at, ends_at: getTomorrowStartEnd().ends_at, pickup_location: 'St. Jude Main Campus', stops: '', student_count: '45', chaperone_count: '3', operations_notes: '', payment_method: 'Cash', payment_type: 'full', amount_received: '' };
const initialProgram = { name: '', learning_objectives: '', default_stops: '', minimum_students: '20', students_per_chaperone: '20', students_per_free_chaperone: '20', student_price: '', additional_chaperone_price: '0', includes_meals: true, includes_coordinator: true, includes_insurance: true, includes_shirt: false };

export default function EducationalTours() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [booking, setBooking] = useState(initialBooking);
  const [assignments, setAssignments] = useState<Assignment[]>([{ bus_id: '', driver_id: '', planned_passengers: '48' }]);
  const [programForm, setProgramForm] = useState(initialProgram);
  const [programOpen, setProgramOpen] = useState(false);
  const { data: programs = [] } = useQuery({ queryKey: ['educational-programs'], queryFn: educationalTourApi.programs });
  const { data: recent = [] } = useQuery({ queryKey: ['educational-bookings'], queryFn: educationalTourApi.bookings });

  // Auto-select first program if none selected
  useEffect(() => {
    if (programs.length > 0 && !booking.program_id) {
      const p = programs[0];
      setBooking(b => ({ ...b, program_id: String(p.id), stops: p.default_stops.join('\n') }));
    }
  }, [programs, booking.program_id]);

  const validInterval = Boolean(booking.starts_at && booking.ends_at && booking.ends_at > booking.starts_at);
  const { data: resources } = useQuery({ queryKey: ['educational-resources', booking.starts_at, booking.ends_at], queryFn: () => educationalTourApi.resources(booking.starts_at, booking.ends_at), enabled: validInterval });
  const { data: pricing, error: pricingError } = useQuery({ queryKey: ['educational-quote', booking.program_id, booking.student_count, booking.chaperone_count], queryFn: () => educationalTourApi.quote(Number(booking.program_id), Number(booking.student_count), Number(booking.chaperone_count)), enabled: Boolean(booking.program_id && booking.student_count) });
  const travelers = Number(booking.student_count || 0) + Number(booking.chaperone_count || 0);
  const allocated = assignments.reduce((sum, item) => sum + Number(item.planned_passengers || 0), 0);

  const selectedProgram = programs.find(p => p.id === Number(booking.program_id));

  // Auto-fill bus assignment when resources load if unselected
  useEffect(() => {
    if (resources?.buses && resources.buses.length > 0 && !assignments[0]?.bus_id) {
      const firstAvailableBus = resources.buses.find(b => b.available);
      const firstAvailableDriver = resources.drivers.find(d => d.available);
      if (firstAvailableBus) {
        setAssignments([{
          bus_id: String(firstAvailableBus.id),
          driver_id: firstAvailableDriver ? String(firstAvailableDriver.id) : '',
          planned_passengers: String(travelers || firstAvailableBus.seating_capacity)
        }]);
      }
    }
  }, [resources, assignments, travelers]);

  const createProgram = useMutation({ mutationFn: () => educationalTourApi.createProgram({ ...programForm, default_stops: programForm.default_stops.split('\n').map(stop => stop.trim()).filter(Boolean), minimum_students: Number(programForm.minimum_students), students_per_chaperone: Number(programForm.students_per_chaperone), students_per_free_chaperone: Number(programForm.students_per_free_chaperone), student_price: Number(programForm.student_price), additional_chaperone_price: Number(programForm.additional_chaperone_price) }), onSuccess: async created => { await queryClient.invalidateQueries({ queryKey: ['educational-programs'] }); setBooking(current => ({ ...current, program_id: String(created.id), stops: created.default_stops.join('\n') })); setProgramOpen(false); setProgramForm(initialProgram); toast.success('Educational program created and selected'); }, onError: (error: any) => { const errors = error?.response?.data?.errors as Record<string, string[]> | undefined; toast.error(errors ? Object.values(errors)[0]?.[0] : error?.response?.data?.message ?? 'Program could not be created'); } });

  // Uniform Cart item construction matching Custom Transactions
  const cart: CartItem[] = useMemo(() => {
    if (!selectedProgram) return [];
    const subtotal = pricing?.subtotal ?? (Number(selectedProgram.student_price) * Number(booking.student_count || 1));
    const primaryBusId = assignments[0]?.bus_id ? Number(assignments[0].bus_id) : undefined;
    const primaryDriverId = assignments[0]?.driver_id ? Number(assignments[0].driver_id) : undefined;

    return [{
      cartId: `educational-${selectedProgram.id}`,
      service: {
        id: (selectedProgram as any).service_id || selectedProgram.id,
        name: `Educational Tour: ${selectedProgram.name}`,
        category: 'Educational Tour',
        price: subtotal,
        is_sales_catalog: true,
      },
      quantity: 1,
      quantityLocked: true,
      customPrice: subtotal,
      busId: primaryBusId,
      driverId: primaryDriverId,
      travelDate: booking.starts_at ? booking.starts_at.slice(0, 10) : undefined,
      departureDate: booking.starts_at,
      arrivalDate: booking.ends_at,
      pickupLocation: booking.pickup_location || 'School Pickup Point',
      destination: selectedProgram.name,
      paxCount: travelers,
      lineName: `Educational Tour: ${booking.school_name || 'School Group'} (${selectedProgram.name})`,
      lineDescription: `School: ${booking.school_name || 'School'}. Grade: ${booking.grade_level || 'General'}. Students: ${booking.student_count}. Chaperones: ${booking.chaperone_count}. Pickup: ${booking.pickup_location || 'TBD'}. Allocated: ${allocated}/${travelers} travelers across ${assignments.length} vehicle(s).`,
      serviceType: 'educational_tour',
      requiresContract: (pricing?.total ?? 0) >= 50000,
      lineMetadata: {
        program_id: selectedProgram.id,
        school_name: booking.school_name,
        contact_person: booking.contact_person,
        contact_email: booking.contact_email,
        contact_number: booking.contact_number,
        grade_level: booking.grade_level,
        starts_at: booking.starts_at,
        ends_at: booking.ends_at,
        student_count: Number(booking.student_count),
        chaperone_count: Number(booking.chaperone_count),
        assignments: assignments,
        stops: booking.stops,
        operations_notes: booking.operations_notes,
      }
    }];
  }, [selectedProgram, pricing, booking, assignments, allocated, travelers]);

  const customerPreset = useMemo(() => ({
    name: booking.school_name || booking.contact_person,
    email: booking.contact_email,
    phone: booking.contact_number,
  }), [booking.school_name, booking.contact_person, booking.contact_email, booking.contact_number]);

  return <div className="w-full space-y-5 pb-12">
    <header className="rounded-3xl bg-[#071b33] p-7 text-white"><button onClick={() => navigate('/sales')} className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Sales workspace</button><div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#75b8ff]">School group operations</p><h1 className="mt-2 text-3xl font-black">Educational tour desk</h1><p className="mt-2 text-sm text-slate-300">Build the school program, enforce supervision, allocate every traveler, then hand a ready plan to operations.</p></div><Button onClick={() => setProgramOpen(true)} className="!bg-[#2f8cff] !text-white"><Plus className="h-4 w-4" /> New program</Button></div></header>

    <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_440px]">
      <aside className="rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">1 · School program</p>
            <p className="mt-1 text-xs text-muted">Choose the curriculum and supervision policy for this booking.</p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 dark:bg-blue-950 dark:text-blue-200">{programs.length}</span>
        </div>
        <div className="mt-4 space-y-3">
          {programs.length === 0 ? (
            <button type="button" onClick={() => setProgramOpen(true)} className="w-full rounded-2xl border border-dashed border-blue-300 bg-blue-50/50 p-5 text-center text-xs font-bold text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
              No educational programs yet. Create the first curriculum.
            </button>
          ) : programs.map(program => {
            const inclusions = [program.includes_meals && 'Meals', program.includes_coordinator && 'Coordinator', program.includes_insurance && 'Insurance', program.includes_shirt && 'Tour shirt'].filter(Boolean);
            return (
              <button key={program.id} type="button" onClick={() => setBooking(current => ({ ...current, program_id: String(program.id), stops: program.default_stops.join('\n') }))} className={`w-full rounded-2xl border p-4 text-left transition ${booking.program_id === String(program.id) ? 'border-brand bg-blue-50 shadow-sm dark:bg-blue-950' : 'border-border hover:border-blue-200 hover:bg-surface-alt'}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-black text-ink">{program.name}</p>
                  <span className="shrink-0 text-[10px] font-black uppercase text-brand">Min. {program.minimum_students}</span>
                </div>
                {program.learning_objectives && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">{program.learning_objectives}</p>}
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted">
                  <span>PHP {Number(program.student_price).toLocaleString()} / student</span>
                  <span>1 chaperone / {program.students_per_chaperone}</span>
                  <span>{program.default_stops.length} educational stop(s)</span>
                  <span>{inclusions.length ? inclusions.join(', ') : 'No bundled inclusions'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="space-y-5">
        <section className="rounded-3xl border border-border bg-surface p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">2 · School & schedule</p><div className="mt-5 grid gap-4 md:grid-cols-2"><input required value={booking.school_name} onChange={e => setBooking({ ...booking, school_name: e.target.value })} placeholder="School / organization" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm" /><input required value={booking.contact_person} onChange={e => setBooking({ ...booking, contact_person: e.target.value })} placeholder="Contact person" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm" /><input type="email" value={booking.contact_email} onChange={e => setBooking({ ...booking, contact_email: e.target.value })} placeholder="Email" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm" /><input value={booking.contact_number} onChange={e => setBooking({ ...booking, contact_number: e.target.value })} placeholder="Contact number" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm" /><input required value={booking.grade_level} onChange={e => setBooking({ ...booking, grade_level: e.target.value })} placeholder="Grade level" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm" /><input required value={booking.pickup_location} onChange={e => setBooking({ ...booking, pickup_location: e.target.value })} placeholder="School pickup point" className="h-11 rounded-xl border border-border bg-surface px-3 text-sm" /><label className="text-xs font-bold text-muted">Departure<input required type="datetime-local" value={booking.starts_at} onChange={e => setBooking({ ...booking, starts_at: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink" /></label><label className="text-xs font-bold text-muted">Return<input required type="datetime-local" value={booking.ends_at} onChange={e => setBooking({ ...booking, ends_at: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink" /></label><label className="text-xs font-bold text-muted">Students<input required type="number" min="1" value={booking.student_count} onChange={e => setBooking({ ...booking, student_count: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink" /></label><label className="text-xs font-bold text-muted">Chaperones<input required type="number" min="0" value={booking.chaperone_count} onChange={e => setBooking({ ...booking, chaperone_count: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink" /></label><label className="text-xs font-bold text-muted md:col-span-2">Educational stops, one per line<textarea required value={booking.stops} onChange={e => setBooking({ ...booking, stops: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-sm text-ink" /></label></div></section>

        <section className="rounded-3xl border border-border bg-surface p-6"><div className="flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">3 · Multi-vehicle allocation</p><h2 className="mt-1 text-lg font-black text-ink">{allocated} of {travelers} travelers allocated</h2></div><Button type="button" variant="ghost" onClick={() => setAssignments(current => [...current, { bus_id: '', driver_id: '', planned_passengers: '' }])}><Plus className="h-4 w-4" /> Vehicle</Button></div><div className="mt-5 space-y-3">{assignments.map((assignment, index) => <div key={index} className="grid gap-3 rounded-2xl bg-surface-alt p-4 md:grid-cols-[1fr_1fr_140px_40px]"><select required value={assignment.bus_id} onChange={e => setAssignments(current => current.map((item, i) => i === index ? { ...item, bus_id: e.target.value } : item))} className="h-10 rounded-xl border border-border bg-surface px-3 text-sm"><option value="">Select bus/coaster…</option>{resources?.buses.map(bus => <option key={bus.id} value={bus.id} disabled={!bus.available || assignments.some((item, i) => i !== index && item.bus_id === String(bus.id))}>{bus.plate_number} · {bus.model} · {bus.seating_capacity} seats{!bus.available ? ' · unavailable' : ''}</option>)}</select><select required value={assignment.driver_id} onChange={e => setAssignments(current => current.map((item, i) => i === index ? { ...item, driver_id: e.target.value } : item))} className="h-10 rounded-xl border border-border bg-surface px-3 text-sm"><option value="">Select driver…</option>{resources?.drivers.map(driver => <option key={driver.id} value={driver.id} disabled={!driver.available || assignments.some((item, i) => i !== index && item.driver_id === String(driver.id))}>{driver.first_name} {driver.last_name}{!driver.available ? ' · unavailable' : ''}</option>)}</select><input required type="number" min="1" value={assignment.planned_passengers} onChange={e => setAssignments(current => current.map((item, i) => i === index ? { ...item, planned_passengers: e.target.value } : item))} placeholder="Passengers" className="h-10 rounded-xl border border-border bg-surface px-3 text-sm" /><button type="button" disabled={assignments.length === 1} onClick={() => setAssignments(current => current.filter((_, i) => i !== index))} className="grid h-10 place-items-center text-red-500 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div>)}</div></section>
      </div>

      <aside className="sticky top-4 h-fit">
        <SalesCheckout
          cart={cart}
          customerPreset={customerPreset}
          removeFromCart={() => {}}
          updateQuantity={() => {}}
          clearCart={() => {}}
          onCheckoutSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['educational-bookings'] });
            toast.success('Educational tour finalized & synchronized with accounting & logistics!');
          }}
        />
      </aside>
    </div>

    <section className="rounded-3xl border border-border bg-surface p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">School tour board</p><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{recent.slice(0, 9).map(item => <article key={item.id} className="rounded-2xl border border-border p-4"><div className="flex justify-between"><span className="text-[10px] font-black uppercase text-brand">{item.grade_level}</span><span className="text-[10px] font-black uppercase text-emerald-600">{item.status}</span></div><p className="mt-2 font-black text-ink">{item.school_name}</p><p className="mt-2 text-xs text-muted">{item.student_count} students · {item.chaperone_count} chaperones · {item.vehicles.length} vehicle(s)</p></article>)}</div></section>

    <Modal isOpen={programOpen} onClose={() => setProgramOpen(false)} title="Create educational tour program" size="lg" footer={null}>
      <form onSubmit={event => { event.preventDefault(); createProgram.mutate(); }} className="space-y-5 py-1">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
          <p className="flex items-center gap-2 text-sm font-black text-blue-950 dark:text-blue-100"><GraduationCap className="h-4 w-4" /> Curriculum definition</p>
          <p className="mt-1 text-xs leading-relaxed text-blue-800 dark:text-blue-200">Define the curriculum, group rules, pricing, and inclusions here. No separate package setup is required.</p>
          <div className="mt-4 grid gap-4">
            <label className="text-xs font-bold text-muted">Program name<input required value={programForm.name} onChange={e => setProgramForm({ ...programForm, name: e.target.value })} placeholder="e.g. Science Discovery Tour" className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink" /></label>
            <label className="text-xs font-bold text-muted">Learning objectives<textarea value={programForm.learning_objectives} onChange={e => setProgramForm({ ...programForm, learning_objectives: e.target.value })} placeholder="What students should learn or experience" rows={3} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-sm text-ink" /></label>
            <label className="text-xs font-bold text-muted">Default educational stops, one per line<textarea required value={programForm.default_stops} onChange={e => setProgramForm({ ...programForm, default_stops: e.target.value })} placeholder={'Science museum\nPlanetarium\nHeritage center'} rows={4} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-sm text-ink" /></label>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-border p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Enrollment and supervision</p>
            <div className="mt-3 grid gap-3">
              <label className="text-xs font-bold text-muted">Minimum students<input required type="number" min="1" value={programForm.minimum_students} onChange={e => setProgramForm({ ...programForm, minimum_students: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink" /></label>
              <label className="text-xs font-bold text-muted">Students per required chaperone<input required type="number" min="1" value={programForm.students_per_chaperone} onChange={e => setProgramForm({ ...programForm, students_per_chaperone: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink" /></label>
              <label className="text-xs font-bold text-muted">Students per free chaperone<input required type="number" min="1" value={programForm.students_per_free_chaperone} onChange={e => setProgramForm({ ...programForm, students_per_free_chaperone: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink" /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-border p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">School-group pricing</p>
            <div className="mt-3 grid gap-3">
              <label className="text-xs font-bold text-muted">Price per student (PHP)<input required type="number" min="0" step="0.01" value={programForm.student_price} onChange={e => setProgramForm({ ...programForm, student_price: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink" /></label>
              <label className="text-xs font-bold text-muted">Additional chaperone price (PHP)<input required type="number" min="0" step="0.01" value={programForm.additional_chaperone_price} onChange={e => setProgramForm({ ...programForm, additional_chaperone_price: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink" /></label>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-border p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Program inclusions</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([['includes_meals', 'Student meals'], ['includes_coordinator', 'Tour coordinator'], ['includes_insurance', 'Travel insurance'], ['includes_shirt', 'Tour shirt']] as const).map(([key, label]) => (
              <label key={key} className={`flex min-h-16 cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${programForm[key] ? 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100' : 'border-border text-muted'}`}>
                <input type="checkbox" checked={programForm[key]} onChange={e => setProgramForm({ ...programForm, [key]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Button type="button" variant="ghost" onClick={() => setProgramOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={createProgram.isPending}><GraduationCap className="h-4 w-4" /> {createProgram.isPending ? 'Creating…' : 'Create educational program'}</Button>
        </div>
      </form>
    </Modal>
  </div>;
}
