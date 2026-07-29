<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Collection;
use App\Models\CreditNote;
use App\Models\Invoice;
use App\Models\SalesOrder;
use App\Models\SalesOrderAdjustment;
use App\Models\User;
use App\Services\LedgerService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class RefundExampleSeeder extends Seeder
{
    public const INVOICE_NUMBER = 'INV-REFUND-DEMO-001';

    public function run(): void
    {
        if (Invoice::where('invoice_number', self::INVOICE_NUMBER)->exists()) {
            $this->command?->info('Refund example already exists: '.self::INVOICE_NUMBER);

            return;
        }

        $actor = User::whereIn('role', [
            'super_admin',
            'executive_vice_president',
            'accounting_executive',
        ])->first() ?? User::first();

        if (! $actor) {
            throw new RuntimeException('Create a system user before running RefundExampleSeeder.');
        }

        app(LedgerService::class)->seedDefaultAccounts();

        DB::transaction(function () use ($actor) {
            $invoice = Invoice::create([
                'invoice_number' => self::INVOICE_NUMBER,
                'customer_name' => 'Refund Workflow Demo — Boracay Cancellation',
                'customer_email' => 'refund.demo@example.test',
                'customer_contact' => '0917 000 0000',
                'customer_address' => 'Demo record — not a real customer',
                'subtotal' => 10000,
                'tax_amount' => 0,
                'total_amount' => 10000,
                'amount_received' => 10000,
                'change' => 0,
                'payment_method' => 'Cash',
                'payment_type' => 'full',
                'balance' => 0,
                'credited_amount' => 10000,
                'refunded_amount' => 0,
                'due_date' => now()->subDays(7)->toDateString(),
                'status' => 'cancelled',
                'created_by' => $actor->id,
                'notes' => 'DEMO: fully paid booking cancelled with an approved, posted credit note. Ready for refund request.',
            ]);

            $order = SalesOrder::create([
                'order_number' => 'SO-REFUND-DEMO-001',
                'invoice_id' => $invoice->id,
                'agent_id' => $actor->id,
                'status' => 'cancelled',
                'currency' => 'PHP',
                'subtotal' => 10000,
                'tax_amount' => 0,
                'total_amount' => 10000,
                'amount_paid' => 10000,
                'balance' => 0,
                'travel_starts_at' => now()->addDays(21),
                'travel_ends_at' => now()->addDays(24),
                'notes' => 'DEMO: Boracay booking cancelled before departure.',
                'metadata' => ['is_refund_demo' => true],
            ]);

            $adjustment = SalesOrderAdjustment::create([
                'sales_order_id' => $order->id,
                'invoice_id' => $invoice->id,
                'adjustment_number' => 'ADJ-REFUND-DEMO-001',
                'type' => 'cancellation',
                'status' => 'approved',
                'reason' => 'DEMO: customer cancelled within the approved full-refund period.',
                'amount' => 10000,
                'requested_by' => $actor->id,
                'approved_by' => $actor->id,
                'approved_at' => now()->subDay(),
                'effective_at' => now()->subDay(),
            ]);

            $creditNote = CreditNote::create([
                'credit_note_number' => 'CN-REFUND-DEMO-001',
                'sales_order_id' => $order->id,
                'invoice_id' => $invoice->id,
                'sales_order_adjustment_id' => $adjustment->id,
                'status' => 'posted',
                'subtotal' => 10000,
                'tax_amount' => 0,
                'total_amount' => 10000,
                'reason' => $adjustment->reason,
                'issued_by' => $actor->id,
                'issued_at' => now()->subDay(),
                'posted_at' => now()->subDay(),
            ]);

            $collection = Collection::create([
                'client_name' => $invoice->customer_name,
                'service_type' => 'Tour Package',
                'date' => now()->subDays(10)->toDateString(),
                'travel_date' => $order->travel_starts_at->toDateString(),
                'pick_up' => 'JVD Main Office',
                'drop_off' => 'Boracay Island',
                'rate' => 10000,
                'billing_amount' => 10000,
                'paid_amount' => 10000,
                'remaining_balance' => 0,
                'due_date' => $invoice->due_date,
                'collection_status' => 'completed',
                'invoice_id' => $invoice->id,
                'auto_generated' => true,
                'remarks' => 'DEMO REFUND: open this collection and use the Refund workflow panel.',
            ]);

            $collection->payments()->create([
                'payment_date' => now()->subDays(10)->toDateString(),
                'payment_method' => 'Cash',
                'amount' => 10000,
                'balance' => 0,
                'idempotency_key' => 'refund-demo-cash-payment-001',
            ]);

            $returns = Account::where('code', '4050')->firstOrFail();
            $payable = Account::where('code', '2500')->firstOrFail();

            app(LedgerService::class)->recordEntry(
                now()->subDay()->toDateString(),
                "Credit note {$creditNote->credit_note_number}",
                [
                    [
                        'account_id' => $returns->id,
                        'debit' => 10000,
                        'credit' => 0,
                        'description' => "Demo credit note {$creditNote->credit_note_number}",
                    ],
                    [
                        'account_id' => $payable->id,
                        'debit' => 0,
                        'credit' => 10000,
                        'description' => 'Demo customer refund liability',
                    ],
                ],
                $creditNote
            );
        });

        $this->command?->info(
            'Created refund example '.self::INVOICE_NUMBER
            .' — open Accounting > Collections > Completed.'
        );
    }
}
