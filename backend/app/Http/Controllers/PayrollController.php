<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\PayrollCycle;
use App\Models\Payslip;
use App\Models\EmployeeSalary;
use App\Models\CashBudgetRequest;
use App\Models\Account;
use App\Services\LedgerService;
use Carbon\Carbon;

class PayrollController extends Controller
{
    /**
     * List all payroll cycles.
     */
    public function indexCycles()
    {
        $cycles = PayrollCycle::orderBy('created_at', 'desc')->get();
        return response()->json([
            'success' => true,
            'data' => $cycles
        ]);
    }

    /**
     * Show details of a specific payroll cycle, including all payslips.
     */
    public function showCycle($id)
    {
        $cycle = PayrollCycle::with(['payslips.user'])->find($id);

        if (!$cycle) {
            return response()->json([
                'success' => false,
                'message' => 'Payroll cycle not found.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $cycle
        ]);
    }

    /**
     * List all active employee salary configurations.
     */
    public function indexEmployeeSalaries(Request $request)
    {
        $search = $request->query('search');

        $query = User::where('is_active', true)
            ->with('salary')
            ->whereNotIn('role', ['client']); // Exclude clients

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                  ->orWhere('last_name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('employee_id', 'ilike', "%{$search}%");
            });
        }

        $employees = $query->orderBy('first_name')->get();

        return response()->json([
            'success' => true,
            'data' => $employees
        ]);
    }

    /**
     * Create or update an employee's salary profile.
     */
    public function updateEmployeeSalary(Request $request, $id)
    {
        $validated = $request->validate([
            'base_salary' => 'required|numeric|min:0',
            'allowances' => 'required|numeric|min:0',
            'deductions' => 'required|numeric|min:0',
        ]);

        $user = User::find($id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.'
            ], 404);
        }

        $salary = EmployeeSalary::updateOrCreate(
            ['user_id' => $user->id],
            [
                'base_salary' => $validated['base_salary'],
                'allowances' => $validated['allowances'],
                'deductions' => $validated['deductions'],
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Salary configuration updated successfully.',
            'data' => $salary
        ]);
    }

    /**
     * BIR-compliant progressive withholding tax on the annualised MONTHLY base salary.
     * Returns the per-CYCLE (semi-monthly) tax amount.
     */
    private function computeBirTax(float $monthlyBase): float
    {
        // Annualise the monthly base salary
        $annual = $monthlyBase * 12;

        // 2024 BIR Tax Table (TRAIN Law)
        if ($annual <= 250000) {
            $annualTax = 0;
        } elseif ($annual <= 400000) {
            $annualTax = ($annual - 250000) * 0.15;
        } elseif ($annual <= 800000) {
            $annualTax = 22500 + ($annual - 400000) * 0.20;
        } elseif ($annual <= 2000000) {
            $annualTax = 102500 + ($annual - 800000) * 0.25;
        } elseif ($annual <= 8000000) {
            $annualTax = 402500 + ($annual - 2000000) * 0.30;
        } else {
            $annualTax = 2202500 + ($annual - 8000000) * 0.35;
        }

        // Return semi-monthly tax portion (annual ÷ 24 pay periods)
        return round($annualTax / 24, 2);
    }

    public function runPayroll(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $startDate = Carbon::parse($validated['start_date'])->startOfDay();
        $endDate   = Carbon::parse($validated['end_date'])->endOfDay();

        // H-03: Interval intersection — detect any existing cycle whose period
        // overlaps with [startDate, endDate] using the standard overlap condition:
        //   existing.start_date <= new.end_date AND existing.end_date >= new.start_date
        $overlap = PayrollCycle::where('start_date', '<=', $endDate->toDateString())
            ->where('end_date', '>=', $startDate->toDateString())
            ->first();

        if ($overlap) {
            return response()->json([
                'success' => false,
                'message' => "A payroll cycle already overlaps with this period ({$overlap->start_date->format('Y-m-d')} to {$overlap->end_date->format('Y-m-d')})."
            ], 422);
        }

        $activeEmployees = User::where('is_active', true)
            ->whereNotIn('role', ['client'])
            ->with('salary')
            ->get();

        if ($activeEmployees->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No active employees found to generate payroll.'
            ], 422);
        }

        DB::beginTransaction();

        try {
            // Create payroll cycle
            $cycle = PayrollCycle::create([
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'status' => 'draft',
                'gross_amount' => 0.00,
                'tax_amount' => 0.00,
                'net_amount' => 0.00,
            ]);

            $totalGross = 0;
            $totalTax = 0;
            $totalNet = 0;

            // M-01: Determine working-day ratio for pro-rating
            $cycleDays    = $startDate->copy()->diffInDays($endDate) + 1;
            $monthDays    = $startDate->daysInMonth; // days in the pay period's month

            foreach ($activeEmployees as $employee) {
                // Get monthly salary profile or use default zeroes
                $salaryProfile    = $employee->salary;
                $monthlyBase      = $salaryProfile ? (float) $salaryProfile->base_salary : 0.00;
                $monthlyAllowances = $salaryProfile ? (float) $salaryProfile->allowances  : 0.00;
                $monthlyDeductions = $salaryProfile ? (float) $salaryProfile->deductions  : 0.00;

                // M-01: Daily pro-rating instead of a fixed ÷2
                $ratio            = $monthDays > 0 ? $cycleDays / $monthDays : 0;
                $cycleBase        = round($monthlyBase      * $ratio, 2);
                $cycleAllowances  = round($monthlyAllowances * $ratio, 2);
                $cycleDeductions  = round($monthlyDeductions * $ratio, 2);

                // M-02: BIR progressive withholding tax (semi-monthly share)
                $cycleTax = $this->computeBirTax($monthlyBase);

                // M-02: Floor net salary at 0 — never pay a negative amount
                $cycleNet = max(0.00, round($cycleBase + $cycleAllowances - $cycleTax - $cycleDeductions, 2));

                // Create payslip record
                Payslip::create([
                    'payroll_cycle_id' => $cycle->id,
                    'user_id'          => $employee->id,
                    'base_salary'      => $cycleBase,
                    'allowances'       => $cycleAllowances,
                    'deductions'       => $cycleDeductions,
                    'tax_amount'       => $cycleTax,
                    'net_salary'       => $cycleNet,
                    'status'           => 'draft',
                ]);

                $totalGross += ($cycleBase + $cycleAllowances);
                $totalTax   += $cycleTax;
                $totalNet   += $cycleNet;
            }

            // Update cycle totals
            $cycle->update([
                'gross_amount' => $totalGross,
                'tax_amount' => $totalTax,
                'net_amount' => $totalNet,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payroll generated successfully.',
                'data' => $cycle->load('payslips.user')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate payroll: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Release a payroll cycle (approve and release payslips).
     */
    public function releasePayroll($id)
    {
        $cycle = PayrollCycle::find($id);

        if (!$cycle) {
            return response()->json([
                'success' => false,
                'message' => 'Payroll cycle not found.'
            ], 404);
        }

        if ($cycle->status === 'released') {
            return response()->json([
                'success' => false,
                'message' => 'Payroll cycle has already been released.'
            ], 422);
        }

        DB::beginTransaction();

        try {
            $cycle->update([
                'status'      => 'released',
                'released_at' => now(),
            ]);

            Payslip::where('payroll_cycle_id', $cycle->id)->update([
                'status' => 'released',
            ]);

            // H-04: Record double-entry journal for the payroll disbursement
            $ledger = app(LedgerService::class);
            $ledger->seedDefaultAccounts(); // ensure payroll accounts exist

            $salaryExpenseAcc  = Account::where('code', '6000')->first(); // Salary Expense
            $accruedPayrollAcc = Account::where('code', '2200')->first(); // Accrued Payroll
            $taxPayableAcc     = Account::where('code', '2300')->first(); // Tax/Deductions Payable

            if ($salaryExpenseAcc && $accruedPayrollAcc && $taxPayableAcc) {
                $grossAmount = (float) $cycle->gross_amount;
                $taxAmount   = (float) $cycle->tax_amount;
                $netAmount   = (float) $cycle->net_amount;

                $ledger->recordEntry(
                    now()->toDateString(),
                    "Payroll release for cycle {$cycle->start_date->format('Y-m-d')} to {$cycle->end_date->format('Y-m-d')}",
                    [
                        ['account_id' => $salaryExpenseAcc->id,  'debit' => $grossAmount, 'credit' => 0,          'description' => 'Gross payroll expense'],
                        ['account_id' => $taxPayableAcc->id,     'debit' => 0,            'credit' => $taxAmount,  'description' => 'Withholding tax payable'],
                        ['account_id' => $accruedPayrollAcc->id, 'debit' => 0,            'credit' => $netAmount,  'description' => 'Net accrued payroll payable'],
                    ],
                    $cycle
                );
            }

            // H-04: Create a CashBudgetRequest so finance can track the outflow
            CashBudgetRequest::create([
                'date'         => now()->toDateString(),
                'destination'  => 'Payroll Disbursement',
                'total_amount' => $cycle->net_amount,
                'status'       => 'approved',
                'prepared_by'  => auth()->id(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payroll cycle and payslips released successfully.',
                'data'    => $cycle
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to release payroll: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a payroll cycle (only draft).
     */
    public function destroyCycle($id)
    {
        $cycle = PayrollCycle::find($id);

        if (!$cycle) {
            return response()->json([
                'success' => false,
                'message' => 'Payroll cycle not found.'
            ], 404);
        }

        if ($cycle->status === 'released') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete a released payroll cycle.'
            ], 422);
        }

        // Cascade deleting payslips is handled by foreign key constraint
        $cycle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Payroll cycle deleted successfully.'
        ]);
    }
}
