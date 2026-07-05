<?php

namespace Tests\Feature;

use App\Models\CashBudgetRequest;
use App\Models\TripTicket;
use App\Models\User;
use App\Models\Liquidation;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Services\LedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $driver;
    private TripTicket $tripTicket;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->admin = User::factory()->superAdmin()->create();
        $this->driver = User::factory()->create(['role' => 'driver']);
        
        // Seed accounts
        app(LedgerService::class)->seedDefaultAccounts();

        // Create a trip ticket for driver
        $this->tripTicket = TripTicket::create([
            'control_no'     => 'TT-1001',
            'driver_id'      => $this->driver->id,
            'status'         => 'approved',
            'pick_up'        => 'Manila',
            'drop_off'       => 'Baguio',
            'issue_date'     => '2026-06-08',
            'date_of_travel' => '2026-06-08',
        ]);
    }

    public function test_disbursing_cash_budget_triggers_pending_liquidation_and_ledger_entry()
    {
        // 1. Create a cash budget request linked to the trip ticket
        $budget = CashBudgetRequest::create([
            'date'                  => '2026-06-08',
            'trip_ticket_id'        => $this->tripTicket->id,
            'diesel'                => 5000,
            'meal_allowance'        => 2000,
            'sop'                   => 500,
            'autosweep'             => 1000,
            'easytrip'              => 1500,
            'coach_captain_salary'  => 1000,
            'status'                => 'approved',
            'total_amount'          => 11000,
            'prepared_by'           => $this->admin->id,
        ]);

        // 2. Disburse the cash budget request via controller / API
        $this->actingAs($this->admin)
             ->putJson("/api/v1/cash-budgets/{$budget->id}", [
                 'status' => 'disbursed',
                 'disbursed_amount' => 11000,
             ])
             ->assertOk();

        // 3. Assert that a Liquidation was created
        $this->assertDatabaseHas('liquidations', [
            'trip_ticket_id' => $this->tripTicket->id,
            'employee_id'    => $this->driver->id,
            'status'         => 'pending',
            'total_advanced' => 11000.00,
        ]);

        // 4. Assert that double-entry ledger lines exist
        $employeeAdvancesAcc = Account::where('code', '1200')->first();
        $cashInBankAcc = Account::where('code', '1000')->first();

        // Check if journal entry is created with Employee Advances (debit) and Cash in Bank (credit)
        $journalEntry = JournalEntry::where('reference_type', CashBudgetRequest::class)
                                    ->where('reference_id', $budget->id)
                                    ->first();

        $this->assertNotNull($journalEntry);
        $this->assertCount(2, $journalEntry->ledgerLines);
        
        $this->assertDatabaseHas('ledger_lines', [
            'journal_entry_id' => $journalEntry->id,
            'account_id'       => $employeeAdvancesAcc->id,
            'debit'            => 11000.00,
            'credit'           => 0.00,
        ]);

        $this->assertDatabaseHas('ledger_lines', [
            'journal_entry_id' => $journalEntry->id,
            'account_id'       => $cashInBankAcc->id,
            'debit'            => 0.00,
            'credit'           => 11000.00,
        ]);
    }

    public function test_settling_liquidation_creates_correct_ledger_balances_and_shortages()
    {
        // 1. Create a cash budget request
        $budget = CashBudgetRequest::create([
            'date'                  => '2026-06-08',
            'trip_ticket_id'        => $this->tripTicket->id,
            'diesel'                => 5000,
            'meal_allowance'        => 2000,
            'status'                => 'approved',
            'total_amount'          => 7000,
            'prepared_by'           => $this->admin->id,
        ]);

        // Disburse
        $this->actingAs($this->admin)
             ->putJson("/api/v1/cash-budgets/{$budget->id}", [
                 'status' => 'disbursed',
                 'disbursed_amount' => 7000,
             ])
             ->assertOk();

        $liquidation = Liquidation::where('trip_ticket_id', $this->tripTicket->id)->first();
        $this->assertNotNull($liquidation);

        // 2. Settle liquidation with receipts:
        // Fuel spent: 4800 (Approved)
        // Meals spent: 1800 (Approved)
        // Cash returned: 400
        // Total advanced was 7000. Approved Spent (6600) + Returned Cash (400) = 7000. Zero shortage!
        $payload = [
            'items' => [
                [
                    'expense_category' => 'Fuel',
                    'amount'           => 4800,
                    'receipt_number'   => 'REC-001',
                    'status'           => 'approved',
                ],
                [
                    'expense_category' => 'Meals',
                    'amount'           => 1800,
                    'receipt_number'   => 'REC-002',
                    'status'           => 'approved',
                ]
            ],
            'total_returned' => 400,
            'notes' => 'Settled with zero discrepancies',
        ];

        $this->actingAs($this->admin)
             ->postJson("/api/v1/liquidations/{$liquidation->id}/settle", $payload)
             ->assertOk()
             ->assertJsonPath('data.status', 'settled')
             ->assertJsonPath('data.shortage_amount', 0);

        // Verify the double-entry accounting entries for settlement
        $settlementJournal = JournalEntry::where('reference_type', Liquidation::class)
                                         ->where('reference_id', $liquidation->id)
                                         ->first();

        $this->assertNotNull($settlementJournal);

        $fuelAcc = Account::where('code', '5000')->first();
        $mealsAcc = Account::where('code', '5200')->first();
        $cashOnHandAcc = Account::where('code', '1100')->first();
        $employeeAdvancesAcc = Account::where('code', '1200')->first();

        // 4 ledger lines: Fuel Debit, Meals Debit, Cash returned Debit, Employee Advances Credit
        $this->assertCount(4, $settlementJournal->ledgerLines);

        $this->assertDatabaseHas('ledger_lines', [
            'journal_entry_id' => $settlementJournal->id,
            'account_id'       => $fuelAcc->id,
            'debit'            => 4800.00,
        ]);

        $this->assertDatabaseHas('ledger_lines', [
            'journal_entry_id' => $settlementJournal->id,
            'account_id'       => $mealsAcc->id,
            'debit'            => 1800.00,
        ]);

        $this->assertDatabaseHas('ledger_lines', [
            'journal_entry_id' => $settlementJournal->id,
            'account_id'       => $cashOnHandAcc->id,
            'debit'            => 400.00,
        ]);

        $this->assertDatabaseHas('ledger_lines', [
            'journal_entry_id' => $settlementJournal->id,
            'account_id'       => $employeeAdvancesAcc->id,
            'credit'           => 7000.00,
        ]);
    }

    public function test_disputed_receipts_or_missing_cash_returned_creates_shortage_account_entry()
    {
        // 1. Create a cash budget request
        $budget = CashBudgetRequest::create([
            'date'                  => '2026-06-08',
            'trip_ticket_id'        => $this->tripTicket->id,
            'diesel'                => 10000,
            'status'                => 'approved',
            'total_amount'          => 10000,
            'prepared_by'           => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
             ->putJson("/api/v1/cash-budgets/{$budget->id}", [
                 'status' => 'disbursed',
                 'disbursed_amount' => 10000,
             ])
             ->assertOk();

        $liquidation = Liquidation::where('trip_ticket_id', $this->tripTicket->id)->first();

        // Settle with receipts:
        // Fuel spent: 7500 (Approved)
        // Fuel receipt rejected: 1500 (Disputed)
        // Cash returned: 500
        // Total advanced was 10000. Approved Spent (7500) + Returned (500) = 8000. Shortage: 2000!
        $payload = [
            'items' => [
                [
                    'expense_category' => 'Fuel',
                    'amount'           => 7500,
                    'receipt_number'   => 'REC-OK',
                    'status'           => 'approved',
                ],
                [
                    'expense_category' => 'Fuel',
                    'amount'           => 1500,
                    'receipt_number'   => 'REC-BAD',
                    'status'           => 'disputed', // Accountant rejected it
                ]
            ],
            'total_returned' => 500,
            'notes' => '1500 receipt rejected, 500 missing cash returned',
        ];

        $this->actingAs($this->admin)
             ->postJson("/api/v1/liquidations/{$liquidation->id}/settle", $payload)
             ->assertOk()
             ->assertJsonPath('data.status', 'disputed')
             ->assertJsonPath('data.shortage_amount', 2000);

        // Verify the ledger entries
        $settlementJournal = JournalEntry::where('reference_type', Liquidation::class)
                                         ->where('reference_id', $liquidation->id)
                                         ->first();

        $this->assertNotNull($settlementJournal);

        $fuelAcc = Account::where('code', '5000')->first();
        $cashOnHandAcc = Account::where('code', '1100')->first();
        $cashShortageAcc = Account::where('code', '5900')->first();
        $employeeAdvancesAcc = Account::where('code', '1200')->first();

        // Ledger lines: Approved Fuel (7500 debit), Cash returned (500 debit), Shortage (2000 debit), Employee Advances (10000 credit)
        $this->assertCount(4, $settlementJournal->ledgerLines);

        $this->assertDatabaseHas('ledger_lines', [
            'journal_entry_id' => $settlementJournal->id,
            'account_id'       => $fuelAcc->id,
            'debit'            => 7500.00,
        ]);

        $this->assertDatabaseHas('ledger_lines', [
            'journal_entry_id' => $settlementJournal->id,
            'account_id'       => $cashOnHandAcc->id,
            'debit'            => 500.00,
        ]);

        $this->assertDatabaseHas('ledger_lines', [
            'journal_entry_id' => $settlementJournal->id,
            'account_id'       => $cashShortageAcc->id,
            'debit'            => 2000.00,
        ]);

        $this->assertDatabaseHas('ledger_lines', [
            'journal_entry_id' => $settlementJournal->id,
            'account_id'       => $employeeAdvancesAcc->id,
            'credit'           => 10000.00,
        ]);
    }

    public function test_commission_approval_creates_cash_budget_request()
    {
        $employee = User::factory()->create(['role' => 'driver']);
        
        $commission = \App\Models\Commission::create([
            'serial_no' => 'CMS-2026-00001',
            'commissioner_name' => $employee->first_name . ' ' . $employee->last_name,
            'employee_id' => $employee->id,
            'date' => '2026-06-09',
            'status' => 'draft',
        ]);
        
        $commission->items()->create([
            'travel_date' => '2026-06-09',
            'destination' => 'Laguna',
            'quantity' => 1,
            'amount' => 1500.00,
        ]);
        
        $this->actingAs($this->admin)
             ->putJson("/api/v1/commissions/{$commission->id}", [
                 'status' => 'approved',
             ])
             ->assertOk();
             
        $commission->refresh();
        $this->assertEquals('approved', $commission->status);
        $this->assertEquals($this->admin->id, $commission->approved_by);
        
        $this->assertDatabaseHas('cash_budget_requests', [
            'commission_id' => $commission->id,
            'total_amount' => 1500.00,
            'status' => 'pending_accounting',
        ]);
    }

    public function test_liquidation_overspend_creates_reimbursement_and_credits_2100()
    {
        // Advanced 3000
        $budget = CashBudgetRequest::create([
            'date'                  => '2026-06-08',
            'trip_ticket_id'        => $this->tripTicket->id,
            'diesel'                => 3000,
            'status'                => 'approved',
            'total_amount'          => 3000,
            'prepared_by'           => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
             ->putJson("/api/v1/cash-budgets/{$budget->id}", [
                 'status' => 'disbursed',
                 'disbursed_amount' => 3000,
             ])
             ->assertOk();

        $liquidation = Liquidation::where('trip_ticket_id', $this->tripTicket->id)->first();
        $this->assertNotNull($liquidation);

        // Spent 4500 (extra 1500 out-of-pocket)
        $payload = [
            'items' => [
                [
                    'expense_category' => 'Fuel',
                    'amount'           => 4500,
                    'receipt_number'   => 'REC-OVER',
                    'status'           => 'approved',
                ]
            ],
            'total_returned' => 0,
            'notes' => 'Overspent',
        ];

        $this->actingAs($this->admin)
             ->postJson("/api/v1/liquidations/{$liquidation->id}/settle", $payload)
             ->assertOk();

        $liquidation->refresh();
        // shortage is negative
        $this->assertEquals(-1500.00, $liquidation->shortage_amount);
        
        // Assert a Cash Budget Request reimbursement was created
        $this->assertDatabaseHas('cash_budget_requests', [
            'liquidation_id' => $liquidation->id,
            'total_amount' => 1500.00,
            'status' => 'pending_accounting',
        ]);

        // Assert Credit to Due to Employees (2100) and Debit to Fuel (5000)
        $settlementJournal = JournalEntry::where('reference_type', Liquidation::class)
                                         ->where('reference_id', $liquidation->id)
                                         ->first();
        $this->assertNotNull($settlementJournal);

        $dueToEmployeesAcc = Account::where('code', '2100')->first();
        $fuelAcc = Account::where('code', '5000')->first();
        $employeeAdvancesAcc = Account::where('code', '1200')->first();

        // 3 ledger lines: Fuel Debit 4500, Employee Advances Credit 3000, Due to Employees Credit 1500
        $this->assertDatabaseHas('ledger_lines', [
            'journal_entry_id' => $settlementJournal->id,
            'account_id'       => $fuelAcc->id,
            'debit'            => 4500.00,
            'credit'           => 0.00,
        ]);

        $this->assertDatabaseHas('ledger_lines', [
            'journal_entry_id' => $settlementJournal->id,
            'account_id'       => $dueToEmployeesAcc->id,
            'debit'            => 0.00,
            'credit'           => 1500.00,
        ]);

        $this->assertDatabaseHas('ledger_lines', [
            'journal_entry_id' => $settlementJournal->id,
            'account_id'       => $employeeAdvancesAcc->id,
            'debit'            => 0.00,
            'credit'           => 3000.00,
        ]);
    }

    public function test_liquidation_underspend_creates_collection_payment_syncs_liquidation()
    {
        // Advanced 5000
        $budget = CashBudgetRequest::create([
            'date'                  => '2026-06-08',
            'trip_ticket_id'        => $this->tripTicket->id,
            'diesel'                => 5000,
            'status'                => 'approved',
            'total_amount'          => 5000,
            'prepared_by'           => $this->admin->id,
        ]);

        $this->actingAs($this->admin)
             ->putJson("/api/v1/cash-budgets/{$budget->id}", [
                 'status' => 'disbursed',
                 'disbursed_amount' => 5000,
             ])
             ->assertOk();

        $liquidation = Liquidation::where('trip_ticket_id', $this->tripTicket->id)->first();

        // Spent 3000, returned 0 cash. Shortage of 2000!
        $payload = [
            'items' => [
                [
                    'expense_category' => 'Fuel',
                    'amount'           => 3000,
                    'receipt_number'   => 'REC-UNDER',
                    'status'           => 'approved',
                ]
            ],
            'total_returned' => 0,
            'notes' => 'Shortage of 2000',
        ];

        $this->actingAs($this->admin)
             ->postJson("/api/v1/liquidations/{$liquidation->id}/settle", $payload)
             ->assertOk();

        $liquidation->refresh();
        $this->assertEquals(2000.00, $liquidation->shortage_amount);
        $this->assertEquals('disputed', $liquidation->status); // because there is a shortage

        // Assert Collection record created
        $this->assertDatabaseHas('collections', [
            'liquidation_id' => $liquidation->id,
            'employee_id' => $this->driver->id,
            'billing_amount' => 2000.00,
            'remaining_balance' => 2000.00,
            'service_type' => 'Other',
            'other_service_type' => 'Driver Shortage',
        ]);

        $collection = \App\Models\Collection::where('liquidation_id', $liquidation->id)->first();
        $this->assertNotNull($collection);

        // Record a collection payment of 1200
        $this->actingAs($this->admin)
             ->postJson("/api/v1/collections/{$collection->id}/add-payment", [
                 'payment_date' => '2026-06-09',
                 'payment_method' => 'Cash',
                 'amount' => 1200.00,
             ])
             ->assertOk();

        $collection->refresh();
        $this->assertEquals(800.00, $collection->remaining_balance);
        $this->assertEquals(1200.00, $collection->paid_amount);

        // Assert liquidation shortage updated
        $liquidation->refresh();
        $this->assertEquals(800.00, $liquidation->shortage_amount);
        $this->assertEquals('disputed', $liquidation->status);

        // Pay the remaining 800
        $this->actingAs($this->admin)
             ->postJson("/api/v1/collections/{$collection->id}/add-payment", [
                 'payment_date' => '2026-06-09',
                 'payment_method' => 'Cash',
                 'amount' => 800.00,
             ])
             ->assertOk();

        $collection->refresh();
        $this->assertEquals(0.00, $collection->remaining_balance);
        $this->assertEquals('completed', $collection->collection_status);

        $liquidation->refresh();
        $this->assertEquals(0.00, $liquidation->shortage_amount);
        $this->assertEquals('settled', $liquidation->status);
    }

    public function test_disbursing_po_cash_budget_creates_invoice_with_items_and_supplier_name()
    {
        $supplier = \App\Models\Supplier::factory()->create([
            'company_name' => 'Apex Parts Supply',
            'accreditation_status' => 'accredited',
        ]);
        
        $po = \App\Models\PurchaseOrder::create([
            'po_number' => 'PO-2026-9999',
            'supplier_id' => $supplier->id,
            'created_by' => $this->admin->id,
            'status' => 'pending_ceo_approval',
            'total_amount' => 4500,
        ]);
        
        $po->lineItems()->create([
            'item_name' => 'Brake Shoes',
            'quantity' => 2,
            'unit_price' => 1500,
            'total_price' => 3000,
        ]);
        
        $po->lineItems()->create([
            'item_name' => 'Gear Oil',
            'quantity' => 5,
            'unit_price' => 300,
            'total_price' => 1500,
        ]);
        
        $budget = CashBudgetRequest::create([
            'date'              => '2026-06-08',
            'purchase_order_id' => $po->id,
            'status'            => 'pending_super_admin',
            'total_amount'      => 4500,
            'prepared_by'       => $this->admin->id,
        ]);

        // Super Admin final approval (pending_super_admin → approved) — disbursement is
        // intentionally gated behind this step (CashBudgetRequestController STEP 2b/STEP 3),
        // so a budget cannot jump straight from pending_super_admin to disbursed.
        $this->actingAs($this->admin)
             ->putJson("/api/v1/cash-budgets/{$budget->id}", [
                 'status' => 'approved',
             ])
             ->assertOk();

        $this->actingAs($this->admin)
             ->putJson("/api/v1/cash-budgets/{$budget->id}", [
                 'status' => 'disbursed',
                 'disbursed_amount' => 4500,
             ])
             ->assertOk();
             
        // Check that invoice exists
        $invoice = \App\Models\Invoice::where('cash_budget_request_id', $budget->id)->first();
        $this->assertNotNull($invoice);
        $this->assertEquals('Apex Parts Supply', $invoice->customer_name);
        $this->assertEquals(4500.00, $invoice->total_amount);
        
        // Check invoice items
        $this->assertCount(2, $invoice->items);
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoice->id,
            'unit_price' => 1500.00,
            'quantity' => 2,
            'total_price' => 3000.00,
        ]);
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoice->id,
            'unit_price' => 300.00,
            'quantity' => 5,
            'total_price' => 1500.00,
        ]);
    }
}
