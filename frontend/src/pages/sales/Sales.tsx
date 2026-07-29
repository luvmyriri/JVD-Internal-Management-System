import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ds';
import { ArrowRight, Bus, CalendarDays, Clock3, FileCheck2, GraduationCap, MapPinned, Pencil, Plane, Search, ShieldCheck, Sparkles, UsersRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { catalogApi, type ServiceType } from '../../api/catalog';
import { charterApi } from '../../api/charters';
import { educationalTourApi } from '../../api/educationalTours';

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
  const [activeFilter, setActiveFilter] = useState<'all' | 'nearing' | 'unassigned'>('all');

  const { data: catalog, isLoading: catalogLoading } = useQuery({ queryKey: ['sales-workspace-catalog'], queryFn: catalogApi.getWorkspaceCatalog });
  const { data: departures = [], isLoading: departureLoading } = useQuery({ queryKey: ['joiner-departures', 'upcoming'], queryFn: catalogApi.getJoinerDepartures });
  const { data: charterBookings = [] } = useQuery({ queryKey: ['charter-bookings'], queryFn: charterApi.bookings });
  const { data: educationalBookings = [] } = useQuery({ queryKey: ['educational-bookings'], queryFn: educationalTourApi.bookings });

  const types = useMemo(() => (catalog?.service_types ?? []).filter(type => `${type.name} ${type.description}`.toLowerCase().includes(search.toLowerCase())), [catalog, search]);
  const sellableSeats = departures.reduce((sum, departure) => sum + Math.max(0, departure.capacity - departure.held_count - departure.confirmed_count), 0);

  // Unified master list of all active/upcoming bookings & departures across all packages
  const masterOperationsList = useMemo(() => {
    const nowMs = Date.now();
    const list: Array<{
      id: string;
      category: 'Joiner' | 'Charter' | 'Educational Tour';
      reference: string;
      title: string;
      starts_at: string;
      ends_at: string;
      bus_info?: string;
      driver_info?: string;
      status: string;
      days_until: number;
      is_nearing: boolean;
      needs_fleet: boolean;
      route: string;
    }> = [];

    // 1. Joiner Departures
    departures.forEach(d => {
      const startsMs = new Date(d.starts_at).getTime();
      const diffDays = Math.ceil((startsMs - nowMs) / (1000 * 60 * 60 * 24));
      list.push({
        id: `j-${d.id}`,
        category: 'Joiner',
        reference: d.code,
        title: d.service?.name || d.code || 'Joiner Tour',
        starts_at: d.starts_at,
        ends_at: d.ends_at,
        bus_info: d.bus ? `${d.bus.plate_number} (${d.bus.seating_capacity} Seats)` : undefined,
        driver_info: d.driver ? `${d.driver.first_name} ${d.driver.last_name}` : undefined,
        status: d.status,
        days_until: diffDays,
        is_nearing: diffDays >= 0 && diffDays <= 7,
        needs_fleet: !d.bus || !d.driver,
        route: `/sales/departures`,
      });
    });

    // 2. Bus Charters
    charterBookings.forEach(c => {
      const startsMs = new Date(c.starts_at).getTime();
      const diffDays = Math.ceil((startsMs - nowMs) / (1000 * 60 * 60 * 24));
      list.push({
        id: `c-${c.id}`,
        category: 'Charter',
        reference: c.reference || `CHTR-${c.id}`,
        title: `${c.lead_name || 'Charter Booking'} (${c.destination || 'Custom Route'})`,
        starts_at: c.starts_at,
        ends_at: c.ends_at,
        bus_info: c.bus ? `${c.bus.plate_number} (${c.bus.model})` : undefined,
        driver_info: c.driver ? `${c.driver.first_name} ${c.driver.last_name}` : undefined,
        status: c.status,
        days_until: diffDays,
        is_nearing: diffDays >= 0 && diffDays <= 7,
        needs_fleet: !c.bus || !c.driver,
        route: `/sales/charters`,
      });
    });

    // 3. Educational Tours
    educationalBookings.forEach(e => {
      const startsMs = new Date(e.starts_at).getTime();
      const diffDays = Math.ceil((startsMs - nowMs) / (1000 * 60 * 60 * 24));
      const hasVehicles = e.vehicles && e.vehicles.length > 0;
      list.push({
        id: `e-${e.id}`,
        category: 'Educational Tour',
        reference: e.reference || `EDU-${e.id}`,
        title: `${e.school_name} (${e.program?.name || 'Educational Package'})`,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        bus_info: hasVehicles ? `${e.vehicles.length} Bus(es) Allocated` : undefined,
        driver_info: hasVehicles ? `${e.vehicles.filter(v => v.driver).length} Driver(s) Assigned` : undefined,
        status: e.status,
        days_until: diffDays,
        is_nearing: diffDays >= 0 && diffDays <= 7,
        needs_fleet: !hasVehicles,
        route: `/sales/educational-tours`,
      });
    });

    return list.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [departures, charterBookings, educationalBookings]);

  const filteredOperationsList = useMemo(() => {
    if (activeFilter === 'nearing') return masterOperationsList.filter(item => item.is_nearing);
    if (activeFilter === 'unassigned') return masterOperationsList.filter(item => item.needs_fleet);
    return masterOperationsList;
  }, [masterOperationsList, activeFilter]);

  const nearingCount = useMemo(() => masterOperationsList.filter(item => item.is_nearing).length, [masterOperationsList]);
  const unassignedCount = useMemo(() => masterOperationsList.filter(item => item.needs_fleet).length, [masterOperationsList]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Banner */}
      <section className="overflow-hidden rounded-[28px] bg-[#071b33] text-white shadow-[0_24px_70px_rgba(7,27,51,0.18)]">
        <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
          <div className="p-7 md:p-10">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#75b8ff]">JVD Sales & Operations Hub</p>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-black leading-tight md:text-5xl">Oversee all package bookings, departures & fleet runs.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">Centralized control tower for Joiners, Bus Charters, Educational Exposure Trips, and Private Tour arrangements.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button onClick={() => navigate('/sales/fixed-packages')} className="!bg-[#2f8cff] !text-white">Sell a fixed package <ArrowRight className="h-4 w-4" /></Button>
              <Button variant="ghost" onClick={() => navigate('/sales/departures')} className="!border !border-white/20 !text-white hover:!bg-white/10">Joiner Departures</Button>
              <Button variant="ghost" onClick={() => navigate('/sales/charters')} className="!border !border-white/20 !text-white hover:!bg-white/10">Bus Charters</Button>
              <Button variant="ghost" onClick={() => navigate('/sales/educational-tours')} className="!border !border-white/20 !text-white hover:!bg-white/10">Educational Tours</Button>
            </div>
          </div>
          <div className="border-t border-white/10 bg-[#0c2848] p-7 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ffbd57]"><CalendarDays className="h-4 w-4" /> Operations Radar</div>
            <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10">
              <div className="bg-[#0c2848] p-5"><strong className="block text-4xl font-black tabular-nums text-[#ffbd57]">{nearingCount}</strong><span className="mt-1 block text-xs text-slate-300">Nearing Run (&lt;7d)</span></div>
              <div className="bg-[#0c2848] p-5"><strong className="block text-4xl font-black tabular-nums text-[#70d7b1]">{sellableSeats}</strong><span className="mt-1 block text-xs text-slate-300">Joiner Seats Open</span></div>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-slate-300"><ShieldCheck className="h-4 w-4 text-[#70d7b1]" /> Real-time sync across fleet allocations & driver schedules.</p>
          </div>
        </div>
      </section>

      {/* MASTER MANAGE BOOKING & DEPARTURES OPERATIONS CENTER */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Master Booking Management Center</p>
            <h2 className="text-xl font-black text-ink">Active & Nearing Package Runs ({masterOperationsList.length})</h2>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-surface-alt text-muted hover:text-ink'
              }`}
            >
              All Packages ({masterOperationsList.length})
            </button>
            <button
              onClick={() => setActiveFilter('nearing')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeFilter === 'nearing'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Nearing (&lt;7 Days) ({nearingCount})
            </button>
            <button
              onClick={() => setActiveFilter('unassigned')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeFilter === 'unassigned'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              <Bus className="w-3.5 h-3.5" /> Needs Fleet ({unassignedCount})
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOperationsList.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted" />
              <p className="mt-3 text-sm font-black text-ink">No bookings match the selected filter.</p>
            </div>
          ) : (
            filteredOperationsList.map(item => (
              <div key={item.id} className="rounded-2xl border border-border bg-surface p-5 space-y-3 shadow-xs hover:border-brand transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider ${
                      item.category === 'Joiner'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : item.category === 'Charter'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                    }`}>
                      {item.category}
                    </span>

                    {item.is_nearing ? (
                      <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Starts in {item.days_until === 0 ? 'Today!' : item.days_until === 1 ? 'Tomorrow!' : `${item.days_until} days`}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-muted">
                        {item.days_until > 0 ? `In ${item.days_until} days` : 'Past / Ongoing'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-black text-ink mt-2.5 leading-snug">{item.title}</h3>
                  <p className="text-xs font-bold text-brand mt-0.5">{item.reference}</p>

                  <div className="mt-3 space-y-1.5 text-xs text-muted">
                    <div className="flex items-center gap-2">
                      <Clock3 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{new Date(item.starts_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className={item.bus_info ? 'font-bold text-ink' : 'font-bold text-red-600'}>
                        {item.bus_info || '⚠️ Vehicle Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                    Status: <strong className="text-ink">{item.status}</strong>
                  </span>
                  <Button
                    size="sm"
                    onClick={() => navigate(item.route)}
                    className="!bg-blue-600 !text-white hover:!bg-blue-700"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Manage Booking
                  </Button>
                </div>
              </div>
            ))
          )}
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

