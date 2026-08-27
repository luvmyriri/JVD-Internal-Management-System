<?php

namespace Tests\Feature;

use App\Models\EducationalTourPackage;
use App\Models\EducationalTourParticipantBooking;
use App\Models\Invoice;
use Database\Seeders\LittleMastersEducationalTourSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LittleMastersSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_little_masters_seeder_creates_package_participants_and_payments(): void
    {
        $this->seed(LittleMastersEducationalTourSeeder::class);

        $package = EducationalTourPackage::where('name', 'Little Masters')->first();
        $this->assertNotNull($package);
        $this->assertSame('Little Masters Learning Center', $package->school_name);
        $this->assertEquals(1300.00, (float) $package->rate_per_head);
        $this->assertEquals(1400.00, (float) $package->adult_rate_per_head);
        $this->assertSame('City Mall Imus Cavite', $package->pickup_location);
        $this->assertSame(49, $package->maximum_capacity);

        $bookings = $package->participantBookings()->get();
        $this->assertCount(23, $bookings);

        $students = $bookings->where('participant_type', 'student');
        $adults = $bookings->where('participant_type', 'adult');
        $this->assertCount(15, $students);
        $this->assertCount(8, $adults);

        // Check invoices
        $invoices = Invoice::where('notes', 'like', '%JVD-EDT-LM%')
            ->orWhereHas('items', fn ($q) => $q->where('item_name', 'like', '%Little Masters%'))
            ->get();
        $this->assertCount(23, $invoices);

        // Check payments
        $paidBookings = $bookings->where('status', 'confirmed');
        $partiallyPaidBookings = $bookings->where('status', 'partially_paid');
        $this->assertGreaterThan(0, $paidBookings->count());
        $this->assertGreaterThan(0, $partiallyPaidBookings->count());
    }
}
