import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LuBadgeCheck, LuCircleAlert, LuClock3, LuRotateCcw } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { billingApi, type Invoice } from '../../api/billing';
import { refundApi } from '../../api/refunds';
import { useAuth } from '../../context/AuthContext';
import { formatMoneyInput, parseMoneyInput } from '../../utils';
import { Button } from '../ui';

interface RefundWorkflowPanelProps {
  invoiceId: number;
  className?: string;
}

const money = (value: number) => `₱${value.toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

export default function RefundWorkflowPanel({ invoiceId, className = '' }: RefundWorkflowPanelProps) {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationFormOpen, setCancellationFormOpen] = useState(false);
  const [refundFormOpen, setRefundFormOpen] = useState(false);
  const [refundForm, setRefundForm] = useState({ amount: '', refund_method: 'Cash', reason: '' });
  const [destinationReference, setDestinationReference] = useState('');

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ['refund-workflow-invoice', invoiceId],
    queryFn: async () => {
      const response = await billingApi.getInvoice(invoiceId);
      return response.data.data;
    },
  });

  const order = invoice?.sales_order;
  const adjustments = order?.adjustments ?? [];
  const credits = order?.credit_notes ?? [];
  const refunds = order?.refunds ?? [];
  const cancellation = [...adjustments].reverse().find((item) => item.type === 'cancellation');
  const credit = [...credits].reverse().find((item) => item.status === 'posted');
  const refund = [...refunds].reverse()[0] ?? credit?.refunds?.slice?.(-1)?.[0];
  const collected = Math.min(
    Number(invoice?.total_amount ?? 0),
    Math.max(
      0,
      Number(invoice?.amount_received ?? 0),
      Number(invoice?.collection?.paid_amount ?? 0)
    )
  );
  const refunded = Math.max(0, Number(invoice?.refunded_amount ?? 0));
  const available = Math.max(0, collected - refunded);
  const hasPayMongoPayment = Boolean(
    invoice?.collection?.payments?.some((payment) => payment.paymongo_payment_id)
  );
  const isPayMongo = String(refund?.refund_method || '').toLowerCase().includes('paymongo');
  const canManageRefunds = ['super_admin', 'executive_vice_president', 'accounting_executive'].includes(user?.role || '')
    || hasPermission('sales', 'can_edit');
  const canRequestCancellation = canManageRefunds
    || ['reservation_officer', 'office_staff'].includes(user?.role || '')
    || hasPermission('sales', 'can_create');

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['refund-workflow-invoice', invoiceId] }),
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['collections'] }),
      queryClient.invalidateQueries({ queryKey: ['transaction-360', invoiceId] }),
      queryClient.invalidateQueries({ queryKey: ['transactions-360'] }),
    ]);
  };

  const action = useMutation({
    mutationFn: async (
      kind: 'request-cancellation' | 'approve-cancellation' | 'request-refund' | 'approve-refund' | 'process-refund'
    ) => {
      if (kind === 'request-cancellation') {
        if (!cancellationReason.trim()) throw new Error('Enter the cancellation reason.');
        return refundApi.requestCancellation(invoiceId, cancellationReason.trim());
      }
      if (kind === 'approve-cancellation') return refundApi.approveAdjustment(cancellation.id);
      if (kind === 'request-refund') {
        const amount = Number(parseMoneyInput(refundForm.amount));
        if (!amount || !refundForm.reason.trim()) throw new Error('Complete the refund amount and reason.');
        if (amount > available) throw new Error(`Refund cannot exceed the ${money(available)} collected amount available.`);
        if (refundForm.refund_method === 'PayMongo' && !hasPayMongoPayment) {
          throw new Error('This invoice has no settled PayMongo payment reference.');
        }
        return refundApi.requestRefund(credit.id, {
          amount,
          refund_method: refundForm.refund_method,
          reason: refundForm.reason.trim(),
        });
      }
      if (kind === 'approve-refund') return refundApi.approveRefund(refund.id);
      return refundApi.processRefund(
        refund.id,
        isPayMongo ? undefined : destinationReference.trim() || undefined
      );
    },
    onSuccess: async (response) => {
      toast.success(response?.message ?? 'Refund workflow updated');
      setCancellationFormOpen(false);
      setRefundFormOpen(false);
      await refresh();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? error?.message ?? 'Refund workflow action failed');
    },
  });

  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 ${className}`}>
        <p className="text-xs font-bold text-muted">Loading refund status…</p>
      </div>
    );
  }

  if (!invoice || invoice.cash_budget_request_id) return null;

  const state = refund?.status === 'processed'
    ? { icon: <LuBadgeCheck className="h-4 w-4" />, label: 'Refund completed', tone: 'text-emerald-700 dark:text-emerald-300' }
    : refund?.status === 'processing'
      ? { icon: <LuClock3 className="h-4 w-4" />, label: 'Awaiting PayMongo', tone: 'text-blue-700 dark:text-blue-300' }
      : refund?.status === 'provider_failed'
        ? { icon: <LuCircleAlert className="h-4 w-4" />, label: 'Provider attention required', tone: 'text-red-700 dark:text-red-300' }
        : { icon: <LuRotateCcw className="h-4 w-4" />, label: 'Refund controls', tone: 'text-violet-700 dark:text-violet-300' };

  return (
    <section id={`refund-workflow-${invoiceId}`} className={`rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/20 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] ${state.tone}`}>
            {state.icon}
            {state.label}
          </div>
          <p className="mt-2 text-xs font-bold text-gray-700 dark:text-gray-200">
            {!cancellation && (available > 0
              ? 'Payment is refundable after cancellation approval and credit-note posting.'
              : 'No collected amount is currently available for a cash refund.')}
            {cancellation?.status === 'pending_approval' && 'Cancellation is waiting for approval.'}
            {cancellation?.status === 'approved' && !credit && 'Cancellation approved; preparing the credit note.'}
            {credit && !refund && `Credit note ${credit.credit_note_number} is posted. The refund may now be requested.`}
            {refund?.status === 'pending_approval' && `Refund ${refund.refund_number} is waiting for approval.`}
            {refund?.status === 'approved' && `Refund ${refund.refund_number} is approved and ready for final processing.`}
            {refund?.status === 'processing' && `Refund ${refund.refund_number} was sent to PayMongo and is awaiting confirmation.`}
            {refund?.status === 'provider_failed' && `PayMongo did not confirm refund ${refund.refund_number}. Verify it in PayMongo before taking another action.`}
            {refund?.status === 'processed' && `Refund ${refund.refund_number} is processed and posted to the ledger.`}
          </p>
          {refund?.provider_refund_id && (
            <p className="mt-1 text-[11px] font-bold text-violet-700 dark:text-violet-300">
              PayMongo reference: {refund.provider_refund_id} · Provider status: {refund.provider_status || 'pending'}
            </p>
          )}
          {refund?.provider_error && <p className="mt-1 text-[11px] font-bold text-red-600">{refund.provider_error}</p>}
        </div>

        <div className="grid min-w-[250px] grid-cols-3 divide-x divide-violet-200 overflow-hidden rounded-xl border border-violet-200 bg-white dark:divide-violet-800 dark:border-violet-800 dark:bg-slate-950">
          <div className="p-2.5 text-center"><p className="text-[9px] font-black uppercase text-muted">Collected</p><p className="mt-1 text-xs font-black text-ink">{money(collected)}</p></div>
          <div className="p-2.5 text-center"><p className="text-[9px] font-black uppercase text-muted">Refunded</p><p className="mt-1 text-xs font-black text-ink">{money(refunded)}</p></div>
          <div className="p-2.5 text-center"><p className="text-[9px] font-black uppercase text-muted">Available</p><p className="mt-1 text-xs font-black text-violet-700 dark:text-violet-300">{money(available)}</p></div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!cancellation && canRequestCancellation && (
          <Button size="sm" onClick={() => setCancellationFormOpen(true)}>Request cancellation</Button>
        )}
        {cancellation?.status === 'pending_approval' && canManageRefunds && (
          <Button size="sm" onClick={() => action.mutate('approve-cancellation')} isLoading={action.isPending}>Approve cancellation</Button>
        )}
        {credit && !refund && canManageRefunds && available > 0 && (
          <Button size="sm" onClick={() => {
            setRefundForm({
              amount: formatMoneyInput(String(Math.min(Number(credit.total_amount || 0), available))),
              refund_method: hasPayMongoPayment ? 'PayMongo' : 'Cash',
              reason: cancellation?.reason ?? 'Customer cancellation',
            });
            setRefundFormOpen(true);
          }}>Request refund</Button>
        )}
        {refund?.status === 'pending_approval' && canManageRefunds && (
          <Button size="sm" onClick={() => action.mutate('approve-refund')} isLoading={action.isPending}>Approve refund</Button>
        )}
      </div>

      {cancellationFormOpen && (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-slate-950">
          <label className="text-xs font-bold text-muted">Cancellation reason
            <textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-border bg-surface p-3 text-sm text-ink" />
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setCancellationFormOpen(false)}>Keep booking</Button>
            <Button size="sm" onClick={() => action.mutate('request-cancellation')} isLoading={action.isPending}>Submit cancellation</Button>
          </div>
        </div>
      )}

      {refundFormOpen && (
        <div className="mt-4 grid gap-4 rounded-2xl border border-violet-200 bg-white p-4 dark:border-violet-800 dark:bg-slate-950 md:grid-cols-2">
          <label className="text-xs font-bold text-muted">Refund amount
            <input value={refundForm.amount} onChange={(event) => setRefundForm((current) => ({ ...current, amount: formatMoneyInput(event.target.value) }))} inputMode="decimal" className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink" />
          </label>
          <label className="text-xs font-bold text-muted">Refund destination
            <select value={refundForm.refund_method} onChange={(event) => setRefundForm((current) => ({ ...current, refund_method: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-ink">
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank transfer</option>
              <option value="PayMongo" disabled={!hasPayMongoPayment}>PayMongo{!hasPayMongoPayment ? ' — no settled payment reference' : ''}</option>
            </select>
          </label>
          <label className="text-xs font-bold text-muted md:col-span-2">Reason
            <textarea value={refundForm.reason} onChange={(event) => setRefundForm((current) => ({ ...current, reason: event.target.value }))} rows={3} className="mt-1.5 w-full rounded-xl border border-border bg-surface p-3 text-sm text-ink" />
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button size="sm" variant="secondary" onClick={() => setRefundFormOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => action.mutate('request-refund')} isLoading={action.isPending}>Submit for approval</Button>
          </div>
        </div>
      )}

      {refund?.status === 'approved' && canManageRefunds && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <p className="text-xs font-black text-amber-900 dark:text-amber-200">Final processing</p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            {isPayMongo
              ? 'This sends the approved amount to PayMongo. Accounting posts only after PayMongo confirms success.'
              : 'Record the cash voucher or bank-transfer reference before posting the refund.'}
          </p>
          {!isPayMongo && (
            <input value={destinationReference} onChange={(event) => setDestinationReference(event.target.value)} placeholder="Voucher, bank, or transfer reference" className="mt-3 h-11 w-full rounded-xl border border-amber-300 bg-white px-3 text-sm text-ink dark:bg-slate-950" />
          )}
          <Button size="sm" onClick={() => action.mutate('process-refund')} isLoading={action.isPending} className="mt-3">
            {isPayMongo ? 'Send refund to PayMongo' : 'Process and post refund'}
          </Button>
        </div>
      )}
    </section>
  );
}
