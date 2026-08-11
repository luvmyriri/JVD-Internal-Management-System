import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarRange, Check, ChevronRight, CircleDollarSign, Clock3, FilePlus2, MapPinned, PackagePlus, Plane, Plus, ReceiptText, Route, Search, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { catalogApi, type CatalogService, type ServiceType } from '../../api/catalog';
import { customerApi } from '../../api/customers';
import { salesOrderApi, type SalesOrder } from '../../api/salesOrders';

type Field = { key: string; label: string; type?: 'text'|'number'|'date'|'datetime-local'|'textarea'; required?: boolean; placeholder?: string };
type FormState = Record<string, string>;

const fields: Record<string, Field[]> = {
  private_tour: [
    {key:'package_name',label:'Package name',required:true},{key:'destination',label:'Destination',required:true},
    {key:'starts_at',label:'Tour starts',type:'datetime-local',required:true},{key:'ends_at',label:'Tour ends',type:'datetime-local',required:true},
    {key:'passenger_count',label:'Travelers',type:'number',required:true},{key:'pickup_location',label:'Pickup location'},
    {key:'itinerary_text',label:'Itinerary — one day title per line',type:'textarea',required:true},{key:'inclusions_text',label:'Inclusions — one per line',type:'textarea'},
    {key:'exclusions_text',label:'Exclusions — one per line',type:'textarea'},{key:'special_requests',label:'Special requests',type:'textarea'},
  ],
  visa_assistance: [
    {key:'applicant_name',label:'Applicant name',required:true},{key:'destination_country',label:'Destination country',required:true},
    {key:'visa_type',label:'Visa type',required:true},{key:'travel_purpose',label:'Travel purpose'},
    {key:'intended_departure',label:'Intended departure',type:'date'},{key:'appointment_at',label:'Appointment',type:'datetime-local'},
    {key:'passport_number',label:'Passport number'},{key:'requirements_text',label:'Document requirements — one per line',type:'textarea'},
  ],
  passport_assistance: [
    {key:'applicant_name',label:'Applicant name',required:true},{key:'application_type',label:'Application type (new, renewal, lost, damaged, correction)',required:true},
    {key:'appointment_at',label:'DFA appointment',type:'datetime-local'},{key:'site',label:'DFA site'},
    {key:'target_release_date',label:'Target release',type:'date'},{key:'requirements_text',label:'Document requirements — one per line',type:'textarea'},
  ],
  flight_booking: [
    {key:'trip_type',label:'Trip type (one_way, round_trip, multi_city)',required:true},{key:'origin',label:'Origin airport code',required:true},
    {key:'destination',label:'Destination airport code',required:true},{key:'departure_at',label:'Departure',type:'datetime-local',required:true},
    {key:'return_at',label:'Return',type:'datetime-local'},{key:'airline',label:'Airline'},{key:'flight_number',label:'Flight number'},
    {key:'pnr',label:'PNR / record locator'},{key:'fare_class',label:'Fare class'},{key:'baggage_allowance',label:'Baggage allowance'},
    {key:'ticketing_deadline',label:'Ticketing deadline',type:'datetime-local'},{key:'passenger_count',label:'Passengers',type:'number',required:true},
    {key:'passengers_text',label:'Passenger names — one per line',type:'textarea',required:true},{key:'supplier_cost',label:'Supplier cost',type:'number'},
  ],
  accommodation_booking: [
    {key:'property_name',label:'Property name',required:true},{key:'city',label:'City',required:true},{key:'check_in',label:'Check-in',type:'date',required:true},
    {key:'check_out',label:'Check-out',type:'date',required:true},{key:'room_type',label:'Room type',required:true},{key:'room_count',label:'Rooms',type:'number',required:true},
    {key:'adult_count',label:'Adults',type:'number',required:true},{key:'child_count',label:'Children',type:'number'},
    {key:'confirmation_number',label:'Supplier confirmation'},{key:'free_cancellation_until',label:'Free cancellation until',type:'datetime-local'},
    {key:'guest_names_text',label:'Lead guest names — one per line',type:'textarea',required:true},{key:'meal_plan_text',label:'Meal plan — one per line',type:'textarea'},
    {key:'supplier_cost',label:'Supplier cost',type:'number'},
  ],
  ticket_booking: [
    {key:'transport_mode',label:'Mode (ferry, bus, rail)',required:true},{key:'operator_name',label:'Operator',required:true},
    {key:'origin',label:'Origin',required:true},{key:'destination',label:'Destination',required:true},{key:'departure_at',label:'Departure',type:'datetime-local',required:true},
    {key:'arrival_at',label:'Arrival',type:'datetime-local'},{key:'booking_reference',label:'Booking reference'},
    {key:'passenger_count',label:'Passengers',type:'number',required:true},{key:'passengers_text',label:'Passenger names — one per line',type:'textarea',required:true},
    {key:'supplier_cost',label:'Supplier cost',type:'number'},
  ],
  activity_booking: [
    {key:'activity_name',label:'Activity',required:true},{key:'location',label:'Location',required:true},
    {key:'session_starts_at',label:'Session starts',type:'datetime-local',required:true},{key:'session_ends_at',label:'Session ends',type:'datetime-local'},
    {key:'capacity',label:'Session capacity',type:'number',required:true},{key:'participant_count',label:'Participants',type:'number',required:true},
    {key:'supplier_reference',label:'Supplier reference'},{key:'participants_text',label:'Participant names — one per line',type:'textarea'},
    {key:'requirements_text',label:'Participant requirements — one per line',type:'textarea'},{key:'supplier_cost',label:'Supplier cost',type:'number'},
  ],
  transfer_service: [
    {key:'pickup_at',label:'Pickup time',type:'datetime-local',required:true},{key:'dropoff_at',label:'Expected drop-off',type:'datetime-local'},
    {key:'pickup_location',label:'Pickup location',required:true},{key:'dropoff_location',label:'Drop-off location',required:true},
    {key:'passenger_count',label:'Passengers',type:'number',required:true},{key:'luggage_count',label:'Luggage pieces',type:'number'},
    {key:'flight_or_trip_reference',label:'Flight / trip reference'},{key:'passenger_names_text',label:'Passenger names — one per line',type:'textarea'},
    {key:'dispatch_notes',label:'Dispatch notes',type:'textarea'},
  ],
  custom_arrangement: [
    {key:'arrangement_name',label:'Arrangement name',required:true},{key:'target_starts_at',label:'Target starts',type:'datetime-local'},
    {key:'target_ends_at',label:'Target ends',type:'datetime-local'},{key:'supplier_reference',label:'Supplier reference'},
    {key:'requirements',label:'Customer requirements',type:'textarea',required:true},{key:'deliverables_text',label:'Deliverables — one per line',type:'textarea',required:true},
    {key:'supplier_cost',label:'Supplier cost',type:'number'},
  ],
};

const defaults: Record<string, FormState> = {
  passport_assistance: { application_type: 'new' }, flight_booking: { trip_type: 'round_trip', passenger_count: '1' },
  accommodation_booking: { room_count: '1', adult_count: '1', child_count: '0' }, ticket_booking: { transport_mode: 'ferry', passenger_count: '1' },
  activity_booking: { participant_count: '1' }, transfer_service: { passenger_count: '1', luggage_count: '0' }, private_tour: { passenger_count: '1' },
};

const lines = (value = '') => value.split('\n').map(v => v.trim()).filter(Boolean);
const numericKeys = new Set(['passenger_count','room_count','adult_count','child_count','capacity','participant_count','luggage_count','supplier_cost']);

function detailsFor(type: string, state: FormState): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  Object.entries(state).forEach(([key,value]) => { if (value !== '' && !key.endsWith('_text')) clean[key] = numericKeys.has(key) ? Number(value) : value; });
  if (type === 'private_tour') Object.assign(clean, { itinerary: lines(state.itinerary_text).map((title,index) => ({day:index+1,title})), inclusions: lines(state.inclusions_text), exclusions: lines(state.exclusions_text) });
  if (['visa_assistance','passport_assistance'].includes(type)) clean.requirements_snapshot = lines(state.requirements_text).map(name => ({name,required:true}));
  if (type === 'flight_booking' || type === 'ticket_booking') clean.passengers = lines(state.passengers_text).map(name => ({name}));
  if (type === 'accommodation_booking') Object.assign(clean, { guest_names: lines(state.guest_names_text), meal_plan: lines(state.meal_plan_text) });
  if (type === 'activity_booking') Object.assign(clean, { participants: lines(state.participants_text).map(name => ({name})), requirements: lines(state.requirements_text) });
  if (type === 'transfer_service') clean.passenger_names = lines(state.passenger_names_text);
  if (type === 'custom_arrangement') clean.deliverables = lines(state.deliverables_text);
  return clean;
}

const money = (value: number | string | undefined) => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(Number(value ?? 0));
const customerName = (customer: any) => [customer.first_name,customer.middle_name,customer.last_name,customer.suffix].filter(Boolean).join(' ');
const apiError = (error: any, fallback: string) => {
  const errors = error.response?.data?.errors as Record<string, string[]> | undefined;
  return error.response?.data?.message || (errors ? Object.values(errors)[0]?.[0] : undefined) || fallback;
};

export default function SalesOrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [type, setType] = useState(params.get('type') || 'private_tour');
  const [serviceId, setServiceId] = useState('');
  const [form, setForm] = useState<FormState>(defaults[type] ?? {});
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [payment, setPayment] = useState({payment_method:'Cash',payment_type:'full',amount_received:''});
  const { data: catalog } = useQuery({queryKey:['sales-workspace-catalog'],queryFn:catalogApi.getWorkspaceCatalog});
  const { data: customerResponse } = useQuery({queryKey:['customers','order-workspace'],queryFn:() => customerApi.list({per_page:100})});
  const { data: recent } = useQuery({queryKey:['sales-orders','open'],queryFn:() => salesOrderApi.list({per_page:30})});
  const customers = customerResponse?.data?.data ?? [];
  const services = useMemo(() => (catalog?.services ?? []).filter(service => !service.service_type || service.service_type === type),[catalog,type]);
  const selectedService = services.find(service => service.id === Number(serviceId));
  const activeTypes = (catalog?.service_types ?? []).filter(t => fields[t.code]);

  const refresh = async (id: number) => { const next = await salesOrderApi.get(id); setOrder(next); queryClient.invalidateQueries({queryKey:['sales-orders']}); };
  const create = useMutation({mutationFn:() => salesOrderApi.create({customer_id:Number(customerId)}),onSuccess:value=>{setOrder(value);toast.success('Order draft created');queryClient.invalidateQueries({queryKey:['sales-orders']});},onError:(e:any)=>toast.error(e.response?.data?.message ?? 'Select a customer to start the order.')});
  const add = useMutation({mutationFn:() => salesOrderApi.addItem(order!.id,{service_type:type,service_id:Number(serviceId),quantity:Number(quantity),unit_price:Number(unitPrice || selectedService?.price || 0),details:detailsFor(type,form)}),onSuccess:async()=>{await refresh(order!.id);setForm(defaults[type] ?? {});setQuantity('1');toast.success('Service added to itinerary');},onError:(e:any)=>toast.error(apiError(e,'Complete the service details.'))});
  const remove = useMutation({mutationFn:(itemId:number)=>salesOrderApi.removeItem(order!.id,itemId),onSuccess:async()=>{await refresh(order!.id);toast.success('Service removed');}});
  const confirm = useMutation({mutationFn:()=>salesOrderApi.confirm(order!.id,{...payment,amount_received:Number(payment.amount_received)}),onSuccess:value=>{setOrder(value);toast.success('Order confirmed and invoiced');queryClient.invalidateQueries({queryKey:['sales-orders']});},onError:(e:any)=>toast.error(apiError(e,'Order could not be confirmed.'))});

  const chooseType = (code:string) => { setType(code); setServiceId(''); setUnitPrice(''); setForm(defaults[code] ?? {}); };

  return <div className="mx-auto max-w-[1700px] space-y-4 pb-12">
    <header className="overflow-hidden rounded-[28px] bg-[#10243e] text-white shadow-[0_24px_70px_rgba(16,36,62,.18)]">
      <div className="grid lg:grid-cols-[1fr_auto]">
        <div className="p-7 md:p-9"><p className="text-[10px] font-black uppercase tracking-[.28em] text-[#84b9ff]">Agent-assisted order desk</p><h1 className="mt-2 text-3xl font-black md:text-4xl">One customer. One itinerary. Every service.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Build the trip line by line, preserve each service’s rules, then issue one synchronized invoice to Accounting and Operations.</p></div>
        <div className="flex min-w-72 items-center gap-4 border-t border-white/10 bg-[#173251] px-7 py-5 lg:border-l lg:border-t-0"><Route className="h-8 w-8 text-[#ffbd57]"/><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Active order</p><p className="mt-1 font-black">{order?.order_number ?? 'Not started'}</p><p className="text-xs text-[#8ad8bd]">{order?.status ?? 'Choose a customer'}</p></div></div>
      </div>
    </header>

    <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_330px]">
      <aside className="space-y-4">
        <section className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-brand"/><h2 className="text-sm font-black text-ink">Customer</h2></div>
          <select value={customerId} onChange={e=>setCustomerId(e.target.value)} disabled={!!order} className="mt-3 w-full rounded-xl border border-border bg-surface-alt px-3 py-3 text-sm text-ink outline-none focus:border-brand"><option value="">Select customer…</option>{customers.map((c:any)=><option key={c.id} value={c.id}>{customerName(c)}</option>)}</select>
          {!order && <button onClick={()=>create.mutate()} disabled={!customerId || create.isPending} className="mt-3 w-full rounded-xl bg-[#2563eb] px-3 py-3 text-xs font-black text-white disabled:opacity-50"><Plus className="mr-1 inline h-4 w-4"/>Start order</button>}
          {order?.customer && <div className="mt-3 rounded-xl bg-[#edf5ff] p-3 text-xs text-[#173251]"><p className="font-black">{customerName(order.customer)}</p><p className="mt-1 text-slate-600">{order.customer.email || order.customer.phone || 'Contact not recorded'}</p></div>}
        </section>
        <section className="rounded-2xl border border-border bg-surface p-3"><div className="flex items-center gap-2 px-1 py-2"><Clock3 className="h-4 w-4 text-muted"/><h2 className="text-xs font-black uppercase tracking-wider text-muted">Recent orders</h2></div><div className="max-h-[520px] space-y-1 overflow-y-auto">{(recent?.data ?? []).map((entry:any)=><button key={entry.id} onClick={()=>refresh(entry.id)} className={`w-full rounded-xl px-3 py-3 text-left transition ${order?.id===entry.id?'bg-[#10243e] text-white':'hover:bg-surface-alt text-ink'}`}><p className="text-xs font-black">{entry.order_number}</p><p className={`mt-1 text-[10px] ${order?.id===entry.id?'text-slate-300':'text-muted'}`}>{entry.customer?customerName(entry.customer):'Walk-in'} · {entry.status}</p></button>)}</div></section>
      </aside>

      <main className="min-w-0 space-y-4">
        <section className="rounded-2xl border border-border bg-surface p-5 md:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-brand">Service composer</p><h2 className="mt-1 text-xl font-black text-ink">Add the next part of the trip</h2></div><span className="rounded-full bg-[#eef7f3] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#087f5b]"><ShieldCheck className="mr-1 inline h-3 w-3"/>Rules checked at confirmation</span></div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">{activeTypes.map((entry:ServiceType)=><button key={entry.code} onClick={()=>chooseType(entry.code)} className={`min-w-max rounded-xl border px-3 py-2 text-xs font-black transition ${type===entry.code?'border-[#2563eb] bg-[#edf5ff] text-[#174ea6]':'border-border text-muted hover:border-[#9bbcf1]'}`}>{entry.name}</button>)}</div>
          <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-xs font-bold text-muted">Catalog product<select value={serviceId} onChange={e=>{setServiceId(e.target.value);const product=services.find(s=>s.id===Number(e.target.value));setUnitPrice(product?String(product.price):'');}} className="mt-1.5 w-full rounded-xl border border-border bg-surface-alt px-3 py-3 text-sm text-ink outline-none focus:border-brand"><option value="">Choose product…</option>{services.map((service:CatalogService)=><option key={service.id} value={service.id}>{service.name} · {money(service.price)}</option>)}</select></label><label className="text-xs font-bold text-muted">Selling price<input value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} type="number" min="0" className="mt-1.5 w-full rounded-xl border border-border bg-surface-alt px-3 py-3 text-sm text-ink outline-none focus:border-brand"/></label></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">{(fields[type] ?? []).map(field=><label key={field.key} className={`text-xs font-bold text-muted ${field.type==='textarea'?'md:col-span-2':''}`}>{field.label}{field.required&&<span className="text-red-500"> *</span>}{field.type==='textarea'?<textarea value={form[field.key]??''} onChange={e=>setForm({...form,[field.key]:e.target.value})} rows={3} placeholder={field.placeholder} className="mt-1.5 w-full rounded-xl border border-border bg-surface-alt px-3 py-3 text-sm text-ink outline-none focus:border-brand"/>:<input value={form[field.key]??''} onChange={e=>setForm({...form,[field.key]:e.target.value})} type={field.type??'text'} required={field.required} placeholder={field.placeholder} className="mt-1.5 w-full rounded-xl border border-border bg-surface-alt px-3 py-3 text-sm text-ink outline-none focus:border-brand"/>}</label>)}</div>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-5"><label className="flex items-center gap-2 text-xs font-bold text-muted">Quantity<input value={quantity} onChange={e=>setQuantity(e.target.value)} type="number" min=".01" className="w-20 rounded-lg border border-border bg-surface-alt px-2 py-2 text-ink"/></label><button onClick={()=>add.mutate()} disabled={!order || !serviceId || add.isPending || !!order?.invoice_id} className="rounded-xl bg-[#2563eb] px-5 py-3 text-xs font-black text-white shadow-lg shadow-blue-600/15 disabled:opacity-40"><PackagePlus className="mr-2 inline h-4 w-4"/>Add to itinerary</button></div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#c47a13]">Itinerary rail</p><h2 className="mt-1 text-xl font-black text-ink">Services in this order</h2></div><span className="text-xs font-bold text-muted">{order?.items?.length ?? 0} lines</span></div>
          <div className="relative mt-6 space-y-3 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-[#b8c7d9]">{!order?.items?.length?<div className="rounded-2xl border border-dashed border-border p-9 text-center"><MapPinned className="mx-auto h-7 w-7 text-muted"/><p className="mt-3 text-sm font-black text-ink">The itinerary is empty</p><p className="mt-1 text-xs text-muted">Choose a service above and enter its operational details.</p></div>:order.items.map((item,index)=><article key={item.id} className="relative ml-0 grid grid-cols-[40px_1fr_auto] items-start gap-3 rounded-2xl border border-border bg-surface p-4"><span className="relative z-10 grid h-10 w-10 place-items-center rounded-full bg-[#10243e] text-xs font-black text-white">{index+1}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-ink">{item.title}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600">{item.service_type.replaceAll('_',' ')}</span></div><p className="mt-1 text-xs text-muted">{item.scheduled_start?new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.scheduled_start)):'Schedule managed by case workflow'}{item.traveler_count?` · ${item.traveler_count} travelers`:''}</p><p className="mt-2 text-sm font-black text-[#174ea6]">{money(item.total_amount)}</p></div>{!order.invoice_id&&<button onClick={()=>remove.mutate(item.id)} className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>}</article>)}</div>
        </section>
      </main>

      <aside><section className="sticky top-4 rounded-2xl border border-border bg-surface p-5 shadow-[0_18px_50px_rgba(16,36,62,.08)]"><div className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-brand"/><h2 className="font-black text-ink">Order summary</h2></div><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between text-muted"><span>Services</span><strong className="text-ink">{money(order?.subtotal)}</strong></div><div className="flex justify-between text-muted"><span>VAT</span><strong className="text-ink">{money(order?.tax_amount)}</strong></div><div className="flex justify-between border-t border-border pt-4 text-lg font-black text-ink"><span>Total</span><span className="text-[#174ea6]">{money(order?.total_amount)}</span></div></div>
          {order && !order.invoice_id && <div className="mt-6 space-y-3 border-t border-border pt-5"><label className="block text-xs font-bold text-muted">Payment method<select value={payment.payment_method} onChange={e=>setPayment({...payment,payment_method:e.target.value})} className="mt-1.5 w-full rounded-xl border border-border bg-surface-alt px-3 py-3 text-sm text-ink"><option>Cash</option><option>GCash</option><option>Card</option></select></label><label className="block text-xs font-bold text-muted">Payment type<select value={payment.payment_type} onChange={e=>setPayment({...payment,payment_type:e.target.value})} className="mt-1.5 w-full rounded-xl border border-border bg-surface-alt px-3 py-3 text-sm text-ink"><option value="full">Full payment</option><option value="downpayment">Downpayment</option></select></label><label className="block text-xs font-bold text-muted">Amount received<input value={payment.amount_received} onChange={e=>setPayment({...payment,amount_received:e.target.value})} type="number" min="0" className="mt-1.5 w-full rounded-xl border border-border bg-surface-alt px-3 py-3 text-sm text-ink"/></label><button onClick={()=>confirm.mutate()} disabled={!order.items?.length || confirm.isPending} className="w-full rounded-xl bg-[#087f5b] px-4 py-3.5 text-xs font-black text-white disabled:opacity-40"><Check className="mr-2 inline h-4 w-4"/>Confirm and issue invoice</button></div>}
          {order?.invoice && <div className="mt-6 rounded-2xl bg-[#eef7f3] p-4 text-[#075e45]"><p className="text-[10px] font-black uppercase tracking-wider">Invoice issued</p><p className="mt-1 font-black">{order.invoice.invoice_number}</p><p className="mt-1 text-xs">{order.invoice.status} · Balance {money(order.balance)}</p><div className="mt-3 flex flex-wrap gap-3"><button onClick={() => navigate(`/sales/transactions/${order.invoice!.id}`)} className="inline-flex items-center text-xs font-black underline">Open details and documents <ChevronRight className="h-3 w-3"/></button>{order.invoice.payment_url&&<a href={order.invoice.payment_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-black underline">Open PayMongo checkout <ChevronRight className="h-3 w-3"/></a>}</div></div>}
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-5 text-center text-[10px] font-bold text-muted"><div><CalendarRange className="mx-auto mb-1 h-4 w-4"/>Dates</div><div><CircleDollarSign className="mx-auto mb-1 h-4 w-4"/>Accounting</div><div><Plane className="mx-auto mb-1 h-4 w-4"/>Fulfillment</div></div>
        </section></aside>
    </div>
  </div>;
}
