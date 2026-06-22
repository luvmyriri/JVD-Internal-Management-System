<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\JobApplication;
use App\Models\Commission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AutoGenerationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
        $this->admin = User::factory()->superAdmin()->create();
    }

    public function test_candidate_conversion_auto_generates_sequential_employee_id()
    {
        // 1. Create a hired candidate
        $app = JobApplication::create([
            'first_name' => 'John',
            'last_name'  => 'Doe',
            'email'      => 'john.doe@example.com',
            'position_applied' => 'driver',
            'status'     => 'hired',
        ]);

        // 2. Call conversion route without employee_id
        $payload = [
            'role'            => 'driver',
            'department'      => 'Operations',
            'send_invitation' => false,
        ];

        $response = $this->actingAs($this->admin)
            ->postJson("/api/job-applications/{$app->id}/convert-to-employee", $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        // 3. Verify user exists with generated sequential employee_id
        $latestUser = User::orderBy('id', 'desc')->first();
        $expectedEmpId = 'JVD-EMP-' . ($latestUser->id + 1001 - 1); // Subtracting 1 since $latestUser->id is this newly created user
        // Wait, the logic is: $latest = User::withTrashed()->orderBy('id', 'desc')->first();
        // Since we orderBy('id', 'desc'), the latest user will be retrieved. But in convertToEmployee:
        // it fetches latest before creating the user!
        // So the latest user before John Doe was $this->admin (id = 1).
        // Therefore, expectedEmpId = 'JVD-EMP-' . (1 + 1001) = 'JVD-EMP-1002'
        
        $this->assertDatabaseHas('users', [
            'email'       => 'john.doe@example.com',
            'employee_id' => 'JVD-EMP-1002',
        ]);
        
        $this->assertEquals('JVD-EMP-1002', $response->json('data.user.employee_id'));
    }

    public function test_commission_creation_auto_generates_sequential_serial_number()
    {
        $payload = [
            'commissioner_name' => 'Jane Agent',
            'employee_id' => $this->admin->id,
            'date' => now()->toDateString(),
            'items' => [
                [
                    'travel_date' => now()->toDateString(),
                    'destination' => 'Manila',
                    'quantity' => 1,
                    'amount' => 500.00
                ]
            ]
        ];

        // 1. Create first commission
        $response1 = $this->actingAs($this->admin)
            ->postJson('/api/commissions', $payload);

        $response1->assertCreated();
        $year = now()->year;
        $serial1 = sprintf('COM-%d-0001', $year);
        $this->assertEquals($serial1, $response1->json('serial_no'));

        // 2. Create second commission
        $response2 = $this->actingAs($this->admin)
            ->postJson('/api/commissions', $payload);

        $response2->assertCreated();
        $serial2 = sprintf('COM-%d-0002', $year);
        $this->assertEquals($serial2, $response2->json('serial_no'));
    }
}
