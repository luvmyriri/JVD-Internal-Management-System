import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Loader2,
  ReceiptText,
  RotateCcw,
  Search,
  WalletCards,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { TransactionRecord } from '../../api/transactions';
import { transactionsApi } from '../../api/transactions';
import { DataTable, EmptyState, type Column } from '../../components/ds';
import { useAuth } from '../../context/AuthContext';
import {
  formatTransactionMoney,
  transactionContractLabel,
  transactionEngine,
  transactionEngineLabel,
  transactionPaymentTerms,
  transactionServiceDate,
} from '../../utils/transactions';

const statusTone = (status: string) => {
  const normalized = status.toLowerCase();
  if (['paid', 'completed', 'confirmed'].includes(normalized)) return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
  if (normalized === 'partial') return 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200';
  if (normalized.includes('refund')) return 'bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200';
  if (['cancelled', 'void', 'overdue'].includes(normalized)) return 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
  return 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200';
};

const engineTone = (engine: ReturnType<typeof transactionEngine>) => ({
  fixed_package: 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200',
  joiner: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
  charter: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
  educational: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  custom: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  cash_budget: 'bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200',
}[engine]);

const readable = (value?: string | null) => value
  ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : 'Not recorded';

const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(value))
  : 'Not scheduled';

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusTone(status)}`}>
      {readable(status)}
    </span>
  );
}

export default function Transactions() {
  const [searchParams] = useSearchParams();
  const { user, hasPermission } = useAuth();
  const canViewInternal = ['super_admin', 'executive_vice_president', 'accounting_executive'].includes(user?.role || '')
    || hasPermission('accounting', 'can_view');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [kind, setKind] = useState<'sales' | 'cash_budget_disbursement' | 'all'>(() => {
    const requested = searchParams.get('kind');
    return canViewInternal && (requested === 'cash_budget_disbursement' || requested === 'all') ? requested : 'sales';
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [status, serviceType, paymentType, paymentMethod, kind, dateFrom, dateTo]);
  useEffect(() => {
    if (!canViewInternal && kind !== 'sales') setKind('sales');
  }, [canViewInternal, kind]);

  const query = useQuery({
    queryKey: ['transactions-360', { page, search: debouncedSearch, status, serviceType, paymentType, paymentMethod, kind, dateFrom, dateTo }],
    queryFn: () => transactionsApi.list({
      page,
      per_page: 15,
      search: debouncedSearch || undefined,
      payment_state: status || undefined,
      service_type: serviceType || undefined,
      payment_type: paymentType || undefined,
      payment_method: paymentMethod || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      kind,
    }),
    placeholderData: keepPreviousData,
  });

  const records = query.data?.data ?? [];
  const meta = query.data?.meta;
  const stats = query.data?.stats;
  const filtersActive = Boolean(search || status || serviceType || paymentType || paymentMethod || kind !== 'sales' || dateFrom || dateTo);
  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('');
    setServiceType('');
    setPaymentType('');
    setPaymentMethod('');
    setKind('sales');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const columns: Column<TransactionRecord>[] = [
    {
      key: 'product',
      header: 'Product & customer',
      render: (transaction) => {
        const engine = transactionEngine(transaction);
        return (
          <div className="max-w-[300px] py-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-wider ${engineTone(engine)}`}>
                {transactionEngineLabel(engine)}
              </span>
              {transaction.product.item_count > 1 && <span className="text-[10px] font-bold text-muted">+{transaction.product.item_count - 1} item{transaction.product.item_count === 2 ? '' : 's'}</span>}
            </div>
            <Link
              to={`/accounting/transactions/${transaction.id}`}
              className="mt-2 block whitespace-normal font-black leading-5 text-ink outline-none hover:text-brand focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {transaction.product.primary_name}
            </Link>
            <p className="mt-1 truncate text-xs text-muted">{transaction.customer.name}</p>
            <p className="mt-1 text-[10px] font-bold text-muted">{transaction.transaction_number}</p>
          </div>
        );
      },
    },
    {
      key: 'service_date',
      header: 'Travel / service date',
      sortable: true,
      sortValue: transactionServiceDate,
      render: (transaction) => (
        <div>
          <p className="font-bold text-ink">{formatDate(transactionServiceDate(transaction))}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">Issued {formatDate(transaction.created_at)}</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      align: 'right',
      sortValue: (transaction) => transaction.money.total,
      render: (transaction) => <strong className="text-sm text-ink">{formatTransactionMoney(transaction.money.total, transaction.money.currency)}</strong>,
    },
    {
      key: 'paid_balance',
      header: 'Received / balance',
      align: 'right',
      render: (transaction) => (
        <div>
          <p className="font-black text-emerald-700 dark:text-emerald-300">{formatTransactionMoney(transaction.money.gross_collected, transaction.money.currency)}</p>
          <p className={`mt-1 text-xs font-bold ${transaction.money.balance > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-muted'}`}>
            {formatTransactionMoney(transaction.money.balance, transaction.money.currency)} balance
          </p>
        </div>
      ),
    },
    {
      key: 'terms',
      header: 'Payment & contract',
      render: (transaction) => (
        <div className="max-w-[180px]">
          <p className="font-bold text-ink">{transactionPaymentTerms(transaction)}</p>
          <p className="mt-1 truncate text-xs text-muted">{transaction.money.payment_methods.join(', ') || 'No posted method'}</p>
          <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-wider text-muted">{readable(transactionContractLabel(transaction))}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (transaction) => (
        <div>
          <StatusBadge status={transaction.payment_state} />
          {transaction.invoice.status !== transaction.payment_state && <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted">Invoice: {readable(transaction.invoice.status)}</p>}
          {transaction.collection?.is_overdue && <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">Collection overdue</p>}
          {transaction.refund.count > 0 && <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">{transaction.refund.count} refund record{transaction.refund.count === 1 ? '' : 's'}</p>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (transaction) => (
        <div className="flex justify-end gap-2">
          {transaction.collection && transaction.money.balance > 0 && (
            <Link
              to={`/accounting/collections?collection_id=${transaction.collection.id}`}
              aria-label={`Open collection for ${transaction.transaction_number}`}
              className="inline-flex h-10 items-center rounded-xl border border-border bg-surface px-3 text-xs font-black text-ink outline-none transition hover:border-brand hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Collection
            </Link>
          )}
          <Link
            to={`/accounting/transactions/${transaction.id}`}
            aria-label={`Open transaction ${transaction.transaction_number}`}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#071b33] px-3 text-xs font-black text-white outline-none transition hover:bg-[#0d3159] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Open <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <main className="jvd mx-auto w-full max-w-[1600px] space-y-5 pb-12">
      <header className="overflow-hidden rounded-2xl bg-[#071b33] text-white shadow-lg shadow-slate-950/10">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-black tracking-[-0.025em]">Transactions</h1>
            <p className="mt-2 max-w-[65ch] text-sm leading-6 text-blue-100">
              Follow every customer sale from package and booking through invoice, posted payments, collection, contract, documents, and refund activity.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-7 gap-y-4 border-t border-white/15 pt-5 sm:grid-cols-3 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Transactions</dt><dd className="mt-1 text-xl font-black">{stats?.transaction_count ?? '—'}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Net collected</dt><dd className="mt-1 text-xl font-black">{formatTransactionMoney(stats?.net_collected ?? 0)}</dd></div>
            <div className="col-span-2 sm:col-span-1"><dt className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Outstanding</dt><dd className="mt-1 text-xl font-black text-amber-200">{formatTransactionMoney(stats?.outstanding ?? 0)}</dd></div>
          </dl>
        </div>
        <div className="grid grid-cols-2 border-t border-white/10 bg-white/[0.04] sm:grid-cols-4">
          <div className="px-5 py-3"><p className="text-[10px] uppercase tracking-wider text-blue-200">Billed</p><p className="mt-1 text-sm font-black">{formatTransactionMoney(stats?.total_billed ?? 0)}</p></div>
          <div className="border-l border-white/10 px-5 py-3"><p className="text-[10px] uppercase tracking-wider text-blue-200">Gross received</p><p className="mt-1 text-sm font-black">{formatTransactionMoney(stats?.gross_collected ?? 0)}</p></div>
          <div className="border-t border-white/10 px-5 py-3 sm:border-l sm:border-t-0"><p className="text-[10px] uppercase tracking-wider text-blue-200">Credited</p><p className="mt-1 text-sm font-black">{formatTransactionMoney(stats?.credited ?? 0)}</p></div>
          <div className="border-l border-t border-white/10 px-5 py-3 sm:border-t-0"><p className="text-[10px] uppercase tracking-wider text-blue-200">Refunded</p><p className="mt-1 text-sm font-black">{formatTransactionMoney(stats?.refunded ?? 0)}</p></div>
        </div>
      </header>

      <section aria-label="Transaction filters" className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.5fr)_repeat(4,minmax(145px,0.7fr))]">
          <label className="relative">
            <span className="sr-only">Search transactions</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product, customer, invoice, order, or booking"
              className="h-11 w-full rounded-xl border border-border bg-surface-alt pl-10 pr-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label>
            <span className="sr-only">Financial status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
              <option value="">All financial statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partially paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="refunded">Refunded</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Service engine</span>
            <select value={serviceType} onChange={(event) => setServiceType(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
              <option value="">All products and services</option>
              <option value="private_tour">Fixed packages</option>
              <option value="joiner_tour">Joiner departures</option>
              <option value="bus_rental">Bus charters</option>
              <option value="educational_tour">Educational tours</option>
              <option value="custom_arrangement">Custom services</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Payment terms</span>
            <select value={paymentType} onChange={(event) => setPaymentType(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
              <option value="">All payment terms</option>
              <option value="full">Full payment</option>
              <option value="downpayment">Downpayment</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Payment method</span>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
              <option value="">All payment methods</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank transfer</option>
              <option value="GCash">GCash</option>
              <option value="Check">Check</option>
              <option value="PayMongo">PayMongo</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-end">
          {canViewInternal && <label className="text-xs font-bold text-muted">Record scope
            <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="mt-1 block h-10 rounded-xl border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
              <option value="sales">Customer sales</option>
              <option value="all">All financial records</option>
              <option value="cash_budget_disbursement">Cash budget disbursements</option>
            </select>
          </label>}
          <label className="text-xs font-bold text-muted">From
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 block h-10 rounded-xl border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </label>
          <label className="text-xs font-bold text-muted">To
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 block h-10 rounded-xl border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </label>
          <div className="flex items-center gap-3 sm:ml-auto">
            <p className="text-xs font-semibold text-muted" aria-live="polite">
              {meta?.total ?? 0} matching transaction{meta?.total === 1 ? '' : 's'}
            </p>
            {filtersActive && (
              <button type="button" onClick={clearFilters} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-black text-brand outline-none hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-brand dark:hover:bg-blue-950/30">
                <RotateCcw className="h-3.5 w-3.5" /> Reset filters
              </button>
            )}
          </div>
        </div>
      </section>

      {query.isError ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
          <h2 className="font-black">Transactions could not be loaded</h2>
          <p className="mt-2 text-sm">Check your connection and access, then try again.</p>
          <button type="button" onClick={() => query.refetch()} className="mt-4 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2">Try again</button>
        </section>
      ) : (
        <>
          <div className="relative hidden md:block">
            {query.isPlaceholderData && <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden rounded-full bg-blue-100"><div className="h-full w-1/2 animate-pulse rounded-full bg-brand motion-reduce:animate-none" /></div>}
            <DataTable
              columns={columns}
              data={records}
              rowKey={(transaction) => transaction.id}
              className="jvd"
              empty={query.isLoading ? (
                <div className="grid min-h-64 place-items-center"><div className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-brand" /><p className="mt-3 text-sm font-bold text-muted">Loading transactions…</p></div></div>
              ) : (
                <EmptyState icon={<ReceiptText className="h-6 w-6" />} title="No matching transactions" description="Adjust the filters or complete a customer booking to create a transaction." />
              )}
            />
          </div>

          <div className="space-y-3 md:hidden">
            {query.isLoading ? (
              <div className="grid min-h-64 place-items-center rounded-2xl border border-border bg-surface"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>
            ) : records.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface"><EmptyState icon={<FileText className="h-6 w-6" />} title="No matching transactions" description="Adjust the filters or complete a customer booking to create a transaction." /></div>
            ) : records.map((transaction) => {
              const engine = transactionEngine(transaction);
              return (
                <Link
                  key={transaction.id}
                  to={`/accounting/transactions/${transaction.id}`}
                  className="block rounded-2xl border border-border bg-surface p-4 outline-none transition hover:border-brand hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-wider ${engineTone(engine)}`}>{transactionEngineLabel(engine)}</span>
                    <StatusBadge status={transaction.payment_state} />
                  </div>
                  <h2 className="mt-3 text-base font-black leading-5 text-ink">{transaction.product.primary_name}</h2>
                  <p className="mt-1 text-sm text-muted">{transaction.customer.name}</p>
                  <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-xl bg-surface-alt py-3 text-center">
                    <div className="px-2"><p className="text-[9px] font-bold uppercase text-muted">Total</p><p className="mt-1 truncate text-xs font-black text-ink">{formatTransactionMoney(transaction.money.total, transaction.money.currency)}</p></div>
                    <div className="px-2"><p className="text-[9px] font-bold uppercase text-muted">Received</p><p className="mt-1 truncate text-xs font-black text-emerald-700 dark:text-emerald-300">{formatTransactionMoney(transaction.money.gross_collected, transaction.money.currency)}</p></div>
                    <div className="px-2"><p className="text-[9px] font-bold uppercase text-muted">Balance</p><p className="mt-1 truncate text-xs font-black text-amber-700 dark:text-amber-300">{formatTransactionMoney(transaction.money.balance, transaction.money.currency)}</p></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(transactionServiceDate(transaction))}</span>
                    <span className="inline-flex items-center gap-1.5 font-black text-brand">Open transaction <ArrowRight className="h-3.5 w-3.5" /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {meta && meta.last_page > 1 && (
        <nav aria-label="Transaction pages" className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 sm:flex-row">
          <p className="text-xs font-semibold text-muted">Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.total}</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1 || query.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black text-ink outline-none hover:border-brand disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand"><ChevronLeft className="h-4 w-4" /> Previous</button>
            <span className="min-w-20 text-center text-xs font-black text-ink">Page {meta.current_page} of {meta.last_page}</span>
            <button type="button" disabled={page >= meta.last_page || query.isFetching} onClick={() => setPage((current) => Math.min(meta.last_page, current + 1))} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black text-ink outline-none hover:border-brand disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand">Next <ChevronRight className="h-4 w-4" /></button>
          </div>
        </nav>
      )}

      <aside className="grid gap-3 rounded-2xl border border-border bg-surface-alt p-4 text-xs text-muted sm:grid-cols-3">
        <p className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-brand" /> Money is based on posted payment evidence.</p>
        <p className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-brand" /> Partial balances remain linked to Collections.</p>
        <p className="flex items-center gap-2"><Banknote className="h-4 w-4 text-brand" /> Refunds and credits reduce net collected totals.</p>
      </aside>
    </main>
  );
}
