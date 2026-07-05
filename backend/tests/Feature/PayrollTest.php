<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\EmployeeSalary;
use App\Models\PayrollCycle;
use App\Models\Payslip;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $employee;
    private User $unprivilegedUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->admin = User::factory()->superAdmin()->create();
        
        // Create an active employee
        $this->employee = User::factory()->create([
            'role' => 'accounting_executive',
            'is_active' => true
        ]);
        
        // Set up employee salary master profile
        EmployeeSalary::create([
            'user_id' => $this->employee->id,
            'base_salary' => 50000.00,
            'allowances' => 6000.00,
            'deductions' => 2000.00
        ]);

        // Create an unprivileged user (e.g. driver)
        $this->unprivilegedUser = User::factory()->create([
            'role' => 'driver',
            'is_active' => true
        ]);
    }

    public function test_admin_can_list_payroll_cycles()
    {
        PayrollCycle::create([
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-15',
            'gross_amount' => 25000.00,
            'tax_amount' => 2500.00,
            'net_amount' => 20500.00,
            'status' => 'released',
        ]);

        $res = $this->actingAs($this->admin)
                    ->getJson('/api/v1/payroll/cycles');

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');
    }

    public function test_unprivileged_user_cannot_list_payroll_cycles()
    {
        $this->actingAs($this->unprivilegedUser)
             ->getJson('/api/v1/payroll/cycles')
             ->assertForbidden();
    }

    public function test_admin_can_run_payroll_cycle()
    {
        $payload = [
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-15',
        ];

        $res = $this->actingAs($this->admin)
                    ->postJson('/api/v1/payroll/cycles', $payload);

        $res->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'draft');

        $cycleId = $res->json('data.id');

        // Check cycle totals
        // For employee: Monthly Base = 50000 -> Cycle Base = 25000
        // Monthly Allowances = 6000 -> Cycle Allowances = 3000
        // Monthly Deductions = 2000 -> Cycle Deductions = 1000
        // Cycle Tax = 3204.17 (BIR progressive tax, includes allowances)
        // Cycle Net = 25000 + 3000 - 3204.17 - 1000 = 23795.83
        // Gross per employee = 25000 + 3000 = 28000
        $this->assertDatabaseHas('payroll_cycles', [
            'id' => $cycleId,
            'status' => 'draft',
            'gross_amount' => 28000.00,
            'tax_amount' => 3204.17,
            'net_amount' => 23795.83,
        ]);

        // Check generated payslip
        $this->assertDatabaseHas('payslips', [
            'payroll_cycle_id' => $cycleId,
            'user_id' => $this->employee->id,
            'base_salary' => 25000.00,
            'allowances' => 3000.00,
            'deductions' => 1000.00,
            'tax_amount' => 3204.17,
            'net_salary' => 23795.83,
            'status' => 'draft',
        ]);
    }

    public function test_cannot_run_payroll_cycle_with_overlapping_dates()
    {
        // Pre-create an overlapping cycle
        PayrollCycle::create([
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-15',
            'gross_amount' => 25000.00,
            'tax_amount' => 2500.00,
            'net_amount' => 20500.00,
            'status' => 'draft',
        ]);

        $payload = [
            'start_date' => '2026-06-10',
            'end_date' => '2026-06-25',
        ];

        $this->actingAs($this->admin)
             ->postJson('/api/v1/payroll/cycles', $payload)
             ->assertStatus(422)
             ->assertJsonPath('success', false);
    }

    public function test_admin_can_view_payroll_cycle_details()
    {
        $cycle = PayrollCycle::create([
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-15',
            'gross_amount' => 28000.00,
            'tax_amount' => 2500.00,
            'net_amount' => 24500.00,
            'status' => 'draft',
        ]);

        Payslip::create([
            'payroll_cycle_id' => $cycle->id,
            'user_id' => $this->employee->id,
            'base_salary' => 25000.00,
            'allowances' => 3000.00,
            'deductions' => 1000.00,
            'tax_amount' => 2500.00,
            'net_salary' => 24500.00,
            'status' => 'draft',
        ]);

        $res = $this->actingAs($this->admin)
                    ->getJson("/api/v1/payroll/cycles/{$cycle->id}");

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $cycle->id)
            ->assertJsonCount(1, 'data.payslips');
    }

    public function test_admin_can_update_employee_salary()
    {
        $payload = [
            'base_salary' => 60000.00,
            'allowances' => 5000.00,
            'deductions' => 3000.00,
        ];

        $res = $this->actingAs($this->admin)
                    ->putJson("/api/v1/payroll/employees/{$this->employee->id}", $payload);

        $res->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('employee_salaries', [
            'user_id' => $this->employee->id,
            'base_salary' => 60000.00,
            'allowances' => 5000.00,
            'deductions' => 3000.00,
        ]);
    }

    public function test_admin_can_release_payroll_cycle()
    {
        $cycle = PayrollCycle::create([
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-15',
            'gross_amount' => 28000.00,
            'tax_amount' => 2500.00,
            'net_amount' => 24500.00,
            'status' => 'draft',
        ]);

        Payslip::create([
            'payroll_cycle_id' => $cycle->id,
            'user_id' => $this->employee->id,
            'base_salary' => 25000.00,
            'allowances' => 3000.00,
            'deductions' => 1000.00,
            'tax_amount' => 2500.00,
            'net_salary' => 24500.00,
            'status' => 'draft',
        ]);

        $res = $this->actingAs($this->admin)
                    ->postJson("/api/v1/payroll/cycles/{$cycle->id}/release");

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'released');

        $this->assertEquals('released', $cycle->fresh()->status);
        $this->assertEquals('released', Payslip::where('payroll_cycle_id', $cycle->id)->first()->status);
    }

    public function test_admin_can_delete_draft_payroll_cycle()
    {
        $cycle = PayrollCycle::create([
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-15',
            'gross_amount' => 28000.00,
            'tax_amount' => 2500.00,
            'net_amount' => 24500.00,
            'status' => 'draft',
        ]);

        $this->actingAs($this->admin)
             ->deleteJson("/api/v1/payroll/cycles/{$cycle->id}")
             ->assertOk();

        $this->assertDatabaseMissing('payroll_cycles', ['id' => $cycle->id]);
    }

    public function test_admin_cannot_delete_released_payroll_cycle()
    {
        $cycle = PayrollCycle::create([
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-15',
            'gross_amount' => 28000.00,
            'tax_amount' => 2500.00,
            'net_amount' => 24500.00,
            'status' => 'released',
        ]);

        $this->actingAs($this->admin)
             ->deleteJson("/api/v1/payroll/cycles/{$cycle->id}")
             ->assertStatus(422);

        $this->assertDatabaseHas('payroll_cycles', ['id' => $cycle->id]);
    }
}
