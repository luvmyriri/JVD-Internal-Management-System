<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Bus;
use App\Models\TripTicket;
use App\Models\Invoice;
use App\Models\WorkOrder;
use App\Models\JobOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BusScheduleSyncTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Bus $bus;
    private User $driver;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RolePermissionSeeder::class);

        $this->admin = User::factory()->superAdmin()->create();
        $this->driver = User::factory()->create(['role' => 'driver']);
        $this->bus = Bus::factory()->create([
            'assigned_driver' => $this->driver->id,
            'plate_number' => 'XYZ-1234',
        ]);
    }

    public function test_trip_ticket_lifecycle_syncs_schedules()
    {
        // 1. Create domestic trip ticket -> should sync to local_travels
        $ticket = TripTicket::create([
            'control_no' => 'DTT-2026-9999',
            'issue_date' => '2026-06-23',
            'date_of_travel' => '2026-06-23',
            'pick_up' => 'Terminal A',
            'drop_off' => 'Terminal B',
            'no_of_passengers' => 20,
            'driver_id' => $this->driver->id,
            'bus_id' => $this->bus->id,
            'trip_type' => 'domestic',
            'status' => 'approved',
        ]);

        $this->assertDatabaseHas('local_travels', [
            'bus_id' => $this->bus->id,
            'reference_type' => 'trip_ticket',
            'reference_id' => $ticket->id,
            'travel_date' => '2026-06-23',
        ]);

        // 2. Change to international -> should remove from local and sync to international_travels
        $ticket->update(['trip_type' => 'international']);

        $this->assertDatabaseMissing('local_travels', [
            'reference_id' => $ticket->id,
        ]);
        $this->assertDatabaseHas('international_travels', [
            'bus_id' => $this->bus->id,
            'reference_type' => 'trip_ticket',
            'reference_id' => $ticket->id,
            'travel_date' => '2026-06-23',
        ]);

        // 3. Cancel -> should delete from international_travels
        $ticket->update(['status' => 'cancelled']);

        $this->assertDatabaseMissing('international_travels', [
            'reference_id' => $ticket->id,
        ]);
    }

    public function test_invoice_lifecycle_syncs_schedules()
    {
        // 1. Create invoice -> should sync to local_travels
        $invoice = Invoice::create([
            'invoice_number' => 'INV-2026-9999',
            'customer_name' => 'John Doe',
            'travel_date' => '2026-06-24',
            'bus_id' => $this->bus->id,
            'driver_id' => $this->driver->id,
            'pickup_location' => 'Airport',
            'tour_code' => 'LOCAL-TOUR',
            'status' => 'paid',
            'total_amount' => 5000,
            'subtotal' => 4500,
            'tax_amount' => 500,
            'payment_method' => 'Cash',
            'created_by' => $this->admin->id,
        ]);

        $this->assertDatabaseHas('local_travels', [
            'bus_id' => $this->bus->id,
            'reference_type' => 'invoice',
            'reference_id' => $invoice->id,
            'travel_date' => '2026-06-24',
        ]);

        // 2. Cancel invoice -> should delete from local_travels
        $invoice->update(['status' => 'cancelled']);

        $this->assertDatabaseMissing('local_travels', [
            'reference_id' => $invoice->id,
        ]);
    }

    public function test_pms_lifecycle_syncs_schedules()
    {
        // 1. Create maintenance work order -> should sync to pms_schedules
        $wo = WorkOrder::create([
            'wo_number' => 'WO-2026-9999',
            'bus_id' => $this->bus->id,
            'type' => 'maintenance',
            'status' => 'open',
            'description' => 'Change Engine Oil',
            'created_by' => $this->admin->id,
        ]);

        $this->assertDatabaseHas('pms_schedules', [
            'bus_id' => $this->bus->id,
            'work_order_id' => $wo->id,
            'status' => 'open',
            'description' => 'Change Engine Oil',
        ]);

        // 2. Create job order spawned from it -> should link to it in pms_schedules
        $jo = JobOrder::create([
            'jo_number' => 'JO-2026-9999',
            'bus_id' => $this->bus->id,
            'work_order_id' => $wo->id,
            'service_type' => 'maintenance',
            'service_date' => '2026-06-25',
            'status' => 'in_progress',
            'total_cost' => 1500,
            'created_by' => $this->admin->id,
            'destination' => 'Garage',
        ]);

        // Triggering save on WorkOrder
        $wo->update(['status' => 'in_progress']);

        $this->assertDatabaseHas('pms_schedules', [
            'bus_id' => $this->bus->id,
            'work_order_id' => $wo->id,
            'job_order_id' => $jo->id,
            'maintenance_date' => '2026-06-25',
            'status' => 'in_progress',
        ]);
    }

    public function test_calendar_endpoint_returns_unified_entries()
    {
        // Setup a local travel
        TripTicket::create([
            'control_no' => 'DTT-2026-0001',
            'issue_date' => '2026-06-20',
            'date_of_travel' => '2026-06-20',
            'pick_up' => 'A',
            'drop_off' => 'B',
            'no_of_passengers' => 10,
            'driver_id' => $this->driver->id,
            'bus_id' => $this->bus->id,
            'trip_type' => 'domestic',
            'status' => 'approved',
        ]);

        // Setup a PMS schedule
        WorkOrder::create([
            'wo_number' => 'WO-2026-0001',
            'bus_id' => $this->bus->id,
            'type' => 'maintenance',
            'status' => 'open',
            'description' => 'Tire Replacement',
            'created_by' => $this->admin->id,
        ]);

        // Force work_orders created_at to 2026-06-21 for predictable date in PMS schedule
        $wo = WorkOrder::first();
        \DB::table('pms_schedules')->where('work_order_id', $wo->id)->update(['maintenance_date' => '2026-06-21']);

        // Query calendar for 2026-06
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/buses/{$this->bus->id}/calendar?month=6&year=2026");

        $response->assertOk();
        $response->assertJsonPath('success', true);
        
        $data = $response->json('data');
        $this->assertCount(2, $data);
        
        // Assert sorting and differentiation
        $this->assertEquals('2026-06-20', $data[0]['date']);
        $this->assertEquals('trip_ticket', $data[0]['type']);
        $this->assertEquals('local', $data[0]['travel_type']);

        $this->assertEquals('2026-06-21', $data[1]['date']);
        $this->assertEquals('pms', $data[1]['type']);
        $this->assertEquals('WO-2026-0001', $data[1]['reference_no']);
    }
}
