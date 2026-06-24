<?php

namespace App\Services;

use App\Models\Liquidation;
use App\Models\TripTicket;
use Illuminate\Support\Facades\DB;
use Exception;

class LiquidationService
{
    /**
     * Create a pending liquidation when a trip ticket is disbursed.
     */
    public function createForTripTicket(TripTicket $tripTicket, float $disbursedAmount): Liquidation
    {
        return Liquidation::create([
            'trip_ticket_id' => $tripTicket->id,
            'employee_id'    => $tripTicket->driver_id,
            'status'         => 'pending',
            'total_advanced' => $disbursedAmount,
        ]);
    }

    /**
     * Settle a liquidation based on submitted items.
     */
    public function settleLiquidation(Liquidation $liquidation, array $items, float $totalReturnedCash, string $notes = null): Liquidation
    {
        return DB::transaction(function () use ($liquidation, $items, $totalReturnedCash, $notes) {
            $liquidation->items()->delete(); // Clear existing

            $totalSpent = 0;
            $hasDisputes = false;

            foreach ($items as $item) {
                $liquidation->items()->create([
                    'expense_category' => $item['expense_category'],
                    'amount'           => $item['amount'],
                    'receipt_number'   => $item['receipt_number'] ?? null,
                    'status'           => $item['status'] ?? 'approved', // approved or disputed
                    'notes'            => $item['notes'] ?? null,
                ]);

                if (($item['status'] ?? 'approved') === 'disputed') {
                    $hasDisputes = true;
                } else {
                    $totalSpent += $item['amount'];
                }
            }

            $shortage = $liquidation->total_advanced - ($totalSpent + $totalReturnedCash);
            
            if ($shortage > 0) {
                // If they didn't return enough cash, the remaining is a shortage
                $hasDisputes = true;

                // Create a Collection record for the driver shortage
                \App\Models\Collection::create([
                    'liquidation_id'     => $liquidation->id,
                    'employee_id'        => $liquidation->employee_id,
                    'client_name'        => "Driver Shortage - " . ($liquidation->employee ? "{$liquidation->employee->first_name} {$liquidation->employee->last_name}" : "Employee #{$liquidation->employee_id}"),
                    'date'               => date('Y-m-d'),
                    'travel_date'        => date('Y-m-d'),
                    'rate'               => $shortage,
                    'billing_amount'     => $shortage,
                    'remaining_balance'  => $shortage,
                    'collection_status'  => 'pending',
                    'service_type'       => 'Other',
                    'other_service_type' => 'Driver Shortage',
                    'auto_generated'     => true,
                ]);
            }

            if ($shortage < 0) {
                // If they spent out of pocket, automatically create a CashBudgetRequest for reimbursement
                $reimbursementAmount = abs($shortage);
                \App\Models\CashBudgetRequest::create([
                    'date'                 => date('Y-m-d'),
                    'travel_date'          => date('Y-m-d'),
                    'destination'          => "Liquidation Reimbursement - " . ($liquidation->tripTicket?->control_no ?? "Liquidation #{$liquidation->id}"),
                    'meal_allowance'       => $reimbursementAmount,
                    'total_amount'         => $reimbursementAmount,
                    'status'               => 'pending_accounting',
                    'prepared_by'          => auth()->id() ?? $liquidation->employee_id,
                    'liquidation_id'       => $liquidation->id,
                ]);
            }

            $liquidation->update([
                'total_spent'     => $totalSpent,
                'total_returned'  => $totalReturnedCash,
                'shortage_amount' => $shortage,
                'status'          => $hasDisputes ? 'disputed' : 'settled',
                'notes'           => $notes,
            ]);

            // Create double-entry journal entry in Ledger
            $ledgerService = app(LedgerService::class);
            $employeeAdvancesAccount = \App\Models\Account::where('code', '1200')->first();
            $cashOnHandAccount = \App\Models\Account::where('code', '1100')->first();
            $cashShortageAccount = \App\Models\Account::where('code', '5900')->first();
            
            // Map expense categories to accounts
            $categoryToAccountCode = [
                'Fuel' => '5000',
                'Toll' => '5100',
                'Meals' => '5200',
                'Parts' => '5300',
                'Other' => '5300',
            ];
            
            $ledgerEntries = [];
            
            // 1. Debit all approved expenses
            foreach ($items as $item) {
                if (($item['status'] ?? 'approved') === 'approved') {
                    $code = $categoryToAccountCode[$item['expense_category']] ?? '5300';
                    $account = \App\Models\Account::where('code', $code)->first();
                    if ($account) {
                        $ledgerEntries[] = [
                            'account_id' => $account->id,
                            'debit' => $item['amount'],
                            'credit' => 0,
                            'description' => $item['expense_category'] . ' expense for liquidation'
                        ];
                    }
                }
            }
            
            // 2. Debit cash returned (if any)
            if ($totalReturnedCash > 0 && $cashOnHandAccount) {
                $ledgerEntries[] = [
                    'account_id' => $cashOnHandAccount->id,
                    'debit' => $totalReturnedCash,
                    'credit' => 0,
                    'description' => 'Returned cash from liquidation'
                ];
            }
            
            // 3. Debit shortage / dispute (if any)
            if ($shortage > 0 && $cashShortageAccount) {
                $ledgerEntries[] = [
                    'account_id' => $cashShortageAccount->id,
                    'debit' => $shortage,
                    'credit' => 0,
                    'description' => 'Unreturned cash shortage'
                ];
            }

            // 3b. Credit Due to Employees for over-liquidation (if shortage < 0)
            if ($shortage < 0) {
                $dueToEmployeesAccount = \App\Models\Account::where('code', '2100')->first();
                if ($dueToEmployeesAccount) {
                    $ledgerEntries[] = [
                        'account_id' => $dueToEmployeesAccount->id,
                        'debit' => 0,
                        'credit' => abs($shortage),
                        'description' => 'Reimbursement due to employee for extra trip expense'
                    ];
                }
            }
            
            // 4. Credit Employee Advances for the entire advanced amount
            if ($employeeAdvancesAccount) {
                $ledgerEntries[] = [
                    'account_id' => $employeeAdvancesAccount->id,
                    'debit' => 0,
                    'credit' => $liquidation->total_advanced,
                    'description' => 'Clear employee advance'
                ];
            }
            
            // If we have entries, balance and record them!
            if (!empty($ledgerEntries)) {
                $ledgerService->recordEntry(
                    date('Y-m-d'),
                    "Liquidation settlement for " . ($liquidation->tripTicket?->control_no ?? "Liquidation #{$liquidation->id}"),
                    $ledgerEntries,
                    $liquidation
                );
            }

            // Notify employee + accounting of settlement result
            \App\Http\Services\NotificationService::notifyLiquidationSettled($liquidation);

            return $liquidation;
        });
    }
}
