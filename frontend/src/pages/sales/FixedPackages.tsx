import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bus,
  CalendarDays,
  GraduationCap,
  ImagePlus,
  MapPinned,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { billingApi, type Service } from '../../api/billing';
import { useAuth } from '../../context/AuthContext';
import { Button, Modal } from '../../components/ds';
import { formatMoneyInput, parseMoneyInput } from '../../utils';
import { resolveServiceType } from './fixedPackagesUtils';

interface PackageForm {
  name: string;
  description: string;
  destination: string;
  origin: string;
  durationDays: string;
  durationNights: string;
  minimumPax: string;
  maximumPax: string;
  bookingLeadDays: string;
  validFrom: string;
  validUntil: string;
  adultPrice: string;
  childPrice: string;
  itinerary: string;
  inclusions: string;
  exclusions: string;
  costBreakdown: string;
  images: string[];
}

const INITIAL_FORM: PackageForm = {
  name: '', description: '', destination: '', origin: '', durationDays: '3', durationNights: '2',
  minimumPax: '1', maximumPax: '12', bookingLeadDays: '7', validFrom: '', validUntil: '',
  adultPrice: '', childPrice: '', itinerary: '', inclusions: '', exclusions: '', costBreakdown: '', images: [],
};

const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-blue-500/10';
const textareaClass = 'mt-1.5 w-full rounded-xl border border-border bg-surface p-3 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-blue-500/10';

const imageUrl = (path?: string) => {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('http') || path.startsWith('/')) return path;
  return `/storage/${path}`;
};

export default function FixedPackages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Keep action visibility aligned with the billing-service write route. These are
  // the staff roles that can actually complete, create, edit, and retire packages.
  const canManage = ['super_admin', 'executive_vice_president', 'accounting_executive', 'reservation_officer', 'office_staff'].includes(user?.role || '');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [continueAfterSave, setContinueAfterSave] = useState(false);
  const [form, setForm] = useState<PackageForm>(INITIAL_FORM);

  const { data: response, isLoading } = useQuery({
    queryKey: ['billing-services'],
    queryFn: billingApi.getServices,
  });

  // This page is intentionally not a universal catalog. Only private tour package
  // definitions live here. Joiners, charters and educational tours have separate engines.
  const packages = useMemo(() => {
    const services = (response?.data?.data ?? []) as Service[];
    return services
      .filter((service) => service.is_sales_catalog !== false && resolveServiceType(service) === 'private_tour')
      .filter((service) => {
        const needle = search.trim().toLowerCase();
        if (!needle) return true;
        return [service.name, service.description, service.package_config?.destination]
          .some((value) => String(value || '').toLowerCase().includes(needle));
      });
  }, [response, search]);

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setContinueAfterSave(false);
    setForm(INITIAL_FORM);
  };

  const openCreate = () => {
    setEditingId(null);
    setContinueAfterSave(false);
    setForm(INITIAL_FORM);
    setFormOpen(true);
  };

  const openEdit = (service: Service, continueToBooking = false) => {
    const config = service.package_config ?? {};
    setEditingId(service.id);
    setContinueAfterSave(continueToBooking);
    setForm({
      name: service.name || '',
      description: service.description || '',
      destination: config.destination || '',
      origin: config.origin || '',
      durationDays: String(config.duration_days ?? 1),
      durationNights: String(config.duration_nights ?? 0),
      minimumPax: String(config.minimum_pax ?? 1),
      maximumPax: String(config.maximum_pax ?? service.max_pax ?? 1),
      bookingLeadDays: String(config.booking_lead_days ?? 0),
      validFrom: config.valid_from || '',
      validUntil: config.valid_until || '',
      adultPrice: formatMoneyInput(String(service.adult_price ?? service.price ?? 0)),
      childPrice: formatMoneyInput(String(service.child_price ?? service.adult_price ?? service.price ?? 0)),
      itinerary: (config.default_itinerary ?? []).join('\n'),
      inclusions: service.inclusions || '',
      exclusions: service.exclusions || '',
      costBreakdown: service.cost_breakdown || '',
      images: service.images ?? [],
    });
    setFormOpen(true);
  };

  const savePackage = useMutation({
    mutationFn: async () => {
      const maximumPax = Number(form.maximumPax);
      const minimumPax = Number(form.minimumPax);
      if (!form.name.trim() || !form.destination.trim()) throw new Error('Package name and destination are required.');
      if (!Number(form.durationDays) || Number(form.durationDays) < 1) throw new Error('Duration must be at least one day.');
      if (minimumPax < 1 || maximumPax < minimumPax) throw new Error('Maximum travelers must be equal to or greater than minimum travelers.');
      if (!Number(parseMoneyInput(form.adultPrice))) throw new Error('Enter the adult package rate.');
      if (form.validFrom && form.validUntil && form.validUntil < form.validFrom) throw new Error('Validity end date cannot be earlier than its start date.');

      const payload = {
        name: form.name.trim(),
        category: 'Package',
        service_type: 'private_tour',
        is_sales_catalog: true,
        description: form.description.trim(),
        price: Number(parseMoneyInput(form.adultPrice)),
        adult_price: Number(parseMoneyInput(form.adultPrice)),
        child_price: Number(parseMoneyInput(form.childPrice || form.adultPrice)),
        child_discount: 0,
        has_booking_fields: true,
        is_tour: false,
        max_pax: maximumPax,
        package_config: {
          destination: form.destination.trim(),
          origin: form.origin.trim() || undefined,
          duration_days: Number(form.durationDays),
          duration_nights: Number(form.durationNights || 0),
          minimum_pax: minimumPax,
          maximum_pax: maximumPax,
          booking_lead_days: Number(form.bookingLeadDays || 0),
          valid_from: form.validFrom || undefined,
          valid_until: form.validUntil || undefined,
          default_itinerary: form.itinerary.split('\n').map((row) => row.trim()).filter(Boolean),
        },
        inclusions: form.inclusions,
        exclusions: form.exclusions,
        cost_breakdown: form.costBreakdown,
        images: form.images,
      };

      return editingId
        ? billingApi.updateService(editingId, payload)
        : billingApi.createService(payload);
    },
    onSuccess: async () => {
      const checkoutServiceId = continueAfterSave ? editingId : null;
      await queryClient.invalidateQueries({ queryKey: ['billing-services'] });
      toast.success(checkoutServiceId ? 'Package completed. Continue with the customer booking.' : editingId ? 'Private package updated' : 'Private package created');
      closeForm();
      if (checkoutServiceId) navigate(`/sales/fixed-packages/${checkoutServiceId}/book`);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || error?.message || 'Package could not be saved'),
  });

  const removePackage = useMutation({
    mutationFn: (id: number) => billingApi.deleteService(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['billing-services'] });
      toast.success('Package removed');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Package could not be removed'),
  });

  const sellPackage = (service: Service) => {
    navigate(`/sales/fixed-packages/${service.id}/book`);
  };

  const workflowCards = [
    { title: 'Joiner departures', description: 'Fixed dates, finite seat inventory, named passengers and seat locks.', icon: UsersRound, route: '/sales/departures', accent: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
    { title: 'Bus & van charters', description: 'Rate plan, route, vehicle capacity, driver and availability validation.', icon: Bus, route: '/sales/charters', accent: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
    { title: 'Educational tours', description: 'School program, supervision ratios and multi-vehicle allocation.', icon: GraduationCap, route: '/sales/educational-tours', accent: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <header className="rounded-3xl bg-[#071b33] p-7 text-white">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#75b8ff]">Package operations</p>
            <h1 className="mt-2 text-3xl font-black">Fixed & packaged travel</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">Private package definitions are managed here. Shared-seat departures, charters, and school programs use their own operational data and validation.</p>
          </div>
          {canManage && <Button onClick={openCreate} className="!bg-[#2f8cff] !text-white"><Plus className="h-4 w-4" /> New private tour package</Button>}
        </div>
      </header>

      <section className="grid gap-3 rounded-3xl border border-blue-100 bg-blue-50/60 p-5 dark:border-blue-900/50 dark:bg-blue-950/20 md:grid-cols-4">
        {[
          ['1', 'Choose package', 'Select a completed private-tour product below.'],
          ['2', 'Build booking', 'Set the party dates, named adults/children, itinerary, bus, and driver.'],
          ['3', 'Agent checkout', 'Confirm the invoice customer, payment method, and amount received.'],
          ['4', 'Synchronized handoff', 'Invoice, accounting entry, typed fulfillment, and logistics allocation are created together.'],
        ].map(([step, title, copy]) => <div key={step} className="flex gap-3 rounded-2xl bg-surface p-4 shadow-sm"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-black text-white">{step}</span><div><p className="text-xs font-black text-ink">{title}</p><p className="mt-1 text-[11px] leading-4 text-muted">{copy}</p></div></div>)}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {workflowCards.map((workflow) => <button key={workflow.route} onClick={() => navigate(workflow.route)} className="group rounded-2xl border border-border bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg">
          <div className="flex items-start justify-between gap-4"><span className={`grid h-11 w-11 place-items-center rounded-xl ${workflow.accent}`}><workflow.icon className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-1 group-hover:text-brand" /></div>
          <h2 className="mt-4 font-black text-ink">{workflow.title}</h2><p className="mt-1 text-xs leading-5 text-muted">{workflow.description}</p>
        </button>)}
      </section>

      <section className="rounded-3xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border p-6 md:flex-row md:items-center md:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Private tour packages</p><h2 className="mt-1 text-xl font-black text-ink">Package library</h2></div>
          <label className="relative block w-full md:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search destination or package" className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-sm text-ink" /></label>
        </div>

        {isLoading ? <div className="p-12 text-center text-sm text-muted">Loading private packages...</div> : packages.length === 0 ? <div className="p-12 text-center"><MapPinned className="mx-auto h-10 w-10 text-muted" /><h3 className="mt-4 font-black text-ink">No private tour packages found</h3><p className="mt-1 text-sm text-muted">Create a package with its own destination, duration, rates, traveler limits, itinerary and inclusions.</p></div> : <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((service) => {
            const config = service.package_config ?? {};
            const isConfigured = Boolean(config.destination && config.duration_days && config.minimum_pax && config.maximum_pax && config.default_itinerary?.length);
            return <article key={service.id} className="overflow-hidden rounded-3xl border border-border bg-surface-alt">
              <div className="relative h-44 bg-slate-100 dark:bg-gray-800">{service.images?.[0] ? <img src={imageUrl(service.images[0])} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><MapPinned className="h-10 w-10 text-slate-300" /></div>}<span className="absolute left-4 top-4 rounded-full bg-slate-950/80 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white">Private tour</span></div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-widest text-brand">{config.destination || 'Destination not set'}</p><h3 className="mt-1 text-lg font-black text-ink">{service.name}</h3></div>{canManage && <div className="flex gap-1"><button aria-label={`Edit ${service.name}`} onClick={() => openEdit(service)} className="rounded-lg p-2 text-muted hover:bg-blue-50 hover:text-brand"><Pencil className="h-4 w-4" /></button><button aria-label={`Remove ${service.name}`} onClick={() => { if (confirm(`Remove ${service.name}?`)) removePackage.mutate(service.id); }} className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>}</div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{service.description || 'No description recorded.'}</p>
                {isConfigured ? <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-surface p-3 text-center"><div><CalendarDays className="mx-auto h-4 w-4 text-brand" /><strong className="mt-1 block text-xs text-ink">{config.duration_days}D / {config.duration_nights ?? 0}N</strong></div><div><UsersRound className="mx-auto h-4 w-4 text-brand" /><strong className="mt-1 block text-xs text-ink">{config.minimum_pax}-{config.maximum_pax} pax</strong></div><div><span className="block text-[9px] font-black text-brand">ADULT</span><strong className="mt-1 block text-xs text-ink">₱{Number(service.adult_price ?? service.price).toLocaleString()}</strong></div></div> : <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">Legacy package needs destination, duration, traveler limits and itinerary before it can be sold.</div>}
                <Button disabled={!isConfigured && !canManage} onClick={() => isConfigured ? sellPackage(service) : openEdit(service, true)} className="mt-4 w-full">{isConfigured ? 'Book for a customer' : canManage ? 'Complete package and continue' : 'Package setup required'} <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </article>;
          })}
        </div>}
      </section>

      <Modal isOpen={formOpen} onClose={closeForm} title={editingId ? 'Edit private tour package' : 'Create private tour package'} size="lg" footer={null}>
        <form onSubmit={(event) => { event.preventDefault(); savePackage.mutate(); }} className="space-y-6 py-2">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">This form is only for private tour packages. It does not create joiner seats, charter allocations, school programs, or travel-assistance cases.</div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-muted md:col-span-2">Package name<input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bohol Private Family Escape" /></label>
            <label className="text-xs font-bold text-muted">Destination<input required className={inputClass} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></label>
            <label className="text-xs font-bold text-muted">Default origin / meetup<input className={inputClass} value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></label>
            <label className="text-xs font-bold text-muted">Duration days<input required min="1" type="number" className={inputClass} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} /></label>
            <label className="text-xs font-bold text-muted">Duration nights<input required min="0" type="number" className={inputClass} value={form.durationNights} onChange={(e) => setForm({ ...form, durationNights: e.target.value })} /></label>
            <label className="text-xs font-bold text-muted">Minimum travelers<input required min="1" type="number" className={inputClass} value={form.minimumPax} onChange={(e) => setForm({ ...form, minimumPax: e.target.value })} /></label>
            <label className="text-xs font-bold text-muted">Maximum travelers<input required min="1" type="number" className={inputClass} value={form.maximumPax} onChange={(e) => setForm({ ...form, maximumPax: e.target.value })} /></label>
            <label className="text-xs font-bold text-muted">Adult package rate<input required inputMode="decimal" className={inputClass} value={form.adultPrice} onChange={(e) => setForm({ ...form, adultPrice: formatMoneyInput(e.target.value) })} /></label>
            <label className="text-xs font-bold text-muted">Child package rate<input required inputMode="decimal" className={inputClass} value={form.childPrice} onChange={(e) => setForm({ ...form, childPrice: formatMoneyInput(e.target.value) })} /></label>
            <label className="text-xs font-bold text-muted">Valid from<input type="date" className={inputClass} value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} /></label>
            <label className="text-xs font-bold text-muted">Valid until<input type="date" min={form.validFrom || undefined} className={inputClass} value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></label>
            <label className="text-xs font-bold text-muted">Minimum booking lead time (days)<input min="0" type="number" className={inputClass} value={form.bookingLeadDays} onChange={(e) => setForm({ ...form, bookingLeadDays: e.target.value })} /></label>
            <label className="text-xs font-bold text-muted md:col-span-2">Customer-facing description<textarea required rows={3} className={textareaClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="text-xs font-bold text-muted md:col-span-2">Default itinerary (one day / item per line)<textarea required rows={5} className={textareaClass} value={form.itinerary} onChange={(e) => setForm({ ...form, itinerary: e.target.value })} placeholder="Day 1 - Arrival, transfer and city tour" /></label>
            <label className="text-xs font-bold text-muted">Inclusions (one per line)<textarea rows={5} className={textareaClass} value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} /></label>
            <label className="text-xs font-bold text-muted">Exclusions (one per line)<textarea rows={5} className={textareaClass} value={form.exclusions} onChange={(e) => setForm({ ...form, exclusions: e.target.value })} /></label>
            {canManage && <label className="text-xs font-bold text-muted md:col-span-2">Internal cost breakdown<textarea rows={3} className={textareaClass} value={form.costBreakdown} onChange={(e) => setForm({ ...form, costBreakdown: e.target.value })} /></label>}
          </div>

          <div><div className="flex items-center justify-between"><p className="text-xs font-bold text-muted">Package images</p><Button type="button" variant="ghost" onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.onchange = (event: any) => Array.from(event.target.files as FileList).forEach((file) => { const reader = new FileReader(); reader.onload = () => setForm((current) => ({ ...current, images: [...current.images, String(reader.result)] })); reader.readAsDataURL(file); }); input.click(); }}><ImagePlus className="h-4 w-4" /> Add images</Button></div><div className="mt-3 flex flex-wrap gap-3">{form.images.map((image, index) => <div key={`${image}-${index}`} className="relative h-20 w-24 overflow-hidden rounded-xl border border-border"><img src={imageUrl(image)} alt="" className="h-full w-full object-cover" /><button type="button" onClick={() => setForm((current) => ({ ...current, images: current.images.filter((_, itemIndex) => itemIndex !== index) }))} className="absolute right-1 top-1 rounded-full bg-slate-950/70 p-1 text-white"><X className="h-3 w-3" /></button></div>)}</div></div>
          <div className="flex justify-end gap-3 border-t border-border pt-5"><Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button><Button type="submit" disabled={savePackage.isPending}>{savePackage.isPending ? 'Saving...' : continueAfterSave ? 'Save and build customer booking' : editingId ? 'Save package' : 'Create package'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
