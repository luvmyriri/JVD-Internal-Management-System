<?php

namespace App\Services;

use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\LedgerLine;
use Illuminate\Support\Facades\DB;
use Exception;

class LedgerService
{
    /**
     * Record a balanced double-entry journal.
     *
     * @param string $date
     * @param string $notes
     * @param array $entries Array of ['account_id' => int, 'debit' => float, 'credit' => float, 'description' => string]
     * @param mixed $reference Optional polymorphic model (e.g., Liquidation, TripTicket)
     * @return JournalEntry
     * @throws Exception
     */
    public function recordEntry(string $date, string $notes, array $entries, $reference = null): JournalEntry
    {
        return DB::transaction(function () use ($date, $notes, $entries, $reference) {
            $totalDebit = 0;
            $totalCredit = 0;

            foreach ($entries as $entry) {
                $totalDebit += round($entry['debit'] ?? 0, 2);
                $totalCredit += round($entry['credit'] ?? 0, 2);
            }

            if (round($totalDebit, 2) !== round($totalCredit, 2)) {
                throw new Exception("Journal entry unbalanced. Debits: {$totalDebit}, Credits: {$totalCredit}");
            }

            $journalEntry = new JournalEntry();
            $journalEntry->date = $date;
            $journalEntry->notes = $notes;
            
            if ($reference) {
                $journalEntry->reference_type = get_class($reference);
                $journalEntry->reference_id = $reference->id;
            }
            
            $journalEntry->save();

            foreach ($entries as $entry) {
                $journalEntry->ledgerLines()->create([
                    'account_id'  => $entry['account_id'],
                    'debit'       => $entry['debit'] ?? 0,
                    'credit'      => $entry['credit'] ?? 0,
                    'description' => $entry['description'] ?? null,
                ]);
            }

            return $journalEntry;
        });
    }

    /**
     * Ensure default accounts exist.
     */
    public function seedDefaultAccounts(): void
    {
        $defaults = [
            ['code' => '1000', 'name' => 'Cash in Bank', 'type' => 'asset'],
            ['code' => '1100', 'name' => 'Cash on Hand', 'type' => 'asset'],
            ['code' => '1200', 'name' => 'Employee Advances', 'type' => 'asset'],
            ['code' => '2000', 'name' => 'Accounts Payable', 'type' => 'liability'],
            ['code' => '2100', 'name' => 'Due to Employees', 'type' => 'liability'], // For over-liquidations
            ['code' => '4000', 'name' => 'Service Revenue', 'type' => 'revenue'],
            ['code' => '5000', 'name' => 'Fuel Expense', 'type' => 'expense'],
            ['code' => '5100', 'name' => 'Toll Expense', 'type' => 'expense'],
            ['code' => '5200', 'name' => 'Meals Expense', 'type' => 'expense'],
            ['code' => '5300', 'name' => 'Maintenance Expense', 'type' => 'expense'],
            ['code' => '5400', 'name' => 'Commission Expense', 'type' => 'expense'],
            ['code' => '5900', 'name' => 'Cash Shortage', 'type' => 'expense'], // Or Other Expense
        ];

        foreach ($defaults as $data) {
            Account::firstOrCreate(['code' => $data['code']], $data);
        }
    }
}
