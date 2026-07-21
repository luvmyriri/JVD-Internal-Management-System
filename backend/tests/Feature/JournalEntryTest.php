<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use App\Services\LedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class JournalEntryTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private User $driver;

    protected function setUp(): void
    {
        parent::setUp();
        app(LedgerService::class)->seedDefaultAccounts();
        $this->accountant = User::factory()->create(['role' => 'accounting_executive']);
        $this->driver = User::factory()->create(['role' => 'driver']);
    }

    private function acc(string $code): Account
    {
        return Account::where('code', $code)->firstOrFail();
    }

    public function test_accounting_user_can_post_a_balanced_manual_entry(): void
    {
        $payload = [
            'date' => '2026-07-01',
            'notes' => 'Owner cash injection',
            'lines' => [
                ['account_id' => $this->acc('1000')->id, 'debit' => 5000, 'credit' => 0],
                ['account_id' => $this->acc('4000')->id, 'debit' => 0, 'credit' => 5000],
            ],
        ];

        $this->actingAs($this->accountant)
            ->postJson('/api/v1/accounting/journal-entries', $payload)
            ->assertStatus(201)
            ->assertJsonPath('success', true);

        // Manual entries carry no polymorphic reference.
        $this->assertDatabaseHas('journal_entries', [
            'notes' => 'Owner cash injection',
            'reference_type' => null,
            'reference_id' => null,
        ]);
        $this->assertDatabaseCount('ledger_lines', 2);
    }

    public function test_unbalanced_entry_is_rejected_and_nothing_is_posted(): void
    {
        $payload = [
            'date' => '2026-07-01',
            'notes' => 'Broken entry',
            'lines' => [
                ['account_id' => $this->acc('1000')->id, 'debit' => 5000, 'credit' => 0],
                ['account_id' => $this->acc('4000')->id, 'debit' => 0, 'credit' => 4000],
            ],
        ];

        $this->actingAs($this->accountant)
            ->postJson('/api/v1/accounting/journal-entries', $payload)
            ->assertStatus(422);

        $this->assertDatabaseMissing('journal_entries', ['notes' => 'Broken entry']);
    }

    public function test_non_accounting_role_cannot_post_entries(): void
    {
        $payload = [
            'date' => '2026-07-01',
            'notes' => 'Sneaky entry',
            'lines' => [
                ['account_id' => $this->acc('1000')->id, 'debit' => 100, 'credit' => 0],
                ['account_id' => $this->acc('4000')->id, 'debit' => 0, 'credit' => 100],
            ],
        ];

        $this->actingAs($this->driver)
            ->postJson('/api/v1/accounting/journal-entries', $payload)
            ->assertStatus(403);

        $this->assertDatabaseMissing('journal_entries', ['notes' => 'Sneaky entry']);
    }

    public function test_csv_import_posts_balanced_groups_and_reports_failures(): void
    {
        $csv = implode("\n", [
            'entry_ref,date,notes,account_code,debit,credit,description',
            'E1,2026-07-01,Opening balance,1000,5000,0,cash',
            'E1,2026-07-01,Opening balance,4000,0,5000,revenue',
            'E2,2026-07-01,Unbalanced,1000,100,0,cash',
            'E2,2026-07-01,Unbalanced,4000,0,50,revenue',
            'E3,2026-07-01,Bad account,9999,10,0,nope',
            'E3,2026-07-01,Bad account,4000,0,10,revenue',
        ]) . "\n";

        $file = UploadedFile::fake()->createWithContent('entries.csv', $csv);

        $response = $this->actingAs($this->accountant)
            ->post('/api/v1/accounting/journal-entries/import', ['file' => $file], ['Accept' => 'application/json'])
            ->assertStatus(207); // partial success

        $response->assertJsonPath('data.posted_count', 1);
        $response->assertJsonPath('data.failed_count', 2);

        // Only the balanced, valid group posted.
        $this->assertDatabaseHas('journal_entries', ['notes' => 'Opening balance']);
        $this->assertDatabaseMissing('journal_entries', ['notes' => 'Unbalanced']);
        $this->assertDatabaseMissing('journal_entries', ['notes' => 'Bad account']);
    }

    public function test_fully_valid_csv_returns_201(): void
    {
        $csv = implode("\n", [
            'entry_ref,date,notes,account_code,debit,credit,description',
            'A1,2026-07-02,Fuel purchase,5000,300,0,fuel',
            'A1,2026-07-02,Fuel purchase,1000,0,300,cash',
        ]) . "\n";

        $file = UploadedFile::fake()->createWithContent('ok.csv', $csv);

        $this->actingAs($this->accountant)
            ->post('/api/v1/accounting/journal-entries/import', ['file' => $file], ['Accept' => 'application/json'])
            ->assertStatus(201)
            ->assertJsonPath('data.posted_count', 1)
            ->assertJsonPath('data.failed_count', 0);
    }
}
