import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  BusFront,
  CalendarDays,
  ClipboardList,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  ReceiptText,
  Route,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { billingApi } from '../../api/billing';
import { contractsApi } from '../../api/contracts';
import { salesOrderApi, type SalesDocumentType } from '../../api/salesOrders';
import { transactionsApi, type TransactionDocumentAvailability, type TransactionRecord } from '../../api/transactions';
import RefundWorkflowPanel from '../../components/accounting/RefundWorkflowPanel';
import { useAuth } from '../../context/AuthContext';
import {
  formatTransactionMoney,
  transactionContractLabel,
  transactionEngine,
  transactionEngineLabel,
  transactionPaymentTerms,
  transactionServiceDate,
} from '../../utils/transactions';

const formatDate = (value?: string | null, withTime = false) => value
  ? new Intl.DateTimeFormat('en-PH', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value))
  : 'Not recorded';

const readable = (value?: string | null) => value
  ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : 'Not recorded';

const factValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'Not recorded';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('en-PH');
  if (typeof value === 'string') return readable(value);
  return null;
};

const scalarFacts = (source?: Record<string, unknown> | null, limit = 10) => Object.entries(source ?? {})
  .map(([key, value]) => ({ key, value: factValue(value) }))
  .filter((fact): fact is { key: string; value: string } => Boolean(fact.value))
  .slice(0, limit);

const paymentTone = (status: string) => {
  if (status === 'paid') return 'bg-emerald-400/15 text-emerald-100';
  if (status === 'partial') return 'bg-blue-400/15 text-blue-100';
  if (status === 'refunded') return 'bg-amber-400/15 text-amber-100';
  if (status === 'overdue') return 'bg-rose-400/15 text-rose-100';
  return 'bg-amber-400/15 text-amber-100';
};

const documentDefinitions: Array<{
  key: keyof TransactionDocumentAvailability;
  type: SalesDocumentType;
  label: string;
  description: string;
}> = [
  { key: 'invoice', type: 'invoice', label: 'Invoice', description: 'Customer billing document' },
  { key: 'quotation', type: 'quotation', label: 'Quotation', description: 'Professional price proposal' },
  { key: 'manifest', type: 'manifest', label: 'General manifest', description: 'Consolidated traveler list' },
  { key: 'contract', type: 'contract', label: 'Contract', description: 'Signed service agreement' },
  { key: 'joiner_manifest', type: 'joiner-manifest', label: 'Joiner manifest', description: 'Departure passenger and seat list' },
  { key: 'charter_confirmation', type: 'charter-confirmation', label: 'Charter confirmation', description: 'Customer charter confirmation' },
  { key: 'charter_dispatch', type: 'charter-dispatch', label: 'Charter dispatch', description: 'Fleet and driver dispatch sheet' },
  { key: 'educational_manifest', type: 'educational-manifest', label: 'Educational manifest', description: 'School group and vehicle manifest' },
];

function sourceLinks(transaction: TransactionRecord) {
  const booking = transaction.booking;
  const links: Array<{ label: string; to: string; icon: typeof ArrowRight }> = [];
  if (booking?.type === 'joiner_tour' && booking.parent_id) {
    links.push({ label: 'Open departure', to: `/sales/departures/${booking.parent_id}`, icon: UsersRound });
  } else if (booking?.type === 'bus_rental' && booking.id) {
    links.push({ label: 'Manage charter booking', to: `/sales/charters?manage_id=${booking.id}`, icon: BusFront });
  } else if (booking?.type === 'educational_tour' && booking.id) {
    links.push({ label: 'Manage educational booking', to: `/sales/educational-tours?manage_id=${booking.id}`, icon: GraduationCap });
    if (booking.parent_id) links.push({ label: 'Open educational program', to: `/sales/educational-programs/${booking.parent_id}/details`, icon: FileText });
  } else if (booking?.type === 'private_tour' && booking.product_id) {
    links.push({ label: 'Open package details', to: `/sales/services/${booking.product_id}/details`, icon: FileText });
  } else if (transaction.navigation.engine?.path) {
    links.push({ label: 'Open source record', to: transaction.navigation.engine.path, icon: ExternalLink });
  }
  return links;
}

function LoadingState() {
  return <div className="grid min-h-[480px] place-items-center"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-brand motion-reduce:animate-none" /><p className="mt-3 text-sm font-bold text-muted">Loading the connected transaction record…</p></div></div>;
}

function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-950 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
      <h1 className="text-lg font-black">Transaction details could not be loaded</h1>
      <p className="mt-2 text-sm">The record may not exist, or your role may not have permission to view it.</p>
      <button type="button" onClick={retry} className="mt-5 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2">Try again</button>
    </div>
  );
}

export default function TransactionDetails() {
  const invoiceId = Number(useParams().invoiceId);
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const role = user?.role || '';
  const canOpenSalesRecords = [
    'super_admin',
    'executive_vice_president',
    'accounting_executive',
    'reservation_officer',
    'office_staff',
  ].includes(role) || hasPermission('sales', 'can_view');
  const canCreateAccounting = [
    'super_admin',
    'executive_vice_president',
    'accounting_executive',
    'reservation_officer',
    'office_staff',
  ].includes(role) || hasPermission('accounting', 'can_create');
  const canEditAccounting = [
    'super_admin',
    'executive_vice_president',
    'accounting_executive',
    'reservation_officer',
    'office_staff',
  ].includes(role) || hasPermission('accounting', 'can_edit');
  const canOpenCustomerProfile = [
    'super_admin',
    'executive_vice_president',
    'operations_manager',
    'reservation_officer',
    'office_staff',
    'corporate_secretary',
  ].includes(role) || hasPermission('travel', 'can_view');
  const [email, setEmail] = useState('');

  const query = useQuery({
    queryKey: ['transaction-360', invoiceId],
    queryFn: () => transactionsApi.get(invoiceId),
    enabled: Number.isInteger(invoiceId) && invoiceId > 0,
  });

  useEffect(() => {
    if (query.data?.customer.email) setEmail(query.data.customer.email);
  }, [query.data?.customer.email]);

  const documentMutation = useMutation({
    mutationFn: async ({ orderId, document }: { orderId: number; document: SalesDocumentType }) => {
      const preview = window.open('', '_blank');
      try {
        const blob = await salesOrderApi.getDocument(orderId, document);
        const url = URL.createObjectURL(blob);
        if (preview) preview.location.href = url;
        else window.open(url, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (error) {
        preview?.close();
        throw error;
      }
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'The document could not be generated.'),
  });

  const emailMutation = useMutation({
    mutationFn: () => billingApi.sendEmail(invoiceId, email.trim()),
    onSuccess: () => toast.success(`Invoice sent to ${email.trim()}`),
    onError: (error: any) => toast.error(error?.response?.data?.message || 'The invoice email could not be sent.'),
  });

  const contractMutation = useMutation({
    mutationFn: () => contractsApi.generateForInvoice(invoiceId, true),
    onSuccess: async (result) => {
      toast.success(result.message);
      await Promise.all([
        query.refetch(),
        queryClient.invalidateQueries({ queryKey: ['transactions-360'] }),
      ]);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'The contract could not be generated.'),
  });

  const transaction = query.data;
  const detailedBooking = transaction?.booking_contexts?.[0];
  const contextFacts = useMemo(
    () => scalarFacts(detailedBooking?.details ?? transaction?.booking?.context),
    [detailedBooking?.details, transaction?.booking?.context],
  );

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !transaction) return <ErrorState retry={() => query.refetch()} />;

  const engine = transactionEngine(transaction);
  const engineLinks = canOpenSalesRecords ? sourceLinks(transaction) : [];
  const collectionPath = transaction.collection
    ? `/accounting/collections?collection_id=${transaction.collection.id}`
    : null;
  const customerPath = canOpenCustomerProfile && transaction.customer.id
    ? `/operations/customers/${transaction.customer.id}`
    : null;
  const availableDocuments = canOpenSalesRecords
    ? documentDefinitions.filter((document) => transaction.documents[document.key])
    : [];
  const orderId = transaction.order?.id ?? transaction.identifiers.sales_order_id;
  const payments = transaction.payments ?? [];
  const credits = transaction.credits ?? [];
  const refunds = transaction.refunds ?? [];
  const passengers = transaction.passengers ?? [];
  const tickets = transaction.trip_tickets ?? [];
  const vehicleAssignments = Array.isArray(detailedBooking?.details?.vehicles)
    ? detailedBooking.details.vehicles.filter((assignment): assignment is Record<string, unknown> => Boolean(assignment && typeof assignment === 'object'))
    : [];

  return (
    <main className="jvd mx-auto w-full max-w-[1550px] space-y-5 pb-12">
      <header className="overflow-hidden rounded-2xl bg-[#071b33] text-white shadow-lg shadow-slate-950/10">
        <div className="p-6 lg:p-8">
          <Link to="/accounting/transactions" className="inline-flex items-center gap-2 rounded-lg text-xs font-black text-blue-100 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-blue-300">
            <ArrowLeft className="h-4 w-4" /> Back to transactions
          </Link>
          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">{transactionEngineLabel(engine)}</span>
                <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${paymentTone(transaction.payment_state)}`}>{readable(transaction.payment_state)}</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">Invoice {readable(transaction.invoice.status)}</span>
              </div>
              <h1 className="mt-4 break-words text-3xl font-black tracking-[-0.025em] lg:text-4xl">{transaction.product.primary_name}</h1>
              <p className="mt-2 text-sm text-blue-100">{transaction.transaction_number} · Invoice {transaction.invoice.number}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {engineLinks.slice(0, 1).map(({ label, to, icon: Icon }) => (
                <Link key={to} to={to} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 px-4 text-xs font-black text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-blue-300"><Icon className="h-4 w-4" />{label}</Link>
              ))}
              {collectionPath && transaction.money.balance > 0 && (
                <Link to={collectionPath} className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-black text-amber-950 outline-none hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-200"><Banknote className="h-4 w-4" />Open collection</Link>
              )}
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t border-white/10 bg-white/[0.04] sm:grid-cols-4">
          <div className="px-5 py-4"><dt className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Total</dt><dd className="mt-1 text-lg font-black">{formatTransactionMoney(transaction.money.total, transaction.money.currency)}</dd></div>
          <div className="border-l border-white/10 px-5 py-4"><dt className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Received</dt><dd className="mt-1 text-lg font-black text-emerald-200">{formatTransactionMoney(transaction.money.gross_collected, transaction.money.currency)}</dd></div>
          <div className="border-t border-white/10 px-5 py-4 sm:border-l sm:border-t-0"><dt className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Net collected</dt><dd className="mt-1 text-lg font-black">{formatTransactionMoney(transaction.money.net_collected, transaction.money.currency)}</dd></div>
          <div className="border-l border-t border-white/10 px-5 py-4 sm:border-t-0"><dt className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Balance</dt><dd className="mt-1 text-lg font-black text-amber-200">{formatTransactionMoney(transaction.money.balance, transaction.money.currency)}</dd></div>
        </dl>
      </header>

      <nav aria-label="Transaction sections" className="sticky top-2 z-20 overflow-x-auto rounded-xl border border-border bg-surface p-1.5 shadow-md shadow-slate-950/5">
        <div className="flex min-w-max gap-1">
          {[['overview', 'Overview'], ['travelers', 'Travelers'], ['financial', 'Financial activity'], ['documents', 'Documents'], ['operations', 'Operations']].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-lg px-3 py-2 text-xs font-black text-muted outline-none hover:bg-surface-alt hover:text-ink focus-visible:ring-2 focus-visible:ring-brand">{label}</a>
          ))}
        </div>
      </nav>

      <section id="overview" aria-labelledby="overview-title" className="scroll-mt-24 space-y-5">
        <div className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-brand" /><h2 id="overview-title" className="text-xl font-black text-ink">Transaction overview</h2></div>
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-brand" /><h3 className="font-black text-ink">Customer</h3></div>
            {customerPath ? <Link to={customerPath} className="mt-4 block rounded text-lg font-black text-ink outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand">{transaction.customer.name}</Link> : <p className="mt-4 text-lg font-black text-ink">{transaction.customer.name}</p>}
            <p className="mt-2 break-all text-sm text-muted">{transaction.customer.email || 'Email not recorded'}</p>
            <p className="mt-1 text-sm text-muted">{transaction.customer.contact || 'Contact not recorded'}</p>
          </article>
          <article className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-brand" /><h3 className="font-black text-ink">Booking & schedule</h3></div>
            <p className="mt-4 text-lg font-black text-ink">{transaction.booking?.reference || 'No typed booking reference'}</p>
            <p className="mt-2 text-sm text-muted">{formatDate(transactionServiceDate(transaction), Boolean(transaction.schedule.starts_at))}</p>
            <p className="mt-1 text-sm text-muted">{transaction.schedule.traveler_count ?? 0} traveler{transaction.schedule.traveler_count === 1 ? '' : 's'} · {readable(transaction.booking?.status)}</p>
          </article>
          <article className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand" /><h3 className="font-black text-ink">Contract & payment terms</h3></div>
            <p className="mt-4 text-lg font-black text-ink">{readable(transactionContractLabel(transaction))}</p>
            <p className="mt-2 text-sm text-muted">{transaction.contract.number || 'No contract number'} · {transactionPaymentTerms(transaction)}</p>
            <p className="mt-1 text-sm text-muted">{transaction.money.payment_methods.join(', ') || 'No posted payment method'}</p>
          </article>
        </div>

        <article className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border p-5"><h3 className="font-black text-ink">Products and services availed</h3><p className="mt-1 text-sm text-muted">The invoiced lines that make up this transaction.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <caption className="sr-only">Invoice product and service lines</caption>
              <thead className="border-b border-border bg-surface-alt text-xs text-muted"><tr><th className="px-5 py-3 font-bold">Product or service</th><th className="px-5 py-3 font-bold">Type</th><th className="px-5 py-3 text-right font-bold">Qty</th><th className="px-5 py-3 text-right font-bold">Amount</th></tr></thead>
              <tbody className="divide-y divide-border">
                {transaction.product.items.map((item) => {
                  const detail = transaction.items_detail?.find((candidate) => candidate.service_id === item.service_id || candidate.id === item.id);
                  const facts = scalarFacts(detail?.operational_summary, 8);
                  return <tr key={item.id}><td className="px-5 py-4"><p className="font-black text-ink">{item.name}</p>{(detail?.description || item.description) && <p className="mt-1 max-w-[65ch] text-xs text-muted">{detail?.description || item.description}</p>}{facts.length > 0 && <dl className="mt-3 grid max-w-3xl gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">{facts.map((fact) => <div key={fact.key}><dt className="text-[9px] font-black uppercase tracking-wider text-muted">{readable(fact.key)}</dt><dd className="mt-0.5 whitespace-normal text-xs font-semibold text-ink">{fact.value}</dd></div>)}</dl>}</td><td className="px-5 py-4 text-muted">{readable(item.service_type)}</td><td className="px-5 py-4 text-right font-bold text-ink">{item.quantity}</td><td className="px-5 py-4 text-right font-black text-ink">{formatTransactionMoney(item.total_amount, transaction.money.currency)}</td></tr>;
                })}
              </tbody>
              <tfoot className="border-t border-border bg-surface-alt"><tr><td colSpan={3} className="px-5 py-3 text-right text-xs font-bold text-muted">Subtotal + tax</td><td className="px-5 py-3 text-right font-black text-ink">{formatTransactionMoney(transaction.money.subtotal + transaction.money.tax, transaction.money.currency)}</td></tr></tfoot>
            </table>
          </div>
        </article>
        {transaction.notes && <aside className="rounded-xl bg-surface-alt p-4 text-sm leading-6 text-ink"><strong>Transaction notes:</strong> {transaction.notes}</aside>}
      </section>

      <section id="travelers" aria-labelledby="travelers-title" className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-brand" /><h2 id="travelers-title" className="text-xl font-black text-ink">Travelers and passengers</h2></div><p className="mt-1 text-sm text-muted">Names linked specifically to this booking and invoice.</p></div><span className="text-xs font-black text-muted">{passengers.length || transaction.schedule.traveler_count || 0} recorded</span></div>
        {passengers.length === 0 ? (
          <div className="p-10 text-center"><UsersRound className="mx-auto h-7 w-7 text-muted" /><p className="mt-3 font-black text-ink">No named passenger roster is linked yet</p><p className="mt-1 text-sm text-muted">Use the source booking to complete the manifest for this transaction.</p>{engineLinks[0] && <Link to={engineLinks[0].to} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#071b33] px-4 py-2.5 text-xs font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-brand">{engineLinks[0].label}<ArrowRight className="h-4 w-4" /></Link>}</div>
        ) : (
          <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
            {passengers.map((passenger, index) => (
              <article key={passenger.id ?? `${passenger.name}-${index}`} className="p-5 sm:border-b sm:border-border">
                <div className="flex items-start justify-between gap-3"><div><p className="font-black text-ink">{passenger.name}</p><p className="mt-1 text-xs text-muted">{readable(passenger.type)}</p></div>{passenger.seat_code && <span className="rounded-lg bg-[#071b33] px-2.5 py-1.5 text-xs font-black text-white">Seat {passenger.seat_code}</span>}</div>
                <p className="mt-3 text-xs text-muted">{passenger.emergency_contact ? `Emergency: ${passenger.emergency_contact}` : 'Emergency contact not recorded'}</p>
                {(passenger.dietary_restrictions || passenger.special_needs) && <p className="mt-1 text-xs text-muted">{passenger.dietary_restrictions || passenger.special_needs}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="financial" aria-labelledby="financial-title" className="scroll-mt-24 space-y-5">
        <div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-brand" /><h2 id="financial-title" className="text-xl font-black text-ink">Financial activity</h2></div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
          <article className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex items-end justify-between gap-3 border-b border-border p-5"><div><h3 className="font-black text-ink">Posted payments</h3><p className="mt-1 text-sm text-muted">Append-only payment evidence, including PayMongo references.</p></div>{collectionPath && <Link to={collectionPath} className="text-xs font-black text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand">Open collection</Link>}</div>
            {payments.length === 0 ? <div className="p-9 text-center"><Banknote className="mx-auto h-6 w-6 text-muted" /><p className="mt-3 font-black text-ink">No payment has been posted</p><p className="mt-1 text-sm text-muted">The outstanding amount remains in Collections.</p></div> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><caption className="sr-only">Posted transaction payments</caption><thead className="border-b border-border bg-surface-alt text-xs text-muted"><tr><th className="px-5 py-3 font-bold">Date</th><th className="px-5 py-3 font-bold">Method</th><th className="px-5 py-3 font-bold">Payment reference</th><th className="px-5 py-3 text-right font-bold">Amount</th><th className="px-5 py-3 text-right font-bold">Balance after</th></tr></thead><tbody className="divide-y divide-border">{payments.map((payment) => <tr key={payment.id}><td className="px-5 py-4 text-ink">{formatDate(payment.date)}</td><td className="px-5 py-4 font-bold text-ink">{payment.method}</td><td className="max-w-[260px] px-5 py-4"><code className="block break-all text-xs text-muted">{payment.paymongo_payment_id || `PAY-${payment.id}`}</code></td><td className="px-5 py-4 text-right font-black text-emerald-700 dark:text-emerald-300">{formatTransactionMoney(payment.amount, transaction.money.currency)}</td><td className="px-5 py-4 text-right font-bold text-ink">{payment.balance_after == null ? '—' : formatTransactionMoney(payment.balance_after, transaction.money.currency)}</td></tr>)}</tbody></table></div>
            )}
          </article>
          <aside className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="font-black text-ink">Financial references</h3>
            <dl className="mt-4 space-y-4 text-sm">
              <div><dt className="text-xs font-bold text-muted">Payment evidence</dt><dd className="mt-1 font-black text-ink">{readable(transaction.money.evidence_source)}</dd></div>
              <div><dt className="text-xs font-bold text-muted">Invoice payment ID</dt><dd className="mt-1 break-all font-mono text-xs font-semibold text-ink">{transaction.provider?.invoice_payment_id || 'Not recorded'}</dd></div>
              <div><dt className="text-xs font-bold text-muted">Due date</dt><dd className="mt-1 font-black text-ink">{formatDate(transaction.money.due_date)}</dd></div>
              <div><dt className="text-xs font-bold text-muted">Credited</dt><dd className="mt-1 font-black text-ink">{formatTransactionMoney(transaction.money.credited, transaction.money.currency)}</dd></div>
              <div><dt className="text-xs font-bold text-muted">Refunded</dt><dd className="mt-1 font-black text-amber-800 dark:text-amber-200">{formatTransactionMoney(transaction.money.refunded, transaction.money.currency)}</dd></div>
            </dl>
          </aside>
        </div>

        {(credits.length > 0 || refunds.length > 0) && (
          <article className="rounded-2xl border border-border bg-surface p-5"><h3 className="font-black text-ink">Credits and refunds</h3><div className="mt-4 grid gap-3 lg:grid-cols-2">{credits.map((credit) => <div key={`credit-${credit.id}`} className="rounded-xl bg-surface-alt p-4"><div className="flex items-center justify-between gap-3"><p className="font-black text-ink">{credit.number || `Credit ${credit.id}`}</p><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">{readable(credit.status)}</span></div><p className="mt-2 text-sm font-black text-ink">{formatTransactionMoney(credit.amount, transaction.money.currency)}</p><p className="mt-1 text-xs text-muted">{credit.reason || 'No reason recorded'}</p></div>)}{refunds.map((refund) => <div key={`refund-${refund.id}`} className="rounded-xl bg-amber-50 p-4 dark:bg-amber-950/20"><div className="flex items-center justify-between gap-3"><p className="font-black text-ink">{refund.number || `Refund ${refund.id}`}</p><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-900 dark:bg-amber-900 dark:text-amber-100">{readable(refund.status)}</span></div><p className="mt-2 text-sm font-black text-amber-800 dark:text-amber-200">{formatTransactionMoney(refund.amount, transaction.money.currency)}</p><p className="mt-1 text-xs text-muted">{refund.method || 'Method pending'} · {refund.reason || 'No reason recorded'}</p>{refund.provider_refund_id && <code className="mt-2 block break-all text-[11px] text-muted">{refund.provider_refund_id}</code>}</div>)}</div></article>
        )}

        {(transaction.payment_schedule?.length ?? 0) > 0 && (
          <article className="overflow-hidden rounded-2xl border border-border bg-surface"><div className="border-b border-border p-5"><h3 className="font-black text-ink">Payment schedule</h3><p className="mt-1 text-sm text-muted">Contracted installment dates and their current status.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><caption className="sr-only">Transaction payment schedule</caption><thead className="border-b border-border bg-surface-alt text-xs text-muted"><tr><th className="px-5 py-3 font-bold">Installment</th><th className="px-5 py-3 font-bold">Due date</th><th className="px-5 py-3 font-bold">Status</th><th className="px-5 py-3 text-right font-bold">Amount due</th></tr></thead><tbody className="divide-y divide-border">{transaction.payment_schedule?.map((installment) => <tr key={installment.id}><td className="px-5 py-4 font-black text-ink">#{installment.installment_number}</td><td className="px-5 py-4 text-ink">{formatDate(installment.due_date)}</td><td className="px-5 py-4 font-bold text-ink">{readable(installment.status)}</td><td className="px-5 py-4 text-right font-black text-ink">{formatTransactionMoney(installment.amount_due, transaction.money.currency)}</td></tr>)}</tbody></table></div></article>
        )}

        {transaction.kind === 'sales' && <div id="refunds" className="scroll-mt-24"><RefundWorkflowPanel invoiceId={transaction.invoice.id} /></div>}
      </section>

      <section id="documents" aria-labelledby="documents-title" className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2"><Download className="h-5 w-5 text-brand" /><h2 id="documents-title" className="text-xl font-black text-ink">Documents and customer email</h2></div>
        <p className="mt-1 text-sm text-muted">Generate documents from the same saved package, passenger, invoice, and assignment data.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {availableDocuments.map((document) => (
            <button key={document.key} type="button" disabled={!orderId || documentMutation.isPending} onClick={() => orderId && documentMutation.mutate({ orderId, document: document.type })} className="min-h-24 rounded-xl border border-border p-4 text-left outline-none transition hover:border-brand hover:bg-blue-50/50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-blue-950/20">
              <FileCheck2 className="h-5 w-5 text-brand" /><span className="mt-3 block text-sm font-black text-ink">{document.label}</span><span className="mt-1 block text-xs leading-5 text-muted">{document.description}</span>
            </button>
          ))}
          {canCreateAccounting && transaction.contract.required && !transaction.contract.id && (
            <button type="button" onClick={() => contractMutation.mutate()} disabled={contractMutation.isPending} className="min-h-24 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left outline-none transition hover:border-blue-500 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand dark:border-blue-900 dark:bg-blue-950/20"><ShieldCheck className="h-5 w-5 text-brand" /><span className="mt-3 block text-sm font-black text-ink">Generate and email contract</span><span className="mt-1 block text-xs leading-5 text-muted">Create the contract required by this sale.</span></button>
          )}
        </div>
        {availableDocuments.length === 0 && (!transaction.contract.required || !canCreateAccounting) && <p className="mt-5 rounded-xl bg-surface-alt p-4 text-sm text-muted">No document action is available for this record and your current access.</p>}
        {canEditAccounting && <form onSubmit={(event) => { event.preventDefault(); if (!email.trim()) return toast.error('Enter a customer email address.'); emailMutation.mutate(); }} className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs font-bold text-muted">Customer email
            <div className="relative mt-1.5"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="customer@example.com" className="h-11 w-full rounded-xl border border-border bg-surface-alt pl-10 pr-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" /></div>
          </label>
          <button type="submit" disabled={emailMutation.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#071b33] px-4 text-xs font-black text-white outline-none hover:bg-[#0d3159] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"><Mail className="h-4 w-4" />{emailMutation.isPending ? 'Sending…' : 'Email invoice'}</button>
        </form>}
      </section>

      <section id="operations" aria-labelledby="operations-title" className="scroll-mt-24 space-y-5">
        <div className="flex items-center gap-2"><Route className="h-5 w-5 text-brand" /><h2 id="operations-title" className="text-xl font-black text-ink">Booking, fleet, driver, and trip tickets</h2></div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <article className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="font-black text-ink">Source booking</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div><dt className="text-xs font-bold text-muted">Booking type</dt><dd className="mt-1 font-black text-ink">{readable(transaction.booking?.type)}</dd></div>
              <div><dt className="text-xs font-bold text-muted">Reference</dt><dd className="mt-1 font-black text-ink">{transaction.booking?.reference || 'Not recorded'}</dd></div>
              <div><dt className="text-xs font-bold text-muted">Status</dt><dd className="mt-1 font-black text-ink">{readable(transaction.booking?.status)}</dd></div>
              {contextFacts.map((fact) => <div key={fact.key}><dt className="text-xs font-bold text-muted">{readable(fact.key)}</dt><dd className="mt-1 break-words font-black text-ink">{fact.value}</dd></div>)}
            </dl>
            {vehicleAssignments.length > 0 && <div className="mt-5 border-t border-border pt-4"><p className="text-xs font-black uppercase tracking-wider text-muted">Fleet allocation</p><div className="mt-3 space-y-2">{vehicleAssignments.map((assignment, index) => <div key={`${String(assignment.bus_id ?? assignment.plate_number ?? index)}`} className="rounded-xl bg-surface-alt p-3"><p className="font-black text-ink">{String(assignment.plate_number || `Vehicle ${index + 1}`)}</p><p className="mt-1 text-xs text-muted">{String(assignment.driver_name || 'Driver not assigned')} · {Number(assignment.planned_passengers ?? 0)} planned passengers</p></div>)}</div></div>}
            {engineLinks.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{engineLinks.map(({ label, to, icon: Icon }) => <Link key={to} to={to} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black text-ink outline-none hover:border-brand hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"><Icon className="h-4 w-4" />{label}</Link>)}</div>}
          </article>
          <article className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="font-black text-ink">Driver's Trip Ticket handoff</h3><p className="mt-1 text-sm text-muted">Vehicle, driver, route, and dispatch status tied to this sale.</p></div><Link to="/logistics/trip-tickets" className="inline-flex items-center gap-2 text-xs font-black text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand"><ClipboardList className="h-4 w-4" />Open trip tickets</Link></div>
            {tickets.length === 0 ? <div className="p-10 text-center"><BusFront className="mx-auto h-7 w-7 text-muted" /><p className="mt-3 font-black text-ink">No trip ticket is linked yet</p><p className="mt-1 text-sm text-muted">Return to the source booking to complete fleet and driver allocation.</p></div> : <div className="divide-y divide-border">{tickets.map((ticket) => <article key={ticket.id} className="grid gap-4 p-5 md:grid-cols-[1fr_1.2fr_1.2fr_auto] md:items-center"><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Control number</p><p className="mt-1 font-black text-ink">{ticket.control_no}</p><p className="mt-1 text-xs text-muted">{formatDate(ticket.date_of_travel)}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Route</p><p className="mt-1 text-sm font-bold text-ink">{ticket.pick_up || 'Pickup TBA'} → {ticket.drop_off || 'Drop-off TBA'}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Assignment</p><p className="mt-1 text-sm font-bold text-ink">{ticket.vehicle?.plate_number || 'Vehicle TBA'}</p><p className="mt-1 text-xs text-muted">{ticket.driver?.name || 'Driver TBA'}</p></div><span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{readable(ticket.status)}</span></article>)}</div>}
          </article>
        </div>
        {(transaction.itinerary?.length ?? 0) > 0 && <article className="overflow-hidden rounded-2xl border border-border bg-surface"><div className="border-b border-border p-5"><h3 className="font-black text-ink">Saved itinerary</h3><p className="mt-1 text-sm text-muted">The itinerary committed to this transaction.</p></div><div className="divide-y divide-border">{transaction.itinerary?.map((day) => <div key={day.id} className="grid gap-3 p-5 sm:grid-cols-[80px_180px_1fr]"><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Day</p><p className="mt-1 text-lg font-black text-ink">{day.day_number}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Date & location</p><p className="mt-1 font-bold text-ink">{formatDate(day.date)}</p><p className="mt-1 text-xs text-muted">{day.location || 'Location not recorded'}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Program</p><p className="mt-1 text-sm leading-6 text-ink">{day.activity || 'Activity not recorded'}</p>{(day.meal_plan || day.accommodation) && <p className="mt-1 text-xs text-muted">{[day.meal_plan, day.accommodation].filter(Boolean).join(' · ')}</p>}</div></div>)}</div></article>}
      </section>

      <footer className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-alt p-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Created {formatDate(transaction.created_at, true)} · Last updated {formatDate(transaction.updated_at, true)}</span>
        <span>Transaction ID {transaction.identifiers.transaction_id}</span>
      </footer>
    </main>
  );
}
