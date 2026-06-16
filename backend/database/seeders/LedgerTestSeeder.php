<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Services\LedgerService;
use App\Models\TripTicket;
use Carbon\Carbon;

class LedgerTestSeeder extends Seeder
{
    public function run(): void
    {
        $ledgerService = app(LedgerService::class);
        $ledgerService->seedDefaultAccounts();

        $now = Carbon::now();

        // 1. Initial Investment / Capital Injection
        $ledgerService->recordEntry(
            $now->copy()->subDays(10)->format('Y-m-d'),
            'Initial Capital Injection from Owners',
            [
                ['account_id' => 1, 'debit' => 500000.00, 'credit' => 0, 'description' => 'Deposit to Corporate Bank Account'],
                ['account_id' => 6, 'debit' => 0, 'credit' => 500000.00, 'description' => 'Owner Equity / Investment'] // Assumes account_id 6 is Revenue or Equity. We will use Service Revenue for now.
            ]
        );

        // 2. Fuel Expense Disbursement for a Trip
        $ledgerService->recordEntry(
            $now->copy()->subDays(5)->format('Y-m-d'),
            'Fuel Disbursement for Trip TT-2026-1010',
            [
                ['account_id' => 3, 'debit' => 10000.00, 'credit' => 0, 'description' => 'Employee Cash Advance to Eduardo'],
                ['account_id' => 1, 'debit' => 0, 'credit' => 10000.00, 'description' => 'Cash withdrawn from Bank']
            ]
        );

        // 3. Liquidation Settlement
        $ledgerService->recordEntry(
            $now->copy()->subDays(2)->format('Y-m-d'),
            'Liquidation Settlement for TT-2026-1010',
            [
                ['account_id' => 7, 'debit' => 6000.00, 'credit' => 0, 'description' => 'Fuel Expense Recognized'],
                ['account_id' => 8, 'debit' => 1500.00, 'credit' => 0, 'description' => 'Toll Expense Recognized'],
                ['account_id' => 9, 'debit' => 2500.00, 'credit' => 0, 'description' => 'Meals Expense Recognized'],
                ['account_id' => 3, 'debit' => 0, 'credit' => 10000.00, 'description' => 'Clearing Employee Advance']
            ]
        );

        // 4. Passenger Booking Revenue
        $ledgerService->recordEntry(
            $now->copy()->subDays(1)->format('Y-m-d'),
            'Passenger Booking Sales - Vigan Tour',
            [
                ['account_id' => 1, 'debit' => 45000.00, 'credit' => 0, 'description' => 'Cash received from customers'],
                ['account_id' => 6, 'debit' => 0, 'credit' => 45000.00, 'description' => 'Service Revenue Recognized']
            ]
        );
        
        // 5. Commission Payout
        $ledgerService->recordEntry(
            $now->format('Y-m-d'),
            'Agent Commission Payout - Ken Baynosa',
            [
                ['account_id' => 11, 'debit' => 2000.00, 'credit' => 0, 'description' => 'Commission Expense Recognized'],
                ['account_id' => 1, 'debit' => 0, 'credit' => 2000.00, 'description' => 'Cash disbursed from Bank']
            ]
        );
    }
}
