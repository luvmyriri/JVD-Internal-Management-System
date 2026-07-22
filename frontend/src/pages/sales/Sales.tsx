import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ds';
import { ArrowRight, Bus, CalendarDays, Clock3, FileCheck2, MapPinned, Plane, Search, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { catalogApi, type ServiceType } from '../../api/catalog';

const iconFor = (code: string) => {
  if (code === 'joiner_tour') return UsersRound;
  if (code === 'bus_rental' || code === 'transfer_service') return Bus;
  if (code === 'flight_booking' || code === 'private_tour') return Plane;
  if (code.includes('assistance')) return FileCheck2;
  return MapPinned;
};

export default function Sales() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: catalog, isLoading: catalogLoading } = useQuery({ queryKey: ['sales-workspace-catalog'], queryFn: catalogApi.getWorkspaceCatalog });
  const { data: departures = [], isLoading: departureLoading } = useQuery({ queryKey: ['joiner-departures', 'upcoming'], queryFn: catalogApi.getJoinerDepartures });
  const types = useMemo(() => (catalog?.service_types ?? []).filter(type => `${type.name} ${type.description}`.toLowerCase().includes(search.toLowerCase())), [catalog, search]);
  const sellableSeats = departures.reduce((sum, departure) => sum + Math.max(0, departure.capacity - departure.held_count - departure.confirmed_count), 0);

  return (
    <div className="w-full space-y-5 pb-12">
      <section className="overflow-hidden rounded-[28px] bg-[#071b33] text-white shadow-[0_24px_70px_rgba(7,27,51,0.18)]">
        <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
          <div className="p-7 md:p-10">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#75b8ff]">JVD Sales Operations</p>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-black leading-tight md:text-5xl">Build the trip. Confirm the seat. Hand it to operations.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">One workspace for purpose-built travel services—from a fixed joiner departure to a private charter or visa case.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button onClick={() => navigate('/sales/fixed-packages')} className="!bg-[#2f8cff] !text-white">Sell a fixed package <ArrowRight className="h-4 w-4" /></Button>
              <Button variant="ghost" onClick={() => navigate('/sales/departures')} className="!border !border-white/20 !text-white hover:!bg-white/10">Manage departures</Button>
              <Button variant="ghost" onClick={() => navigate('/sales/custom-transactions')} className="!border !border-white/20 !text-white hover:!bg-white/10">Build a custom arrangement</Button>
            </div>
          </div>
          <div className="border-t border-white/10 bg-[#0c2848] p-7 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ffbd57]"><CalendarDays className="h-4 w-4" /> Live departure board</div>
            <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10">
              <div className="bg-[#0c2848] p-5"><strong className="block text-4xl font-black tabular-nums">{departures.length}</strong><span className="mt-1 block text-xs text-slate-300">Upcoming runs</span></div>
              <div className="bg-[#0c2848] p-5"><strong className="block text-4xl font-black tabular-nums text-[#70d7b1]">{sellableSeats}</strong><span className="mt-1 block text-xs text-slate-300">Seats ready to sell</span></div>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-slate-300"><ShieldCheck className="h-4 w-4 text-[#70d7b1]" /> Availability is checked again when seats are held.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-3xl border border-border bg-surface p-5 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand">Service desk</p><h2 className="mt-1 text-2xl font-black text-ink">What are we selling?</h2></div>
            <label className="flex h-11 min-w-72 items-center gap-2 rounded-xl border border-border bg-surface-alt px-3 focus-within:border-brand">
              <Search className="h-4 w-4 text-muted" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a service" className="w-full bg-transparent text-sm text-ink outline-none" />
            </label>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {catalogLoading ? <p className="text-sm text-muted">Loading service desk…</p> : types.map((type: ServiceType) => {
              const Icon = iconFor(type.code);
              const destination = type.code === 'joiner_tour'
                ? '/sales/departures'
                : type.code === 'bus_rental'
                  ? '/sales/charters'
                  : type.code === 'educational_tour'
                    ? '/sales/educational-tours'
                    : type.code === 'visa_assistance'
                      ? '/travel/visa-processing'
                      : type.code === 'passport_assistance'
                        ? '/travel/passporting'
                        : `/sales/custom-transactions?type=${type.code}`;
              return <button key={type.code} type="button" onClick={() => navigate(destination)} className="group min-h-40 rounded-2xl border border-border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#2f8cff] hover:shadow-lg dark:bg-gray-900">
                <div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf4ff] text-[#176cc2] dark:bg-blue-950"><Icon className="h-5 w-5" /></span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">Purpose-built</span></div>
                <h3 className="mt-4 font-black text-ink">{type.name}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{type.description}</p>
                <span className="mt-4 flex items-center gap-1 text-xs font-bold text-[#176cc2] opacity-0 transition group-hover:opacity-100">Open workflow <ArrowRight className="h-3 w-3" /></span>
              </button>;
            })}
          </div>
        </section>

        <aside className="rounded-3xl border border-border bg-surface p-5 md:p-7">
          <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#d88912]">Upcoming</p><h2 className="mt-1 text-2xl font-black text-ink">Joiner departures</h2></div><Sparkles className="h-5 w-5 text-[#d88912]" /></div>
          <div className="mt-5 space-y-3">
            {departureLoading ? <p className="text-sm text-muted">Checking departures…</p> : departures.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-6 text-center"><CalendarDays className="mx-auto h-7 w-7 text-muted" /><p className="mt-3 text-sm font-bold text-ink">No departure is published</p><p className="mt-1 text-xs text-muted">Create a dated run from a Joiner Tour product.</p></div> : departures.slice(0, 6).map(departure => {
              const available = Math.max(0, departure.capacity - departure.held_count - departure.confirmed_count);
              return <article key={departure.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-brand">{departure.code}</p><h3 className="mt-1 font-black text-ink">{departure.service?.name || departure.code || 'Joiner Tour'}</h3></div><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${departure.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{departure.status}</span></div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs"><span className="flex gap-2 text-muted"><Clock3 className="h-4 w-4" />{new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(departure.starts_at))}</span><span className="text-right font-black text-ink">{available}/{departure.capacity} seats</span></div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800"><div className="h-full rounded-full bg-[#2f8cff]" style={{ width: `${Math.min(100, ((departure.confirmed_count + departure.held_count) / departure.capacity) * 100)}%` }} /></div>
              </article>;
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
