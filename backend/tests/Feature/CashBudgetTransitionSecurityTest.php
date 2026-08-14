<?php

namespace Tests\Feature;

use App\Models\CashBudgetRequest;
use App\Models\JournalEntry;
use App\Models\User;
use App\Services\LedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CashBudgetTransitionSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_submission_creates_workflow_but_no_financial_artifacts(): void
    {
        $operations = User::factory()->create(['role' => 'operations_manager']);

        $response = $this->actingAs($operations)->postJson('/api/v1/cash-budgets', [
            'date' => '2026-08-14',
            'destination' => 'Submission-only destination',
            'diesel' => 500,
            'total_amount' => 500,
        ])->assertCreated();

        $budget = CashBudgetRequest::findOrFail($response->json('id'));
        $this->assertSame('pending_accounting', $budget->status);
        $this->assertNotNull($budget->workflowInstance);
        $this->assertNoFinancialArtifacts($budget);
    }

    public function test_accounting_cannot_skip_a_draft_directly_to_approved_and_nothing_changes(): void
    {
        $accounting = User::factory()->create(['role' => 'accounting_executive']);
        $budget = $this->createBudget($accounting, [
            'status' => 'draft',
            'diesel' => 100,
            'total_amount' => 100,
        ]);

        $this->actingAs($accounting)
            ->putJson("/api/v1/cash-budgets/{$budget->id}", [
                'status' => 'approved',
                'diesel' => 999,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Invalid cash budget transition from draft to approved.');

        $budget->refresh();
        $this->assertSame('draft', $budget->status);
        $this->assertEquals(100, $budget->diesel);
        $this->assertNull($budget->approved_by);
        $this->assertNoTransitionArtifacts($budget);
    }

    public function test_super_admin_cannot_skip_a_draft_directly_to_disbursed_and_nothing_changes(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $budget = $this->createBudget($superAdmin, [
            'status' => 'draft',
            'diesel' => 500,
            'total_amount' => 500,
        ]);

        $this->actingAs($superAdmin)
            ->putJson("/api/v1/cash-budgets/{$budget->id}", [
                'status' => 'disbursed',
                'diesel' => 750,
                'disbursed_amount' => 750,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('error', 'Invalid cash budget transition from draft to disbursed.');

        $budget->refresh();
        $this->assertSame('draft', $budget->status);
        $this->assertEquals(500, $budget->diesel);
        $this->assertNull($budget->disbursed_amount);
        $this->assertNull($budget->disbursed_by);
        $this->assertNoTransitionArtifacts($budget);
    }

    public function test_non_accounting_actor_cannot_approve_pending_accounting_and_nothing_changes(): void
    {
        $preparer = User::factory()->create(['role' => 'operations_manager']);
        $budget = $this->createBudget($preparer, [
            'status' => 'pending_accounting',
            'diesel' => 300,
            'total_amount' => 300,
        ]);

        $this->actingAs($preparer)
            ->putJson("/api/v1/cash-budgets/{$budget->id}", [
                'status' => 'approved',
                'diesel' => 600,
            ])
            ->assertForbidden()
            ->assertJsonPath('error', 'You are not authorized to perform this cash budget transition.');

        $budget->refresh();
        $this->assertSame('pending_accounting', $budget->status);
        $this->assertEquals(300, $budget->diesel);
        $this->assertNull($budget->approved_by);
        $this->assertNoTransitionArtifacts($budget);
    }

    public function test_failed_disbursement_rolls_back_workflow_and_budget_changes(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $budget = $this->createBudget($superAdmin, [
            'status' => 'approved',
            'diesel' => 100,
            'total_amount' => 100,
        ]);

        $this->withoutExceptionHandling();

        try {
            $this->actingAs($superAdmin)
                ->putJson("/api/v1/cash-budgets/{$budget->id}", [
                    'status' => 'disbursed',
                    'disbursed_amount' => 111,
                ]);

            $this->fail('An excessive disbursement must be rejected.');
        } catch (\InvalidArgumentException $exception) {
            $this->assertStringContainsString('cannot exceed 110%', $exception->getMessage());
        }

        $budget->refresh();
        $this->assertSame('approved', $budget->status);
        $this->assertNull($budget->disbursed_amount);
        $this->assertNull($budget->disbursed_by);
        $this->assertNoTransitionArtifacts($budget);
    }

    public function test_legal_accounting_executive_and_disbursement_sequence_is_preserved(): void
    {
        Notification::fake();
        app(LedgerService::class)->seedDefaultAccounts();

        $operations = User::factory()->create(['role' => 'operations_manager']);
        $accounting = User::factory()->create(['role' => 'accounting_executive']);
        $executive = User::factory()->create(['role' => 'executive_vice_president']);
        $budget = $this->createBudget($operations, [
            'status' => 'draft',
            'diesel' => 1000,
            'total_amount' => 1000,
        ]);

        $this->actingAs($operations)
            ->putJson("/api/v1/cash-budgets/{$budget->id}", ['status' => 'pending_accounting'])
            ->assertOk()
            ->assertJsonPath('status', 'pending_accounting');
        $this->assertNoFinancialArtifacts($budget->fresh());

        $this->actingAs($accounting)
            ->putJson("/api/v1/cash-budgets/{$budget->id}", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('status', 'pending_super_admin');
        $this->assertNoFinancialArtifacts($budget->fresh());

        $this->actingAs($executive)
            ->putJson("/api/v1/cash-budgets/{$budget->id}", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('status', 'approved');
        $this->assertNoFinancialArtifacts($budget->fresh());

        $this->actingAs($executive)
            ->putJson("/api/v1/cash-budgets/{$budget->id}", [
                'status' => 'disbursed',
                'disbursed_amount' => 900,
            ])
            ->assertOk()
            ->assertJsonPath('status', 'disbursed');

        $budget->refresh();
        $workflow = $budget->workflowInstance;

        $this->assertSame('disbursed', $budget->status);
        $this->assertSame($accounting->id, $budget->approved_by);
        $this->assertSame($executive->id, $budget->super_admin_approved_by);
        $this->assertSame($executive->id, $budget->disbursed_by);
        $this->assertEquals(900, $budget->disbursed_amount);
        $this->assertNotNull($workflow);
        $this->assertSame('completed', $workflow->status);
        $this->assertSame(3, $workflow->actions()->count());
        $this->assertNotNull($budget->liquidation_id);
        $this->assertDatabaseHas('liquidations', [
            'id' => $budget->liquidation_id,
            'total_advanced' => 900,
        ]);
        $this->assertDatabaseHas('journal_entries', [
            'reference_type' => CashBudgetRequest::class,
            'reference_id' => $budget->id,
        ]);
        $journal = JournalEntry::where('reference_type', CashBudgetRequest::class)
            ->where('reference_id', $budget->id)
            ->firstOrFail();
        $this->assertSame(1, JournalEntry::where('reference_type', CashBudgetRequest::class)
            ->where('reference_id', $budget->id)->count());
        $this->assertEquals(900, (float) $journal->ledgerLines()->sum('debit'));
        $this->assertEquals(900, (float) $journal->ledgerLines()->sum('credit'));
        $this->assertDatabaseHas('invoices', [
            'cash_budget_request_id' => $budget->id,
            'total_amount' => 900,
        ]);
        $invoice = $budget->invoice()->firstOrFail();
        $this->assertEquals(900, (float) $invoice->items()->sum('total_price'));
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoice->id,
            'item_name' => 'Cash retained / amount not released',
            'total_price' => -100,
        ]);
    }

    public function test_submitted_source_amount_and_disbursement_fields_are_locked(): void
    {
        $operations = User::factory()->create(['role' => 'operations_manager']);
        $budget = $this->createBudget($operations, [
            'status' => 'pending_accounting',
            'total_amount' => 500,
        ]);

        $this->actingAs($operations)
            ->putJson("/api/v1/cash-budgets/{$budget->id}", ['trip_ticket_id' => null])
            ->assertUnprocessable();
        $this->actingAs($operations)
            ->putJson("/api/v1/cash-budgets/{$budget->id}", ['total_amount' => 900])
            ->assertUnprocessable();
        $this->actingAs($operations)
            ->putJson("/api/v1/cash-budgets/{$budget->id}", ['disbursed_amount' => 500])
            ->assertUnprocessable();

        $budget->refresh();
        $this->assertEquals(500, $budget->total_amount);
        $this->assertNull($budget->trip_ticket_id);
        $this->assertNull($budget->disbursed_amount);
    }

    public function test_non_owner_cannot_edit_another_users_draft_amount(): void
    {
        $owner = User::factory()->create(['role' => 'operations_manager']);
        $other = User::factory()->create(['role' => 'accounting_executive']);
        $budget = $this->createBudget($owner, ['status' => 'draft', 'total_amount' => 500]);

        $this->actingAs($other)
            ->putJson("/api/v1/cash-budgets/{$budget->id}", ['total_amount' => 900])
            ->assertForbidden();

        $this->assertEquals(500, $budget->fresh()->total_amount);
    }

    public function test_submitted_cash_budget_cannot_be_deleted_with_its_workflow_history(): void
    {
        $operations = User::factory()->create(['role' => 'operations_manager']);
        $budget = $this->createBudget($operations, ['status' => 'draft', 'total_amount' => 500]);

        $this->actingAs($operations)
            ->putJson("/api/v1/cash-budgets/{$budget->id}", ['status' => 'pending_accounting'])
            ->assertOk();
        $workflowId = $budget->fresh()->workflowInstance?->id;

        $this->actingAs($operations)
            ->deleteJson("/api/v1/cash-budgets/{$budget->id}")
            ->assertUnprocessable();

        $this->assertDatabaseHas('cash_budget_requests', ['id' => $budget->id, 'status' => 'pending_accounting']);
        $this->assertNotNull($workflowId);
        $this->assertDatabaseHas('workflow_instances', ['id' => $workflowId]);
    }

    public function test_negative_direct_total_is_rejected_on_creation(): void
    {
        $operations = User::factory()->create(['role' => 'operations_manager']);

        $this->actingAs($operations)
            ->postJson('/api/v1/cash-budgets', [
                'date' => '2026-08-14',
                'destination' => 'Test destination',
                'total_amount' => -1,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('total_amount');

        $this->assertDatabaseCount('cash_budget_requests', 0);
    }

    private function createBudget(User $preparer, array $overrides = []): CashBudgetRequest
    {
        return CashBudgetRequest::create(array_merge([
            'date' => '2026-08-14',
            'destination' => 'Test destination',
            'status' => 'draft',
            'total_amount' => 0,
            'prepared_by' => $preparer->id,
        ], $overrides));
    }

    private function assertNoTransitionArtifacts(CashBudgetRequest $budget): void
    {
        $this->assertDatabaseMissing('workflow_instances', [
            'subject_type' => CashBudgetRequest::class,
            'subject_id' => $budget->id,
        ]);
        $this->assertNull($budget->liquidation_id);
        $this->assertDatabaseCount('workflow_actions', 0);
        $this->assertDatabaseCount('liquidations', 0);
        $this->assertDatabaseCount('journal_entries', 0);
        $this->assertDatabaseCount('invoices', 0);
    }

    private function assertNoFinancialArtifacts(CashBudgetRequest $budget): void
    {
        $this->assertNull($budget->liquidation_id);
        $this->assertDatabaseMissing('journal_entries', [
            'reference_type' => CashBudgetRequest::class,
            'reference_id' => $budget->id,
        ]);
        $this->assertDatabaseMissing('invoices', ['cash_budget_request_id' => $budget->id]);
    }
}
