import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bus, CalendarPlus, ChevronLeft, ChevronRight, Clock3, Eye, ImagePlus, MapPinned, Pencil, Plus, TicketCheck, Trash2, UserRound, UsersRound, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import toast from 'react-hot-toast';
import { billingApi, type Service } from '../../api/billing';
import { catalogApi, type JoinerDeparture } from '../../api/catalog';

import { Button, Modal } from '../../components/ds';
import { formatMoneyInput, parseMoneyInput } from '../../utils';
import { resolveServiceType } from './fixedPackagesUtils';

const initialForm = { service_id: '', code: '', starts_at: '', ends_at: '', booking_cutoff_at: '', capacity: '12', status: 'draft', pickup_instructions: '', bus_id: '', driver_id: '' };
const initialProduct = { name: '', destination: '', description: '', adult_price: '', child_price: '', itinerary: '', inclusions: '', exclusions: '', images: [] as string[] };

const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.82): Promise<string> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    };
  });
};

const imageUrl = (path?: string) => {
  const value = path?.trim();
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.pathname.startsWith('/storage/')) {
        return `${url.pathname}${url.search}`;
      }
      return value;
    } catch {
      return value;
    }
  }

  const storagePath = value
    .replace(/\\/g, '/')
    .replace(/^(?:\/public\/|\/storage\/|public\/|storage\/)+/i, '');

  return `/storage/${storagePath}`;
};

function JoinerImage({ path, alt, className }: { path?: string; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);

  if (!path || failed) {
    return <div className="grid h-full place-items-center text-center text-muted"><div><ImagePlus className="mx-auto h-7 w-7" /><span className="mt-2 block text-[10px] font-bold">No product image yet</span></div></div>;
  }

  return <img src={imageUrl(path)} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />;
}

function ProductSlideshow({ images, alt, className }: { images?: string[]; alt: string; className?: string }) {
  const validImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const scrollRef = useRef<HTMLDivElement>(null);
  
  if (validImages.length === 0) return <JoinerImage path={undefined} alt={alt} className={className || ''} />;
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      scrollRef.current.scrollTo({ left: direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth, behavior: 'smooth' });
    }
  };

  return (
    <div className={`group relative ${className || ''}`}>
      <div ref={scrollRef} className="h-full w-full flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {validImages.map((path, i) => (
          <div key={i} className="h-full min-w-full snap-start relative flex-shrink-0">
            <JoinerImage path={path} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
      
      {validImages.length > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); scroll('left'); }} className="absolute left-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 z-10"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); scroll('right'); }} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 z-10"><ChevronRight className="h-4 w-4" /></button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 rounded-full bg-black/40 px-2.5 py-1.5 backdrop-blur-sm pointer-events-none">
            {validImages.map((_, i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-white/80 shadow-sm" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function JoinerDepartures() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [productForm, setProductForm] = useState(initialProduct);
  const [searchParams] = useSearchParams();
  const manageId = searchParams.get('manage_id');
  const [viewProduct, setViewProduct] = useState<Service | null>(null);
  const [viewDeparture, setViewDeparture] = useState<JoinerDeparture | null>(null);

  const { data: rawDepartures, isLoading } = useQuery({ queryKey: ['joiner-departures', 'upcoming'], queryFn: catalogApi.getJoinerDepartures });
  const departures = useMemo(() => {
    const list = Array.isArray(rawDepartures) ? rawDepartures : [];
    return list.filter(d => d && typeof d === 'object' && d.id);
  }, [rawDepartures]);

  useEffect(() => {
    if (manageId && departures.length > 0) {
      const match = departures.find(d => String(d.id) === manageId);
      if (match) {
        openEditDeparture(match);
      }
    }
  }, [manageId, departures]);


  const { data: servicesResponse, isLoading: productsLoading } = useQuery({ queryKey: ['billing-services'], queryFn: billingApi.getServices });
  const availabilityWindowValid = Boolean(form.starts_at && form.ends_at && form.ends_at > form.starts_at);
  const { data: resources, isFetching: resourcesLoading, isError: resourcesFailed, refetch: retryResources } = useQuery({ queryKey: ['joiner-resources', form.starts_at, form.ends_at], queryFn: () => catalogApi.getJoinerResources(form.starts_at, form.ends_at), enabled: availabilityWindowValid });
  const products = useMemo(() => {
    const raw = servicesResponse?.data?.data ?? servicesResponse?.data ?? [];
    return (Array.isArray(raw) ? raw : []).filter(service => service && typeof service === 'object' && service.id && resolveServiceType(service) === 'joiner_tour');
  }, [servicesResponse]);
  const requestedCapacity = Number(form.capacity) || 0;
  const buses = useMemo(() => (Array.isArray(resources?.buses) ? resources.buses : []).filter(b => b && typeof b === 'object' && b.id), [resources]);
  const drivers = useMemo(() => (Array.isArray(resources?.drivers) ? resources.drivers : []).filter(d => d && typeof d === 'object' && d.id), [resources]);
  const selectedBus = buses.find(bus => bus.id === Number(form.bus_id));
  const selectedDriver = drivers.find(driver => driver.id === Number(form.driver_id));
  const suitableBuses = buses.filter(bus => bus.available && (bus.seating_capacity ?? 0) >= requestedCapacity);
  const availableDrivers = drivers.filter(driver => driver.available);

  useEffect(() => {
    setForm(current => current.bus_id || current.driver_id ? { ...current, bus_id: '', driver_id: '' } : current);
  }, [form.starts_at, form.ends_at]);

  useEffect(() => {
    if (!form.service_id) return;
    const selectedProd = products.find(p => p?.id && String(p.id) === form.service_id);
    if (!selectedProd) return;
    const dest = selectedProd.package_config?.destination || selectedProd.name || '';
    const cleanWords = dest.replace(/[^A-Za-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const prefix = cleanWords.length >= 2
      ? cleanWords.map((w: string) => w[0]).join('').toUpperCase().slice(0, 4)
      : cleanWords[0]?.slice(0, 3).toUpperCase() || 'RUN';
    const datePart = form.starts_at ? form.starts_at.slice(0, 10) : '';
    const suggested = datePart ? `${prefix}-${datePart}` : `${prefix}-RUN`;
    setForm(current => {
      if (!current.code || /^[A-Z]{2,4}-/i.test(current.code)) {
        return { ...current, code: suggested };
      }
      return current;
    });
  }, [form.service_id, form.starts_at, products]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  const openCreateProduct = () => {
    setEditingProductId(null);
    setProductForm(initialProduct);
    setProductOpen(true);
  };

  const openEditProduct = (product: Service) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || '',
      destination: product.package_config?.destination || '',
      description: product.description || '',
      adult_price: product.adult_price ? String(product.adult_price) : product.price ? String(product.price) : '',
      child_price: product.child_price ? String(product.child_price) : '',
      itinerary: Array.isArray(product.package_config?.default_itinerary) ? product.package_config.default_itinerary.join('\n') : '',
      inclusions: product.inclusions || '',
      exclusions: product.exclusions || '',
      images: Array.isArray(product.images) ? product.images : [],
    });
    setProductOpen(true);
  };

  const saveProduct = useMutation({
    mutationFn: () => {
      const payload = {
        name: productForm.name.trim(),
        category: 'Joiners',
        service_type: 'joiner_tour',
        is_sales_catalog: true,
        description: productForm.description.trim(),
        price: Number(parseMoneyInput(productForm.adult_price)),
        adult_price: Number(parseMoneyInput(productForm.adult_price)),
        child_price: Number(parseMoneyInput(productForm.child_price || productForm.adult_price)),
        has_booking_fields: true,
        is_tour: false,
        inclusions: productForm.inclusions,
        exclusions: productForm.exclusions,
        package_config: {
          destination: productForm.destination.trim(),
          default_itinerary: productForm.itinerary.trim()
            ? productForm.itinerary.split('\n').map(item => item.trim()).filter(Boolean)
            : [productForm.destination.trim() || productForm.name.trim() || 'Joiner Tour Itinerary'],
        },
        images: productForm.images,
      };
      if (editingProductId) {
        return billingApi.updateService(editingProductId, payload);
      }
      return billingApi.createService(payload);
    },
    onSuccess: async (response: any) => {
      await queryClient.refetchQueries({ queryKey: ['billing-services'] });
      if (editingProductId) {
        toast.success('Joiner product updated');
      } else {
        const newId = response?.data?.data?.id ?? response?.data?.id ?? response?.id;
        if (newId) {
          setForm(current => ({ ...current, service_id: String(newId) }));
          setOpen(true);
        }
        toast.success('Joiner product created! Define its dated departure below.');
      }
      setProductOpen(false);
      setEditingProductId(null);
      setProductForm(initialProduct);
    },
    onError: (error: any) => {
      console.error("Save product error details:", error?.response?.data || error);
      const responseData = error?.response?.data;
      const errors = responseData?.errors as Record<string, string[]> | undefined;
      let errorMsg = '';
      if (errors && typeof errors === 'object') {
        const errorList = Object.entries(errors).map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`);
        if (errorList.length > 0) {
          errorMsg = errorList.join(' | ');
        }
      }
      if (!errorMsg) {
        errorMsg = responseData?.message ?? error?.message ?? `Joiner product could not be ${editingProductId ? 'updated' : 'created'}`;
      }
      toast.error(errorMsg);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: number) => billingApi.deleteService(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['billing-services'] });
      toast.success('Joiner product deleted');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Joiner product could not be deleted'),
  });

  const create = useMutation({
    mutationFn: () => catalogApi.createJoinerDeparture({ ...form, service_id: Number(form.service_id), capacity: Number(form.capacity), bus_id: form.bus_id ? Number(form.bus_id) : null, driver_id: form.driver_id ? Number(form.driver_id) : null }),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['joiner-departures'] });
      await queryClient.refetchQueries({ queryKey: ['sales-workspace-catalog'] });
      setOpen(false);
      setForm(initialForm);
      toast.success('Departure created');
    },
    onError: (error: any) => {
      const errors = error?.response?.data?.errors as Record<string, string[]> | undefined;
      toast.error(error?.response?.data?.message ?? (errors ? Object.values(errors)[0]?.[0] : undefined) ?? 'Departure could not be created');
    },
  });

  const [editingDepartureId, setEditingDepartureId] = useState<number | null>(null);

  const openEditDeparture = (departure: JoinerDeparture) => {
    setEditingDepartureId(departure.id);
    setForm({
      service_id: String(departure.service?.id || ''),
      code: departure.code || '',
      starts_at: departure.starts_at ? departure.starts_at.slice(0, 16) : '',
      ends_at: departure.ends_at ? departure.ends_at.slice(0, 16) : '',
      booking_cutoff_at: departure.booking_cutoff_at ? departure.booking_cutoff_at.slice(0, 16) : '',
      capacity: String(departure.capacity || 12),
      status: departure.status || 'published',
      pickup_instructions: departure.pickup_instructions || '',
      bus_id: departure.bus?.id ? String(departure.bus.id) : '',
      driver_id: departure.driver?.id ? String(departure.driver.id) : '',
    });
    setOpen(true);
  };

  const updateDeparture = useMutation({
    mutationFn: () => catalogApi.updateJoinerDeparture(editingDepartureId!, {
      starts_at: form.starts_at,
      ends_at: form.ends_at,
      booking_cutoff_at: form.booking_cutoff_at,
      capacity: Number(form.capacity),
      status: form.status,
      bus_id: form.bus_id ? Number(form.bus_id) : null,
      driver_id: form.driver_id ? Number(form.driver_id) : null,
      pickup_instructions: form.pickup_instructions,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['joiner-departures'] });
      setOpen(false);
      setEditingDepartureId(null);
      setForm(initialForm);
      toast.success('Departure updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Could not update departure');
    }
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!availabilityWindowValid) {
      toast.error('Return must be after the departure date and time.');
      return;
    }
    if (form.bus_id && (!selectedBus || !selectedBus.available || selectedBus.seating_capacity < requestedCapacity)) {
      toast.error('Select an available vehicle that can seat the full departure capacity.');
      return;
    }
    if (form.driver_id && (!selectedDriver || !selectedDriver.available)) {
      toast.error('Select a driver who is available for this exact departure interval.');
      return;
    }
    if (editingDepartureId) {
      updateDeparture.mutate();
    } else {
      create.mutate();
    }
  };


  const openDeparture = (product?: Service) => {
    setEditingDepartureId(null);
    setForm({ ...initialForm, service_id: product ? String(product.id) : '' });
    setOpen(true);
  };


  return <div className="w-full space-y-5 pb-12">
    <header className="flex flex-col gap-4 rounded-3xl bg-[#071b33] p-7 text-white md:flex-row md:items-end md:justify-between">
      <div><button onClick={() => navigate('/sales')} className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Sales workspace</button><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#75b8ff]">Joiner operations</p><h1 className="mt-2 text-3xl font-black">Fixed departure board</h1><p className="mt-2 text-sm text-slate-300">Publish one immutable schedule, then sell its finite seats to individual customers.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={openCreateProduct} className="!border !border-white/20 !text-white"><Plus className="h-4 w-4" /> New joiner product</Button>
        <Button onClick={() => openDeparture()} className="!bg-[#2f8cff] !text-white"><Plus className="h-4 w-4" /> Create departure</Button>
        <Button onClick={() => navigate('/sales/joiners/checkout')} className="!bg-emerald-600 !text-white"><TicketCheck className="h-4 w-4" /> Book joiner seats</Button>
      </div>
    </header>

    <section className="rounded-3xl border border-border bg-surface p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Joiner product library</p><h2 className="mt-1 text-xl font-black text-ink">Offers ready for a dated departure</h2><p className="mt-1 text-xs text-muted">Destination, rates, itinerary, inclusions, and images belong to the product. Finite seats belong to each dated departure.</p></div>
        <span className="text-xs font-bold text-muted">{products.length} product{products.length === 1 ? '' : 's'}</span>
      </div>
      {productsLoading ? <div className="mt-5 rounded-2xl bg-surface-alt p-8 text-center text-sm text-muted">Loading joiner products…</div> : products.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-border p-8 text-center"><MapPinned className="mx-auto h-8 w-8 text-muted" /><p className="mt-3 text-sm font-black text-ink">No joiner products yet</p><button onClick={openCreateProduct} className="mt-2 text-xs font-black text-brand">Create the first joiner offer</button></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {products.filter((product: any) => product?.id).map((product: Service) => <article key={product.id} className="overflow-hidden rounded-2xl border border-border bg-surface-alt">
          <div className="relative h-36 bg-slate-100 dark:bg-slate-800">
            <ProductSlideshow images={product.images} alt={product.name} className="h-full w-full" />
            <div className="absolute right-2 top-2 flex gap-1 rounded-xl bg-black/60 p-1 backdrop-blur-sm">
              <button type="button" onClick={() => openEditProduct(product)} title="Edit product" className="grid h-7 w-7 place-items-center rounded-lg text-white hover:bg-white/20 transition"><Pencil className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => { if (window.confirm(`Delete product "${product.name}"?`)) deleteProduct.mutate(product.id); }} title="Delete product" className="grid h-7 w-7 place-items-center rounded-lg text-rose-300 hover:bg-rose-500/30 hover:text-rose-100 transition"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="p-4"><p className="text-[9px] font-black uppercase tracking-widest text-brand">{product.package_config?.destination || 'Destination not set'}</p><h3 className="mt-1 font-black text-ink">{product.name}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{product.description || 'No product description.'}</p><div className="mt-3 flex justify-between rounded-xl bg-surface p-3 text-xs"><span><small className="block text-[8px] font-black uppercase text-muted">Adult</small><strong className="text-ink">₱{Number(product.adult_price ?? product.price).toLocaleString()}</strong></span><span className="text-right"><small className="block text-[8px] font-black uppercase text-muted">Child</small><strong className="text-ink">₱{Number(product.child_price ?? product.adult_price ?? product.price).toLocaleString()}</strong></span></div><Button onClick={() => openDeparture(product)} className="mt-3 w-full"><CalendarPlus className="h-4 w-4" /> Schedule departure</Button></div>
        </article>)}
      </div>}
    </section>

    <section>
      <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Dated inventory</p><h2 className="mt-1 text-xl font-black text-ink">Published and upcoming departures</h2></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {isLoading ? <p className="text-sm text-muted">Loading departure board…</p> : departures.length === 0 ? <div className="col-span-full rounded-3xl border border-dashed border-border bg-surface p-12 text-center"><CalendarPlus className="mx-auto h-9 w-9 text-muted" /><h2 className="mt-4 text-lg font-black text-ink">Create the first dated run</h2><p className="mt-1 text-sm text-muted">A Joiner product can have many separate departures.</p></div> : departures.filter((departure: any) => departure?.id).map(departure => {
        const available = Math.max(0, departure.available_seats_count ?? (departure.capacity - departure.held_count - departure.confirmed_count));
        return <article key={departure.id} className="overflow-hidden rounded-3xl border border-border bg-surface">
          <div className="h-32 bg-slate-100 dark:bg-slate-800"><JoinerImage path={Array.isArray(departure.service?.images) ? departure.service.images.find(Boolean) : undefined} alt={departure.service?.name || departure.code || 'Joiner Tour'} className="h-full w-full object-cover" /></div>
          <div className="p-5">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">{departure.code}</p><h2 className="mt-2 text-lg font-black text-ink">{departure.service?.name || departure.code || 'Joiner Tour'}</h2></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${departure.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{departure.status}</span></div>
          <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-surface-alt p-4 text-xs"><span className="flex gap-2 text-muted"><Clock3 className="h-4 w-4" />{new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(departure.starts_at))}</span><span className="flex justify-end gap-2 font-black text-ink"><UsersRound className="h-4 w-4" />{available} available</span></div>
          <div className="mt-4 flex gap-2 text-[10px] font-bold uppercase tracking-wider text-muted"><span>{departure.confirmed_count} confirmed</span><span>·</span><span>{departure.held_count} held</span><span>·</span><span>{departure.capacity} capacity</span></div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => openEditDeparture(departure)} className="!border !border-amber-200 !text-amber-700 hover:!bg-amber-50 dark:!border-amber-800 dark:!text-amber-400">
              <Pencil className="h-3.5 w-3.5" /> Manage Run
            </Button>
            <Button variant="ghost" onClick={() => navigate(`/sales/departures/${departure.id}`)}>
              <Eye className="h-3.5 w-3.5" /> Details
            </Button>
            {departure.status === 'published' && available > 0 && (
              <Button onClick={() => navigate(`/sales/joiners/checkout?departure=${departure.id}`)}>
                <TicketCheck className="h-3.5 w-3.5" /> Book seats
              </Button>
            )}
          </div>
          </div>
        </article>;
      })}
      </div>
    </section>

    <Modal isOpen={open} onClose={() => { setOpen(false); setEditingDepartureId(null); }} title={editingDepartureId ? "Manage / Edit fixed departure" : "Create fixed departure"} size="lg" footer={null}>

      <form onSubmit={submit} className="space-y-5 py-2">
        <div className="rounded-2xl bg-blue-50 p-4 text-xs leading-5 text-blue-900 dark:bg-blue-950 dark:text-blue-100">Dates entered here belong to this departure. Customers can select the run, but cannot change its schedule.</div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm font-bold text-ink md:col-span-2">Joiner product<select required value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal"><option value="">Select product…</option>{products.filter((product: any) => product?.id).map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="space-y-1.5 text-sm font-bold text-ink">Departure code<input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="SGD-2026-08-03" className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal" /></label>
          <label className="space-y-1.5 text-sm font-bold text-ink">Capacity<input required min="1" max="100" type="number" value={form.capacity} onChange={e => setForm(current => ({ ...current, capacity: e.target.value, bus_id: '' }))} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal" /></label>
          <label className="space-y-1.5 text-sm font-bold text-ink">Departure<input required type="datetime-local" value={form.starts_at} onChange={e => setForm(current => ({ ...current, starts_at: e.target.value, bus_id: '', driver_id: '' }))} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal" /></label>
          <label className="space-y-1.5 text-sm font-bold text-ink">Return<input required type="datetime-local" value={form.ends_at} onChange={e => setForm(current => ({ ...current, ends_at: e.target.value, bus_id: '', driver_id: '' }))} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal" /></label>
          <label className="space-y-1.5 text-sm font-bold text-ink">Booking cutoff<input required type="datetime-local" value={form.booking_cutoff_at} onChange={e => setForm({ ...form, booking_cutoff_at: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal" /></label>
          <label className="space-y-1.5 text-sm font-bold text-ink">Initial status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal"><option value="draft">Draft</option><option value="published">Published for sale</option></select></label>
          <label className="space-y-1.5 text-sm font-bold text-ink"><span className="flex items-center gap-2"><Bus className="h-4 w-4" /> Vehicle</span><select value={form.bus_id} onChange={e => setForm(current => ({ ...current, bus_id: e.target.value }))} disabled={!availabilityWindowValid || resourcesLoading || resourcesFailed || !resources} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal disabled:cursor-not-allowed disabled:opacity-60"><option value="">{!availabilityWindowValid ? 'Set valid dates first' : resourcesLoading ? 'Checking availability…' : suitableBuses.length === 0 ? 'No suitable vehicle — assign later' : 'Assign later'}</option>{(resources?.buses ?? []).filter((bus: any) => bus?.id).map(bus => { const tooSmall = (bus?.seating_capacity ?? 0) < requestedCapacity; return <option key={bus.id} value={bus.id} disabled={!bus.available || tooSmall}>{bus.plate_number} · {bus.model} · {bus.seating_capacity} seats{!bus.available ? ' · unavailable' : tooSmall ? ' · too small' : ''}</option>; })}</select></label>
          <label className="space-y-1.5 text-sm font-bold text-ink"><span className="flex items-center gap-2"><UserRound className="h-4 w-4" /> Driver</span><select value={form.driver_id} onChange={e => setForm(current => ({ ...current, driver_id: e.target.value }))} disabled={!availabilityWindowValid || resourcesLoading || resourcesFailed || !resources} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal disabled:cursor-not-allowed disabled:opacity-60"><option value="">{!availabilityWindowValid ? 'Set valid dates first' : resourcesLoading ? 'Checking availability…' : availableDrivers.length === 0 ? 'No available driver — assign later' : 'Assign later'}</option>{(resources?.drivers ?? []).filter((driver: any) => driver?.id).map(driver => <option key={driver.id} value={driver.id} disabled={!driver.available}>{driver.first_name} {driver.last_name}{!driver.available ? ' · unavailable' : ''}</option>)}</select></label>
          <div className="md:col-span-2 rounded-xl bg-surface-alt px-3 py-2 text-xs text-muted">{!form.starts_at || !form.ends_at ? 'Set departure and return first; vehicle and driver availability is checked for that exact interval.' : !availabilityWindowValid ? 'Return must be after departure.' : resourcesLoading ? 'Checking the centralized logistics allocation calendar…' : resourcesFailed ? <span className="font-bold text-red-600">Availability could not be loaded. <button type="button" onClick={() => retryResources()} className="underline">Retry</button></span> : resources ? `${suitableBuses.length} vehicle(s) can seat ${requestedCapacity} people and ${availableDrivers.length} driver(s) are available for this exact schedule.` : 'Availability has not been checked yet.'}</div>
          <label className="space-y-1.5 text-sm font-bold text-ink md:col-span-2">Pickup instructions<input value={form.pickup_instructions} onChange={e => setForm({ ...form, pickup_instructions: e.target.value })} placeholder="Assembly point and reporting time" className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal" /></label>
        </div>
        <div className="flex justify-end gap-3 border-t border-border pt-5"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create departure'}</Button></div>
      </form>
    </Modal>

    <Modal isOpen={productOpen} onClose={() => setProductOpen(false)} title={editingProductId ? "Edit joiner tour product" : "Create joiner tour product"} size="lg" footer={null}>
      <form onSubmit={event => { event.preventDefault(); saveProduct.mutate(); }} className="space-y-5 py-2">
        <div className="rounded-2xl bg-emerald-50 p-4 text-xs leading-5 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">This defines only the joiner offer and adult/child rates. Its actual date, bus or van, driver, seat inventory and cutoff are created per departure.</div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-bold text-muted">Joiner product name<input required value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label>
          <label className="text-xs font-bold text-muted">Destination<input required value={productForm.destination} onChange={e => setProductForm({ ...productForm, destination: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label>
          <label className="text-xs font-bold text-muted">Adult seat rate<input required value={productForm.adult_price} onChange={e => setProductForm({ ...productForm, adult_price: formatMoneyInput(e.target.value) })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label>
          <label className="text-xs font-bold text-muted">Child seat rate<input required value={productForm.child_price} onChange={e => setProductForm({ ...productForm, child_price: formatMoneyInput(e.target.value) })} className="mt-1 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm" /></label>
          <label className="text-xs font-bold text-muted md:col-span-2">Description<textarea required value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-sm" /></label>
          <label className="text-xs font-bold text-muted md:col-span-2">Default itinerary (one day or stop per line)<textarea required value={productForm.itinerary} onChange={e => setProductForm({ ...productForm, itinerary: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-sm" /></label>
          <label className="text-xs font-bold text-muted">Inclusions (one per line)<textarea value={productForm.inclusions} onChange={e => setProductForm({ ...productForm, inclusions: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-sm" /></label>
          <label className="text-xs font-bold text-muted">Exclusions (one per line)<textarea value={productForm.exclusions} onChange={e => setProductForm({ ...productForm, exclusions: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-sm" /></label>
          <div className="md:col-span-2"><div className="flex items-center justify-between"><p className="text-xs font-bold text-muted">Product images</p><Button type="button" variant="ghost" onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.onchange = async (event: any) => { const files = Array.from(event.target.files as FileList); for (const file of files) { try { const res = await billingApi.uploadServiceImage(file); const uploadedPath = res?.data?.path ?? res?.data?.url; if (uploadedPath) { setProductForm(current => ({ ...current, images: [...current.images, uploadedPath] })); } } catch { const compressed = await compressImage(file); setProductForm(current => ({ ...current, images: [...current.images, compressed] })); } } }; input.click(); }}><ImagePlus className="h-4 w-4" /> Add images</Button></div>{productForm.images.length > 0 && <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">{productForm.images.map((image, index) => <div key={`${image.slice(0, 20)}-${index}`} className="relative overflow-hidden rounded-xl"><img src={imageUrl(image)} alt="" className="h-24 w-full object-cover" /><button type="button" onClick={() => setProductForm(current => ({ ...current, images: current.images.filter((_, itemIndex) => itemIndex !== index) }))} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white"><X className="h-3 w-3" /></button></div>)}</div>}</div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border pt-5"><Button type="button" variant="ghost" onClick={() => setProductOpen(false)}>Cancel</Button><Button type="submit" disabled={saveProduct.isPending}>{saveProduct.isPending ? (editingProductId ? 'Saving...' : 'Creating...') : (editingProductId ? 'Save changes' : 'Create joiner product')}</Button></div>
      </form>
    </Modal>
  </div>;
}
