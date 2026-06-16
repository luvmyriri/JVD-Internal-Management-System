<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\PayrollCycle;
use App\Models\Payslip;
use App\Models\EmployeeSalary;
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
     * Run/generate a new draft payroll cycle for a date range.
     */
    public function runPayroll(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $startDate = Carbon::parse($validated['start_date']);
        $endDate = Carbon::parse($validated['end_date']);

        // Check for overlapping/duplicate payroll cycles
        $overlap = PayrollCycle::where(function ($query) use ($startDate, $endDate) {
            $query->whereBetween('start_date', [$startDate, $endDate])
                  ->orWhereBetween('end_date', [$startDate, $endDate]);
        })->first();

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

            foreach ($activeEmployees as $employee) {
                // Get monthly salary profile or use default zeroes
                $salaryProfile = $employee->salary;
                $monthlyBase = $salaryProfile ? $salaryProfile->base_salary : 0.00;
                $monthlyAllowances = $salaryProfile ? $salaryProfile->allowances : 0.00;
                $monthlyDeductions = $salaryProfile ? $salaryProfile->deductions : 0.00;

                // Calculations (semi-monthly: divide by 2)
                $cycleBase = $monthlyBase / 2;
                $cycleAllowances = $monthlyAllowances / 2;
                $cycleDeductions = $monthlyDeductions / 2;

                // 10% tax rate on base salary per guidelines
                $cycleTax = $cycleBase * 0.10;
                $cycleNet = $cycleBase + $cycleAllowances - $cycleTax - $cycleDeductions;

                // Create payslip record
                Payslip::create([
                    'payroll_cycle_id' => $cycle->id,
                    'user_id' => $employee->id,
                    'base_salary' => $cycleBase,
                    'allowances' => $cycleAllowances,
                    'deductions' => $cycleDeductions,
                    'tax_amount' => $cycleTax,
                    'net_salary' => $cycleNet,
                    'status' => 'draft',
                ]);

                $totalGross += ($cycleBase + $cycleAllowances);
                $totalTax += $cycleTax;
                $totalNet += $cycleNet;
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
                'status' => 'released',
                'released_at' => now(),
            ]);

            Payslip::where('payroll_cycle_id', $cycle->id)->update([
                'status' => 'released',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payroll cycle and payslips released successfully.',
                'data' => $cycle
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
