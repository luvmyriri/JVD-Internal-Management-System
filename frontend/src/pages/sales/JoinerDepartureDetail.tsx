import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bus, CalendarClock, Download, FileText, Loader2, Phone, TicketCheck, UserRound, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogApi } from '../../api/catalog';
import { Button } from '../../components/ds';

export default function JoinerDepartureDetail() {
  const navigate = useNavigate();
  const departureId = Number(useParams().departureId);
  const { data: departure, isLoading } = useQuery({ queryKey: ['joiner-departure', departureId], queryFn: () => catalogApi.getJoinerDeparture(departureId), enabled: departureId > 0 });
  const manifest = useMutation({
    mutationFn: () => catalogApi.getJoinerManifest(departureId),
    onSuccess: blob => { const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener,noreferrer'); window.setTimeout(() => URL.revokeObjectURL(url), 60000); },
    onError: () => toast.error('Manifest could not be generated'),
  });

  if (isLoading || !departure) return <div className="grid min-h-80 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-brand" /></div>;
  const available = Math.max(0, departure.capacity - departure.held_count - departure.confirmed_count);
  const passengers = departure.reservations?.flatMap(reservation => reservation.passengers.map(passenger => ({ ...passenger, reservation }))) ?? [];

  return <div className="w-full space-y-5 pb-12">
    <header className="rounded-3xl bg-[#071b33] p-7 text-white">
      <button onClick={() => navigate('/sales/departures')} className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Departure board</button>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#75b8ff]">{departure.code}</p><h1 className="mt-2 text-3xl font-black">{departure.service?.name || departure.code}</h1><p className="mt-2 flex items-center gap-2 text-sm text-slate-300"><CalendarClock className="h-4 w-4" />{new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(departure.starts_at))} — {new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(departure.ends_at))}</p></div><div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => manifest.mutate()} className="!border !border-white/20 !text-white">{manifest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Passenger manifest</Button>{departure.status === 'published' && available > 0 && <Button onClick={() => navigate(`/sales/joiners/checkout?departure=${departure.id}`)} className="!bg-[#2f8cff] !text-white"><TicketCheck className="h-4 w-4" /> Book seats</Button>}</div></div>
    </header>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-border bg-surface p-5"><p className="text-[10px] font-black uppercase tracking-wider text-muted">Confirmed</p><p className="mt-2 text-3xl font-black text-ink">{departure.confirmed_count}</p></div>
      <div className="rounded-2xl border border-border bg-surface p-5"><p className="text-[10px] font-black uppercase tracking-wider text-muted">Temporary holds</p><p className="mt-2 text-3xl font-black text-amber-600">{departure.held_count}</p></div>
      <div className="rounded-2xl border border-border bg-surface p-5"><p className="text-[10px] font-black uppercase tracking-wider text-muted">Available</p><p className="mt-2 text-3xl font-black text-emerald-600">{available}</p></div>
      <div className="rounded-2xl border border-border bg-surface p-5"><p className="text-[10px] font-black uppercase tracking-wider text-muted">Capacity</p><p className="mt-2 text-3xl font-black text-ink">{departure.capacity}</p></div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-3xl border border-border bg-surface"><div className="flex items-center justify-between border-b border-border p-6"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Confirmed roster</p><h2 className="mt-1 text-xl font-black text-ink">Passengers and seats</h2></div><span className="text-xs font-bold text-muted">{passengers.length} names</span></div>
        {passengers.length === 0 ? <div className="p-12 text-center"><UsersRound className="mx-auto h-8 w-8 text-muted" /><p className="mt-3 text-sm font-bold text-ink">No confirmed passengers</p></div> : <div className="divide-y divide-border">{passengers.sort((a, b) => (a.seat?.seat_code ?? '').localeCompare(b.seat?.seat_code ?? '')).map(passenger => <div key={passenger.id} className="grid gap-3 p-4 sm:grid-cols-[64px_1fr_1fr_160px] sm:items-center"><span className="grid h-10 w-12 place-items-center rounded-xl bg-[#071b33] text-xs font-black text-white">{passenger.seat?.seat_code}</span><div><p className="font-black text-ink">{passenger.first_name} {passenger.last_name}</p><p className="mt-1 text-xs text-muted">Lead: {passenger.reservation.lead_name}</p></div><p className="flex items-center gap-2 text-xs text-muted"><Phone className="h-3.5 w-3.5" />{passenger.emergency_contact || passenger.reservation.lead_contact || 'Not provided'}</p><button onClick={() => navigate('/accounting/billing')} className="flex items-center justify-end gap-2 text-xs font-bold text-brand"><FileText className="h-4 w-4" />{passenger.reservation.invoice?.invoice_number}</button></div>)}</div>}
      </section>

      <aside className="space-y-4"><div className="rounded-3xl border border-border bg-surface p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d88912]">Operations assignment</p><div className="mt-5 space-y-4"><div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand dark:bg-blue-950"><Bus className="h-5 w-5" /></span><div><p className="text-xs text-muted">Vehicle</p><p className="font-black text-ink">{departure.bus ? `${departure.bus.plate_number} · ${departure.bus.model}` : 'Not assigned'}</p></div></div><div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand dark:bg-blue-950"><UserRound className="h-5 w-5" /></span><div><p className="text-xs text-muted">Driver</p><p className="font-black text-ink">{departure.driver ? `${departure.driver.first_name} ${departure.driver.last_name}` : 'Not assigned'}</p></div></div></div></div><div className="rounded-3xl border border-border bg-surface p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Pickup instructions</p><p className="mt-3 text-sm leading-6 text-ink">{departure.pickup_instructions || 'No pickup instructions recorded.'}</p></div></aside>
    </div>
  </div>;
}
