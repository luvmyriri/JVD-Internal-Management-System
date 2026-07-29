<?php

namespace App\Services;

use App\Models\Account;
use App\Models\CreditNote;
use App\Models\Invoice;
use App\Models\JoinerDeparture;
use App\Models\JoinerReservation;
use App\Models\SalesOrder;
use App\Models\SalesOrderAdjustment;
use App\Models\SalesOrderEvent;
use App\Models\SalesRefund;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SalesLifecycleService
{
    public function request(SalesOrder $order, string $type, string $reason, array $changeSet, int $actorId): SalesOrderAdjustment
    {
        if (! in_array($type, ['cancellation', 'amendment', 'rebooking'], true)) {
            throw ValidationException::withMessages(['type' => 'Unsupported lifecycle request.']);
        }
        if (! $order->invoice_id || ! in_array($order->status, ['confirmed', 'awaiting_payment', 'in_progress'], true)) {
            throw ValidationException::withMessages(['order' => 'Only active, invoiced orders can enter a lifecycle change.']);
        }
        $amount = $type === 'cancellation' ? $this->cancellationCredit($order) : 0;

        return DB::transaction(function () use ($order, $type, $reason, $changeSet, $actorId, $amount) {
            $adjustment = SalesOrderAdjustment::create([
                'sales_order_id' => $order->id, 'invoice_id' => $order->invoice_id, 'adjustment_number' => $this->number('ADJ'),
                'type' => $type, 'status' => 'pending_approval', 'reason' => $reason, 'amount' => $amount, 'change_set' => $changeSet ?: null, 'requested_by' => $actorId,
            ]);
            $this->event($order, "{$type}_requested", $order->status, $order->status, ['adjustment_id' => $adjustment->id, 'amount' => $amount], $actorId);

            return $adjustment;
        });
    }

    public function approve(SalesOrderAdjustment $adjustment, int $actorId): SalesOrderAdjustment
    {
        return DB::transaction(function () use ($adjustment, $actorId) {
            $adjustment = SalesOrderAdjustment::lockForUpdate()->with(['order.items.fulfillment', 'invoice'])->findOrFail($adjustment->id);
            if ($adjustment->status !== 'pending_approval') {
                throw ValidationException::withMessages(['adjustment' => 'Only pending requests can be approved.']);
            }
            match ($adjustment->type) {
                'cancellation' => $this->approveCancellation($adjustment, $actorId),
                'amendment' => $this->approveAmendment($adjustment, $actorId),
                'rebooking' => $this->approveRebooking($adjustment, $actorId),
                default => throw ValidationException::withMessages(['adjustment' => 'Unknown lifecycle action.']),
            };
            $adjustment->update(['status' => 'approved', 'approved_by' => $actorId, 'approved_at' => now(), 'effective_at' => now()]);

            return $adjustment->fresh(['order', 'invoice']);
        });
    }

    public function reject(SalesOrderAdjustment $adjustment, int $actorId): SalesOrderAdjustment
    {
        if ($adjustment->status !== 'pending_approval') {
            throw ValidationException::withMessages(['adjustment' => 'Only pending requests can be rejected.']);
        }
        $adjustment->update(['status' => 'rejected', 'approved_by' => $actorId, 'approved_at' => now()]);
        $this->event($adjustment->order, "{$adjustment->type}_rejected", $adjustment->order->status, $adjustment->order->status, ['adjustment_id' => $adjustment->id], $actorId);

        return $adjustment;
    }

    public function requestRefund(CreditNote $creditNote, float $amount, string $method, string $reason, int $actorId): SalesRefund
    {
        if ($creditNote->status !== 'posted') {
            throw ValidationException::withMessages(['credit_note' => 'Credit note must be posted before requesting a refund.']);
        }
        $available = (float) $creditNote->total_amount - (float) $creditNote->refunds()->whereNotIn('status', ['rejected', 'cancelled'])->sum('amount');
        $invoice = $creditNote->invoice;
        $cashAvailable = max(0, ((float) $invoice->total_amount - (float) $invoice->balance) - (float) $invoice->refunded_amount);
        if ($amount <= 0 || $amount > min($available, $cashAvailable)) {
            throw ValidationException::withMessages(['amount' => 'Refund exceeds the posted credit or collected amount available.']);
        }

        return SalesRefund::create([
            'refund_number' => $this->number('REF'), 'sales_order_id' => $creditNote->sales_order_id, 'invoice_id' => $creditNote->invoice_id,
            'credit_note_id' => $creditNote->id, 'status' => 'pending_approval', 'amount' => $amount, 'refund_method' => $method,
            'reason' => $reason, 'requested_by' => $actorId,
        ]);
    }

    public function approveRefund(SalesRefund $refund, int $actorId): SalesRefund
    {
        if ($refund->status !== 'pending_approval') {
            throw ValidationException::withMessages(['refund' => 'Only pending refunds can be approved.']);
        }
        $refund->update(['status' => 'approved', 'approved_by' => $actorId, 'approved_at' => now()]);

        return $refund;
    }

    public function processRefund(SalesRefund $refund, ?string $destinationReference, int $actorId): SalesRefund
    {
        return DB::transaction(function () use ($refund, $destinationReference, $actorId) {
            $refund = SalesRefund::lockForUpdate()->with(['invoice', 'order'])->findOrFail($refund->id);
            if ($refund->status !== 'approved') {
                throw ValidationException::withMessages(['refund' => 'Refund requires approval before processing.']);
            }
            if (str_contains(strtolower((string) $refund->refund_method), 'paymongo')) {
                $payment = $refund->invoice->payments()->whereNotNull('paymongo_payment_id')->latest()->first();
                if (! $payment?->paymongo_payment_id) {
                    throw ValidationException::withMessages(['refund_method' => 'No settled PayMongo payment is available for this invoice.']);
                }
                $result = app(PayMongoService::class)->createRefund(
                    $payment->paymongo_payment_id,
                    (float) $refund->amount,
                    'requested_by_customer'
                );
                if (! ($result['success'] ?? false)) {
                    throw ValidationException::withMessages(['refund' => $result['error'] ?? 'PayMongo rejected the refund.']);
                }
                $destinationReference = $result['refund_id'] ?? $destinationReference;
            }
            app(LedgerService::class)->seedDefaultAccounts();
            $payable = Account::where('code', '2500')->firstOrFail();
            $cash = Account::where('code', strcasecmp($refund->refund_method, 'Cash') === 0 ? '1100' : '1000')->firstOrFail();
            app(LedgerService::class)->recordEntry(now()->toDateString(), "Refund {$refund->refund_number}", [
                ['account_id' => $payable->id, 'debit' => $refund->amount, 'credit' => 0, 'description' => 'Settle customer refund liability'],
                ['account_id' => $cash->id, 'debit' => 0, 'credit' => $refund->amount, 'description' => "Refund via {$refund->refund_method}"],
            ], $refund);
            $refund->invoice->increment('refunded_amount', $refund->amount);
            $refund->update(['status' => 'processed', 'destination_reference' => $destinationReference, 'processed_by' => $actorId, 'processed_at' => now()]);
            $this->event($refund->order, 'refund_processed', $refund->order->status, $refund->order->status, ['refund_id' => $refund->id, 'amount' => $refund->amount], $actorId);

            return $refund->fresh(['creditNote', 'invoice']);
        });
    }

    private function approveCancellation(SalesOrderAdjustment $adjustment, int $actorId): void
    {
        $order = $adjustment->order;
        foreach ($order->items as $item) {
            if ($item->fulfillment) {
                $this->cancelFulfillment($item->fulfillment);
            }
            $item->update(['status' => 'cancelled']);
        }
        $order->update(['status' => 'cancelled']);
        $adjustment->invoice->update(['status' => 'cancelled']);
        if ((float) $adjustment->amount > 0) {
            $this->issueAndPostCredit($adjustment, $actorId);
        }
        $this->event($order, 'order_cancelled', 'confirmed', 'cancelled', ['adjustment_id' => $adjustment->id], $actorId);
    }

    private function cancelFulfillment($fulfillment): void
    {
        if ($fulfillment instanceof JoinerReservation) {
            $reservation = JoinerReservation::lockForUpdate()->with(['passengers.seat', 'departure'])->findOrFail($fulfillment->id);
            $released = 0;
            foreach ($reservation->passengers as $passenger) {
                if ($passenger->seat) {
                    $passenger->seat->update(['status' => 'available', 'held_until' => null]);
                    $released++;
                }
            }
            if ($released > 0) {
                $departure = JoinerDeparture::lockForUpdate()->findOrFail($reservation->departure_id);
                $departure->update(['confirmed_count' => max(0, (int) $departure->confirmed_count - $released)]);
            }
            $reservation->update(['status' => 'cancelled']);

            return;
        }
        app(ResourceAllocationService::class)->release($fulfillment);
        if (array_key_exists('status', $fulfillment->getAttributes())) {
            $fulfillment->update(['status' => 'cancelled']);
        }
    }

    private function approveAmendment(SalesOrderAdjustment $adjustment, int $actorId): void
    {
        $changes = $adjustment->change_set ?? [];
        if (isset($changes['financial'])) {
            throw ValidationException::withMessages(['change_set.financial' => 'Posted prices require a credit note or a supplemental order; they cannot be overwritten.']);
        }
        foreach ($changes['items'] ?? [] as $change) {
            $item = $adjustment->order->items->firstWhere('id', $change['item_id'] ?? null);
            if (! $item || ! $item->fulfillment) {
                throw ValidationException::withMessages(['change_set.items' => 'Amendment references an invalid order line.']);
            }
            app(ResourceAllocationService::class)->release($item->fulfillment);
            $validated = app(SalesOrderFulfillmentService::class)->validate(
                $item->service_type,
                $change['details'] ?? [],
                $item->service_id
            );
            $item->fulfillment->update($validated);
            $item->update(['details_snapshot' => $validated]);
            app(SalesOrderService::class)->resynchronizeFulfillment($item);
        }
        $adjustment->order->increment('version');
        $this->event($adjustment->order, 'order_amended', $adjustment->order->status, $adjustment->order->status, ['adjustment_id' => $adjustment->id, 'version' => $adjustment->order->version], $actorId);
    }

    private function approveRebooking(SalesOrderAdjustment $adjustment, int $actorId): void
    {
        $source = $adjustment->order->load(['customer', 'items.service']);
        $customer = $source->customer;
        $draft = app(SalesOrderService::class)->createDraft([
            'customer_id' => $source->customer_id, 'customer_name' => $customer?->first_name.' '.$customer?->last_name,
            'customer_email' => $customer?->email, 'customer_contact' => $customer?->phone, 'customer_address' => $customer?->address,
            'notes' => "Rebooking of {$source->order_number}. ".$adjustment->reason,
        ], $actorId);
        $overrides = collect($adjustment->change_set['items'] ?? [])->keyBy('item_id');
        foreach ($source->items as $item) {
            $override = $overrides->get($item->id, []);
            app(SalesOrderService::class)->addItem($draft, [
                'service_type' => $item->service_type, 'service_id' => $item->service_id, 'title' => $item->title, 'description' => $item->description,
                'quantity' => $item->quantity, 'unit_price' => $item->unit_price, 'details' => $override['details'] ?? $item->details_snapshot,
            ], $actorId);
        }
        $draft->update(['supersedes_order_id' => $source->id]);
        $adjustment->update(['change_set' => [...($adjustment->change_set ?? []), 'replacement_order_id' => $draft->id]]);
        $this->event($source, 'rebooking_draft_created', $source->status, $source->status, ['replacement_order_id' => $draft->id], $actorId);
    }

    private function issueAndPostCredit(SalesOrderAdjustment $adjustment, int $actorId): CreditNote
    {
        $invoice = Invoice::lockForUpdate()->findOrFail($adjustment->invoice_id);
        $total = min((float) $adjustment->amount, (float) $invoice->total_amount - (float) $invoice->credited_amount);
        $taxRatio = (float) $invoice->total_amount > 0 ? (float) $invoice->tax_amount / (float) $invoice->total_amount : 0;
        $tax = round($total * $taxRatio, 2);
        $subtotal = round($total - $tax, 2);
        $credit = CreditNote::create([
            'credit_note_number' => $this->number('CN'), 'sales_order_id' => $adjustment->sales_order_id, 'invoice_id' => $invoice->id,
            'sales_order_adjustment_id' => $adjustment->id, 'status' => 'posted', 'subtotal' => $subtotal, 'tax_amount' => $tax, 'total_amount' => $total,
            'reason' => $adjustment->reason, 'issued_by' => $actorId, 'issued_at' => now(), 'posted_at' => now(),
        ]);
        app(LedgerService::class)->seedDefaultAccounts();
        $returns = Account::where('code', '4050')->firstOrFail();
        $vat = Account::where('code', '2400')->firstOrFail();
        $ar = Account::where('code', '1300')->firstOrFail();
        $payable = Account::where('code', '2500')->firstOrFail();
        $arCredit = min((float) $invoice->balance, $total);
        $refundLiability = round($total - $arCredit, 2);
        $lines = [
            ['account_id' => $returns->id, 'debit' => $subtotal, 'credit' => 0, 'description' => "Credit note {$credit->credit_note_number}"],
        ];
        if ($tax > 0) {
            $lines[] = ['account_id' => $vat->id, 'debit' => $tax, 'credit' => 0, 'description' => 'Reverse output VAT'];
        }
        if ($arCredit > 0) {
            $lines[] = ['account_id' => $ar->id, 'debit' => 0, 'credit' => $arCredit, 'description' => 'Reduce accounts receivable'];
        }
        if ($refundLiability > 0) {
            $lines[] = ['account_id' => $payable->id, 'debit' => 0, 'credit' => $refundLiability, 'description' => 'Customer refund liability'];
        }
        app(LedgerService::class)->recordEntry(now()->toDateString(), "Credit note {$credit->credit_note_number}", $lines, $credit);
        $invoice->update([
            'credited_amount' => (float) $invoice->credited_amount + $total,
            'balance' => max(0, (float) $invoice->balance - $arCredit),
        ]);
        $adjustment->order->update(['balance' => $invoice->balance]);

        return $credit;
    }

    private function cancellationCredit(SalesOrder $order): float
    {
        $starts = $order->travel_starts_at ? Carbon::parse($order->travel_starts_at) : now();
        $days = max(0, now()->startOfDay()->diffInDays($starts->startOfDay(), false));
        $tiers = collect(SystemSetting::getValue('sales.cancellation_tiers', []))->sortByDesc('days');
        $tier = $tiers->first(fn ($tier) => $days >= (int) ($tier['days'] ?? 0));
        $refundPercent = (float) ($tier['refund'] ?? 0);

        return round((float) $order->total_amount * ($refundPercent / 100), 2);
    }

    private function event(SalesOrder $order, string $type, ?string $from, ?string $to, array $payload, int $actorId): void
    {
        SalesOrderEvent::create(['sales_order_id' => $order->id, 'event_type' => $type, 'from_status' => $from, 'to_status' => $to, 'payload' => $payload, 'actor_id' => $actorId, 'occurred_at' => now()]);
    }

    private function number(string $prefix): string
    {
        return $prefix.'-'.now()->format('Ymd').'-'.strtoupper(Str::random(8));
    }
}
