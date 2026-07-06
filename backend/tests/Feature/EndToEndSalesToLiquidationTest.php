<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Booking;
use App\Models\Bus;
use App\Models\TripTicket;
use App\Models\CashBudgetRequest;
use App\Models\Liquidation;

class EndToEndSalesToLiquidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_sales_to_liquidation_flow()
    {
        // 1. Setup Data
        $admin = User::factory()->create(['role' => 'super_admin']);
        $driver = User::factory()->create(['role' => 'driver']);
        $bus = Bus::factory()->create();
        $customer = Customer::factory()->create();

        // 2. Create Invoice and Booking (Sales)
        $invoice = Invoice::create([
            'invoice_number' => 'INV-TEST-001',
            'customer_id' => $customer->id,
            'subtotal' => 1000,
            'tax_amount' => 120,
            'total_amount' => 1120,
            'payment_method' => 'Cash',
            'status' => 'pending',
            'created_by' => $admin->id,
        ]);

        $booking = Booking::create([
            'invoice_id' => $invoice->id,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'travel_date' => now()->addDays(2)->format('Y-m-d'),
            'status' => 'confirmed'
        ]);

        $this->assertDatabaseHas('bookings', ['id' => $booking->id]);

        // 3. Create Trip Ticket
        $tripTicket = TripTicket::create([
            'control_no' => 'TT-TEST-001',
            'issue_date' => now()->format('Y-m-d'),
            'pick_up' => 'Terminal A',
            'drop_off' => 'Terminal B',
            'invoice_id' => $invoice->id,
            'bus_id' => $bus->id,
            'driver_id' => $driver->id,
            'date_of_travel' => $booking->travel_date,
            'status' => 'approved' // draft, approved, completed
        ]);

        $this->assertDatabaseHas('trip_tickets', ['id' => $tripTicket->id]);

        // 4. Create Cash Budget Request
        $cashBudget = CashBudgetRequest::create([
            'date' => now()->format('Y-m-d'),
            'destination' => 'Test Destination',
            'trip_ticket_id' => $tripTicket->id,
            'prepared_by' => $driver->id,
            'travel_date' => $tripTicket->date_of_travel,
            'total_amount' => 500,
            'status' => 'approved', // Simulate approved
            'disbursed_amount' => 500,
            'disbursed_by' => $admin->id
        ]);

        $this->assertDatabaseHas('cash_budget_requests', ['id' => $cashBudget->id]);

        // 5. Create Liquidation
        $liquidation = Liquidation::create([
            'trip_ticket_id' => $tripTicket->id,
            'employee_id' => $driver->id,
            'total_advanced' => 500,
            'total_spent' => 450,
            'total_returned' => 50,
            'status' => 'settled',
        ]);

        $this->assertDatabaseHas('liquidations', ['id' => $liquidation->id]);

        // Output success if we get here
        $this->assertTrue(true);
    }
}
