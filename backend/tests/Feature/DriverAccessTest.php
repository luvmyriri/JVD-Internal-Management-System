<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Bus;
use App\Models\Customer;
use App\Models\JobOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DriverAccessTest extends TestCase
{
    use RefreshDatabase;

    private User $driver1;
    private User $driver2;
    private User $admin;
    private Bus $bus1;
    private Bus $bus2;
    private Customer $customer;
    private JobOrder $jobOrder1;
    private JobOrder $jobOrder2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $this->admin = User::factory()->superAdmin()->create([
            'employee_id' => 'ADM001',
        ]);

        $this->driver1 = User::factory()->create([
            'role' => 'driver',
            'employee_id' => 'DRV001',
        ]);
        $this->driver2 = User::factory()->create([
            'role' => 'driver',
            'employee_id' => 'DRV002',
        ]);

        $this->bus1 = Bus::factory()->create([
            'assigned_driver' => $this->driver1->id,
            'plate_number' => 'AAA-1111',
        ]);
        $this->bus2 = Bus::factory()->create([
            'assigned_driver' => $this->driver2->id,
            'plate_number' => 'BBB-2222',
        ]);

        $this->customer = Customer::factory()->create();

        $this->jobOrder1 = JobOrder::factory()->create([
            'bus_id' => $this->bus1->id,
            'customer_id' => $this->customer->id,
            'created_by' => $this->admin->id,
            'status' => 'confirmed',
            'service_type' => 'maintenance',
        ]);

        $this->jobOrder2 = JobOrder::factory()->create([
            'bus_id' => $this->bus2->id,
            'customer_id' => $this->customer->id,
            'created_by' => $this->admin->id,
            'status' => 'confirmed',
            'service_type' => 'maintenance',
        ]);
    }

    // ────────────────────────────────────────────
    // BUS ACCESS (driver-scoped)
    // ────────────────────────────────────────────

    public function test_driver_can_only_see_their_assigned_bus(): void
    {
        $response = $this->actingAs($this->driver1, 'sanctum')
            ->getJson('/api/buses');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertEquals($this->bus1->id, $data[0]['id']);
    }

    public function test_driver_can_view_assigned_bus_details(): void
    {
        $response = $this->actingAs($this->driver1, 'sanctum')
            ->getJson('/api/buses/' . $this->bus1->id);

        $response->assertStatus(200);
        $this->assertEquals($this->bus1->id, $response->json('data.id'));
    }

    public function test_driver_cannot_view_unassigned_bus_details(): void
    {
        $response = $this->actingAs($this->driver1, 'sanctum')
            ->getJson('/api/buses/' . $this->bus2->id);

        $response->assertStatus(403);
    }

    // ────────────────────────────────────────────
    // JOB ORDER ACCESS (driver-scoped)
    // ────────────────────────────────────────────

    public function test_driver_can_only_see_job_orders_for_assigned_bus(): void
    {
        $response = $this->actingAs($this->driver1, 'sanctum')
            ->getJson('/api/job-orders');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertCount(1, $data);
        $this->assertEquals($this->jobOrder1->id, $data[0]['id']);
    }

    public function test_driver_cannot_view_job_order_for_unassigned_bus(): void
    {
        $response = $this->actingAs($this->driver1, 'sanctum')
            ->getJson('/api/job-orders/' . $this->jobOrder2->id);

        $response->assertStatus(403);
    }

    // ────────────────────────────────────────────
    // DRIVER WRITE RESTRICTIONS
    // ────────────────────────────────────────────

    public function test_driver_cannot_create_bus(): void
    {
        $response = $this->actingAs($this->driver1, 'sanctum')
            ->postJson('/api/buses', [
                'plate_number' => 'CCC-3333',
                'model' => 'Test Bus',
                'seating_capacity' => 40,
                'status' => 'available',
            ]);

        // Should be blocked by role middleware (403) or route not found (404/405)
        $this->assertContains($response->status(), [403, 404, 405]);
    }

    public function test_driver_cannot_update_bus(): void
    {
        $response = $this->actingAs($this->driver1, 'sanctum')
            ->putJson('/api/buses/' . $this->bus1->id, [
                'model' => 'Hacked Model',
            ]);

        $this->assertContains($response->status(), [403, 404, 405]);
    }

    // ────────────────────────────────────────────
    // ADMIN BUS ASSIGNMENT
    // ────────────────────────────────────────────

    public function test_admin_can_assign_driver_to_bus(): void
    {
        $newDriver = User::factory()->create([
            'role' => 'driver',
            'employee_id' => 'DRV003',
        ]);
        $unassignedBus = Bus::factory()->create([
            'plate_number' => 'DDD-4444',
            'assigned_driver' => null,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/buses/' . $unassignedBus->id, [
                'assigned_driver' => $newDriver->id,
            ]);

        $response->assertStatus(200);
        $this->assertEquals($newDriver->id, $response->json('data.driver.id'));
    }

    public function test_admin_can_unassign_driver_from_bus(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/buses/' . $this->bus1->id, [
                'assigned_driver' => null,
            ]);

        $response->assertStatus(200);
        $this->assertNull($response->json('data.driver'));
    }

    // ────────────────────────────────────────────
    // UNASSIGNED DRIVER EDGE CASE
    // ────────────────────────────────────────────

    public function test_unassigned_driver_sees_empty_bus_list(): void
    {
        $loneDriver = User::factory()->create([
            'role' => 'driver',
            'employee_id' => 'DRV999',
        ]);

        $response = $this->actingAs($loneDriver, 'sanctum')
            ->getJson('/api/buses');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data'));
    }

    public function test_unassigned_driver_sees_empty_job_orders(): void
    {
        $loneDriver = User::factory()->create([
            'role' => 'driver',
            'employee_id' => 'DRV998',
        ]);

        $response = $this->actingAs($loneDriver, 'sanctum')
            ->getJson('/api/job-orders');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data'));
    }
}
