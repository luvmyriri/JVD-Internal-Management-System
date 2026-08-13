import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BusFront,
  CalendarDays,
  Download,
  FileCheck2,
  FileText,
  GraduationCap,
  Loader2,
  MapPin,
  ReceiptText,
  Route,
  ScrollText,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { educationalTourApi } from '../../api/educationalTours';
import { contractsApi } from '../../api/contracts';
import { salesOrderApi, type SalesDocumentType, type SalesOrder, type SalesOrderItem } from '../../api/salesOrders';

const money = (value: unknown) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value ?? 0));
const dateTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Not scheduled';
const readable = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'Not recorded';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(', ') || 'None';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};
const titleCase = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

function LoadingState() {
  return <div className="grid min-h-[420px] place-items-center"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-brand" /><p className="mt-3 text-sm font-bold text-muted">Loading linked Sales records...</p></div></div>;
}

function ErrorState({ retry }: { retry: () => void }) {
  return <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-900"><h1 className="text-lg font-black">Details could not be loaded</h1><p className="mt-2 text-sm">The transaction may have been removed or your role may not have access.</p><button type="button" onClick={retry} className="mt-5 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white">Try again</button></div>;
}

function ServiceFacts({ item }: { item: SalesOrderItem }) {
  const source = item.fulfillment ?? item.details_snapshot ?? {};
  const hidden = new Set(['id', 'created_at', 'updated_at', 'deleted_at', 'invoice_id', 'customer_id', 'created_by']);
  const facts = Object.entries(source)
    .filter(([key, value]) => !hidden.has(key) && value !== null && value !== '' && typeof value !== 'object')
    .slice(0, 10);

  return facts.length ? <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
    {facts.map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-[10px] font-black uppercase tracking-wider text-muted">{titleCase(key)}</dt><dd className="mt-1 break-words text-sm font-semibold text-ink">{readable(value)}</dd></div>)}
  </dl> : <p className="mt-3 text-xs text-muted">Operational particulars remain linked to the owning service workflow.</p>;
}

export function SalesTransactionDetails() {
  const navigate = useNavigate();
  const invoiceId = Number(useParams().invoiceId);
  const query = useQuery({
    queryKey: ['sales-transaction-details', invoiceId],
    queryFn: () => salesOrderApi.getByInvoice(invoiceId),
    enabled: Number.isFinite(invoiceId) && invoiceId > 0,
  });
  const generateContract = useMutation({
    mutationFn: () => contractsApi.generateForInvoice(invoiceId, true),
    onSuccess: async result => {
      toast.success(result.message);
      await query.refetch();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'The contract could not be generated.'),
  });
  const documentDownload = useMutation({
    mutationFn: async ({ order, document }: { order: SalesOrder; document: SalesDocumentType }) => {
      const preview = window.open('', '_blank');
      try {
        const blob = await salesOrderApi.getDocument(order.id, document);
        const url = URL.createObjectURL(blob);
        if (preview) preview.location.href = url;
        else window.open(url, '_blank');
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (error) {
        preview?.close();
        throw error;
      }
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'The document could not be generated.'),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState retry={() => query.refetch()} />;
  const order = query.data;
  const invoice = order.invoice;
  const tickets = invoice?.trip_tickets ?? [];
  const generate = (document: SalesDocumentType) => documentDownload.mutate({ order, document });
  const serviceTypes = new Set(order.items.map(item => item.service_type));

  return <div className="mx-auto max-w-[1500px] space-y-5 pb-12">
    <header className="rounded-3xl bg-[#071b33] p-7 text-white">
      <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to Sales</button>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black">{order.order_number}</h1><p className="mt-2 text-sm text-slate-300">One continuous record from checkout and invoice through fulfillment and Driver&apos;s Trip Ticket.</p></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase">{order.status.replaceAll('_', ' ')}</span>{invoice && <span className="rounded-full bg-emerald-400/15 px-3 py-2 text-xs font-black text-emerald-200">{invoice.invoice_number}</span>}</div></div>
    </header>

    <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
      <div className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-brand" /><h2 className="font-black text-ink">Customer</h2></div><p className="mt-4 text-lg font-black text-ink">{invoice?.customer_name || [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ') || 'Walk-in customer'}</p><p className="mt-2 break-words text-sm text-muted">{invoice?.customer_email || order.customer?.email || 'Email not recorded'}</p><p className="mt-1 text-sm text-muted">{invoice?.customer_contact || order.customer?.phone || 'Contact not recorded'}</p></div>
      <div className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-brand" /><h2 className="font-black text-ink">Billing</h2></div><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between text-muted"><span>Total</span><strong className="text-ink">{money(order.total_amount)}</strong></div><div className="flex justify-between text-muted"><span>Paid</span><strong className="text-ink">{money(order.amount_paid)}</strong></div><div className="flex justify-between border-t border-border pt-2 text-muted"><span>Balance</span><strong className="text-amber-700">{money(order.balance)}</strong></div></div></div>
      <div className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-center gap-2"><Download className="h-5 w-5 text-brand" /><h2 className="font-black text-ink">Linked documents</h2></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={() => generate('invoice')} disabled={!invoice || documentDownload.isPending} className="rounded-xl border border-border px-3 py-3 text-left text-xs font-black text-ink hover:border-brand disabled:opacity-40"><ReceiptText className="mr-2 inline h-4 w-4 text-brand" />Invoice PDF</button><button onClick={() => generate('quotation')} disabled={documentDownload.isPending} className="rounded-xl border border-border px-3 py-3 text-left text-xs font-black text-ink hover:border-brand"><ScrollText className="mr-2 inline h-4 w-4 text-brand" />Quotation</button><button onClick={() => generate('manifest')} disabled={documentDownload.isPending} className="rounded-xl border border-border px-3 py-3 text-left text-xs font-black text-ink hover:border-brand"><UsersRound className="mr-2 inline h-4 w-4 text-brand" />General manifest</button>{invoice?.contract ? <button onClick={() => generate('contract')} disabled={documentDownload.isPending} className="rounded-xl border border-border px-3 py-3 text-left text-xs font-black text-ink hover:border-brand"><FileCheck2 className="mr-2 inline h-4 w-4 text-brand" />Contract</button> : <button onClick={() => generateContract.mutate()} disabled={!invoice || generateContract.isPending} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-left text-xs font-black text-blue-800 hover:border-blue-400 disabled:opacity-40"><FileCheck2 className="mr-2 inline h-4 w-4" />{generateContract.isPending ? 'Generating contract…' : 'Generate & email contract'}</button>}{serviceTypes.has('joiner_tour') && <button onClick={() => generate('joiner-manifest')} disabled={documentDownload.isPending} className="rounded-xl border border-border px-3 py-3 text-left text-xs font-black text-ink hover:border-brand"><UsersRound className="mr-2 inline h-4 w-4 text-brand" />Joiner departure manifest</button>}{serviceTypes.has('bus_rental') && <><button onClick={() => generate('charter-confirmation')} disabled={documentDownload.isPending} className="rounded-xl border border-border px-3 py-3 text-left text-xs font-black text-ink hover:border-brand"><FileCheck2 className="mr-2 inline h-4 w-4 text-brand" />Charter confirmation</button><button onClick={() => generate('charter-dispatch')} disabled={documentDownload.isPending} className="rounded-xl border border-border px-3 py-3 text-left text-xs font-black text-ink hover:border-brand"><BusFront className="mr-2 inline h-4 w-4 text-brand" />Charter dispatch sheet</button></>}{serviceTypes.has('educational_tour') && <button onClick={() => generate('educational-manifest')} disabled={documentDownload.isPending} className="rounded-xl border border-border px-3 py-3 text-left text-xs font-black text-ink hover:border-brand"><UsersRound className="mr-2 inline h-4 w-4 text-brand" />Educational manifest</button>}</div></div>
    </section>

    <section className="rounded-2xl border border-border bg-surface"><div className="border-b border-border p-5"><h2 className="text-xl font-black text-ink">Travel services and fulfillment</h2><p className="mt-1 text-sm text-muted">The saved operational record for each service sold in this transaction.</p></div><div className="divide-y divide-border">{order.items.map(item => <article key={item.id} className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-ink">{item.title}</h3><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">{titleCase(item.service_type)}</span></div><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{item.description || 'No additional description recorded.'}</p></div><strong className="shrink-0 text-lg text-brand">{money(item.total_amount)}</strong></div><div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-muted"><span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{dateTime(item.scheduled_start)}</span>{item.traveler_count != null && <span className="flex items-center gap-1.5"><UsersRound className="h-4 w-4" />{item.traveler_count} travelers</span>}</div><ServiceFacts item={item} /></article>)}</div></section>

    <section className="rounded-2xl border border-border bg-surface"><div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black text-ink">Driver&apos;s Trip Ticket handoff</h2><p className="mt-1 text-sm text-muted">DTT records generated from the same Sales fulfillment and assignments.</p></div><button type="button" onClick={() => navigate('/logistics/trip-tickets')} className="rounded-xl bg-[#071b33] px-4 py-2.5 text-xs font-black text-white"><Route className="mr-2 inline h-4 w-4" />Open Trip Tickets</button></div>{tickets.length === 0 ? <div className="p-8 text-center"><BusFront className="mx-auto h-7 w-7 text-muted" /><p className="mt-3 font-black text-ink">No DTT is required or assigned yet</p><p className="mt-1 text-sm text-muted">Travel services receive a draft DTT after a valid vehicle/schedule fulfillment is confirmed.</p></div> : <div className="divide-y divide-border">{tickets.map(ticket => <div key={ticket.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"><div><p className="text-[10px] font-black uppercase text-muted">Control number</p><p className="mt-1 font-black text-ink">{ticket.control_no}</p></div><div><p className="text-[10px] font-black uppercase text-muted">Route</p><p className="mt-1 text-sm font-semibold text-ink">{ticket.pick_up || 'TBA'} → {ticket.drop_off || 'TBA'}</p></div><div><p className="text-[10px] font-black uppercase text-muted">Assignment</p><p className="mt-1 text-sm font-semibold text-ink">{ticket.bus?.plate_number || 'Vehicle TBA'} · {ticket.driver ? `${ticket.driver.first_name} ${ticket.driver.last_name}` : 'Driver TBA'}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase text-emerald-700">{ticket.status}</span></div>)}</div>}</section>
  </div>;
}

export function SalesServiceDetails() {
  const navigate = useNavigate();
  const serviceId = Number(useParams().serviceId);
  const query = useQuery({ queryKey: ['sales-service-details', serviceId], queryFn: () => salesOrderApi.getServiceDetails(serviceId), enabled: serviceId > 0 });
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState retry={() => query.refetch()} />;
  const { service, transactions } = query.data;
  const config = service.package_config ?? {};
  return <div className="mx-auto max-w-[1400px] space-y-5 pb-12"><header className="rounded-3xl bg-[#071b33] p-7 text-white"><button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" />Back</button><div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-black">{service.name}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{service.description || 'No package description recorded.'}</p></div><span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase">{titleCase(service.service_type || service.category || 'travel service')}</span></div></header><section className="grid gap-4 md:grid-cols-4"><div className="rounded-2xl border border-border bg-surface p-5"><MapPin className="h-5 w-5 text-brand" /><p className="mt-3 text-[10px] font-black uppercase text-muted">Destination</p><p className="mt-1 font-black text-ink">{config.destination || 'Flexible'}</p></div><div className="rounded-2xl border border-border bg-surface p-5"><CalendarDays className="h-5 w-5 text-brand" /><p className="mt-3 text-[10px] font-black uppercase text-muted">Duration</p><p className="mt-1 font-black text-ink">{config.duration_days ? `${config.duration_days} days / ${config.duration_nights ?? 0} nights` : 'Per schedule'}</p></div><div className="rounded-2xl border border-border bg-surface p-5"><UsersRound className="h-5 w-5 text-brand" /><p className="mt-3 text-[10px] font-black uppercase text-muted">Traveler range</p><p className="mt-1 font-black text-ink">{config.minimum_pax || 1}–{config.maximum_pax || service.max_pax || 'Flexible'} pax</p></div><div className="rounded-2xl border border-border bg-surface p-5"><ReceiptText className="h-5 w-5 text-brand" /><p className="mt-3 text-[10px] font-black uppercase text-muted">Published rate</p><p className="mt-1 font-black text-ink">{money(service.adult_price ?? service.price)}</p></div></section><section className="rounded-2xl border border-border bg-surface"><div className="border-b border-border p-5"><h2 className="text-xl font-black text-ink">Customers and linked transactions</h2><p className="mt-1 text-sm text-muted">Up to 100 recent sales records using this package or service.</p></div>{transactions.length === 0 ? <div className="p-10 text-center"><FileText className="mx-auto h-8 w-8 text-muted" /><p className="mt-3 font-black text-ink">No completed or draft transactions yet</p></div> : <div className="divide-y divide-border">{transactions.map(transaction => <button key={transaction.id} type="button" disabled={!transaction.order?.invoice?.id} onClick={() => navigate(`/sales/transactions/${transaction.order.invoice!.id}`)} className="grid w-full gap-3 p-5 text-left hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"><div><p className="font-black text-ink">{transaction.order.order_number}</p><p className="mt-1 text-xs text-muted">{transaction.order.invoice?.invoice_number || 'Invoice not issued'}</p></div><div><p className="font-bold text-ink">{[transaction.order.customer?.first_name, transaction.order.customer?.last_name].filter(Boolean).join(' ') || 'Walk-in customer'}</p><p className="mt-1 text-xs text-muted">{transaction.traveler_count ?? '—'} travelers</p></div><div><p className="font-bold text-ink">{dateTime(transaction.scheduled_start)}</p><p className="mt-1 text-xs uppercase text-muted">{transaction.status}</p></div><strong className="text-brand">{money(transaction.total_amount)}</strong></button>)}</div>}</section></div>;
}

export function EducationalProgramDetails() {
  const navigate = useNavigate();
  const programId = Number(useParams().programId);
  const query = useQuery({ queryKey: ['educational-program-details', programId], queryFn: () => educationalTourApi.programDetails(programId), enabled: programId > 0 });
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState retry={() => query.refetch()} />;
  const { program, bookings } = query.data;

  return <div className="mx-auto max-w-[1400px] space-y-5 pb-12">
    <header className="rounded-3xl bg-[#071b33] p-7 text-white"><button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" />Back</button><div className="mt-5"><span className="rounded-full bg-amber-400/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-200">Educational program</span><h1 className="mt-3 text-3xl font-black">{program.name}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{program.learning_objectives || 'No learning objectives recorded.'}</p></div></header>
    <section className="grid gap-4 md:grid-cols-4"><div className="rounded-2xl border border-border bg-surface p-5"><ReceiptText className="h-5 w-5 text-brand" /><p className="mt-3 text-[10px] font-black uppercase text-muted">Student rate</p><p className="mt-1 font-black text-ink">{money(program.student_price)}</p></div><div className="rounded-2xl border border-border bg-surface p-5"><UsersRound className="h-5 w-5 text-brand" /><p className="mt-3 text-[10px] font-black uppercase text-muted">Minimum group</p><p className="mt-1 font-black text-ink">{program.minimum_students} students</p></div><div className="rounded-2xl border border-border bg-surface p-5"><MapPin className="h-5 w-5 text-brand" /><p className="mt-3 text-[10px] font-black uppercase text-muted">Stops</p><p className="mt-1 font-black text-ink">{program.default_stops.length} destinations</p></div><div className="rounded-2xl border border-border bg-surface p-5"><CalendarDays className="h-5 w-5 text-brand" /><p className="mt-3 text-[10px] font-black uppercase text-muted">Bookings</p><p className="mt-1 font-black text-ink">{bookings.length} linked</p></div></section>
    <section className="rounded-2xl border border-border bg-surface"><div className="border-b border-border p-5"><h2 className="text-xl font-black text-ink">Schools, customers, invoices and schedules</h2><p className="mt-1 text-sm text-muted">Open an issued invoice to access its manifest, quotation, contract, payment and DTT handoff.</p></div>{bookings.length === 0 ? <div className="p-10 text-center"><GraduationCap className="mx-auto h-8 w-8 text-muted" /><p className="mt-3 font-black text-ink">No bookings for this program yet</p></div> : <div className="divide-y divide-border">{bookings.map(booking => <button key={booking.id} type="button" disabled={!booking.invoice?.id} onClick={() => booking.invoice?.id && navigate(`/sales/transactions/${booking.invoice.id}`)} className="grid w-full gap-3 p-5 text-left hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center"><div><p className="font-black text-ink">{booking.school_name}</p><p className="mt-1 text-xs text-muted">{booking.contact_person} · {booking.contact_email || booking.contact_number || 'No contact recorded'}</p></div><div><p className="font-bold text-ink">{booking.invoice?.invoice_number || 'Invoice not issued'}</p><p className="mt-1 text-xs uppercase text-muted">{booking.status}</p></div><div><p className="font-bold text-ink">{dateTime(booking.starts_at)}</p><p className="mt-1 text-xs text-muted">{booking.student_count + booking.chaperone_count} travelers</p></div><span className="text-xs font-black text-brand">Open details</span></button>)}</div>}</section>
  </div>;
}
