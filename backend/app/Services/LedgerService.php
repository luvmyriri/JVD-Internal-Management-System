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
        // Defensive: guarantee the chart of accounts exists before any entry is recorded,
        // regardless of which call site reaches this first (accounts aren't part of the
        // default seeder chain, so a fresh deploy would otherwise have zero Account rows).
        $this->seedDefaultAccounts();

        return DB::transaction(function () use ($date, $notes, $entries, $reference) {
            if (count($entries) < 2) {
                throw new Exception("Journal entry must have at least 2 entries (debit and credit).");
            }

            $totalDebitCents = 0;
            $totalCreditCents = 0;

            foreach ($entries as $entry) {
                $debit = round($entry['debit'] ?? 0, 2);
                $credit = round($entry['credit'] ?? 0, 2);

                if ($debit < 0 || $credit < 0) {
                    throw new Exception("Debit and credit amounts cannot be negative.");
                }

                if ($debit > 0 && $credit > 0) {
                    throw new Exception("A single line item cannot have both a debit and a credit amount.");
                }

                $totalDebitCents += (int) round($debit * 100);
                $totalCreditCents += (int) round($credit * 100);
            }

            if ($totalDebitCents !== $totalCreditCents) {
                $totalDebitFormatted = number_format($totalDebitCents / 100, 2);
                $totalCreditFormatted = number_format($totalCreditCents / 100, 2);
                throw new Exception("Journal entry unbalanced. Debits: {$totalDebitFormatted}, Credits: {$totalCreditFormatted}");
            }

            if ($totalDebitCents === 0) {
                throw new Exception("Journal entry cannot be empty or have a zero total amount.");
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
            ['code' => '2100', 'name' => 'Due to Employees', 'type' => 'liability'],       // For over-liquidations
            ['code' => '2200', 'name' => 'Accrued Payroll', 'type' => 'liability'],         // Net pay owed to staff
            ['code' => '2300', 'name' => 'Tax/Deductions Payable', 'type' => 'liability'],  // BIR withholding tax
            ['code' => '4000', 'name' => 'Service Revenue', 'type' => 'revenue'],
            ['code' => '5000', 'name' => 'Fuel Expense', 'type' => 'expense'],
            ['code' => '5100', 'name' => 'Toll Expense', 'type' => 'expense'],
            ['code' => '5200', 'name' => 'Meals Expense', 'type' => 'expense'],
            ['code' => '5300', 'name' => 'Maintenance Expense', 'type' => 'expense'],
            ['code' => '5400', 'name' => 'Commission Expense', 'type' => 'expense'],
            ['code' => '5900', 'name' => 'Cash Shortage', 'type' => 'expense'],             // Or Other Expense
            ['code' => '6000', 'name' => 'Salary Expense', 'type' => 'expense'],            // Gross payroll cost
        ];

        foreach ($defaults as $data) {
            Account::firstOrCreate(['code' => $data['code']], $data);
        }
    }
}
