<?php

namespace Database\Seeders;

use App\Models\Bus;
use App\Models\CharterRatePlan;
use App\Models\EducationalTourProgram;
use App\Models\JoinerDeparture;
use App\Models\JoinerDepartureSeat;
use App\Models\ResourceAllocation;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SalesSystemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Cleans up stale sales transaction test data while retaining users and employees,
     * then inserts comprehensive, realistic packages, buses with seat maps, drivers,
     * itineraries, inclusions/exclusions, and active seat reservations.
     */
    public function run(): void
    {
        // 1. Purge legacy demo sales data without touching users/employees/roles
        Schema::disableForeignKeyConstraints();
        
        DB::table('customer_portal_tokens')->truncate();
        DB::table('contract_amendments')->truncate();
        DB::table('payment_schedules')->truncate();
        DB::table('itineraries')->truncate();
        DB::table('custom_transaction_details')->truncate();
        DB::table('contracts')->truncate();
        DB::table('invoice_passengers')->truncate();
        DB::table('invoice_items')->truncate();
        DB::table('invoices')->truncate();
        DB::table('joiner_departure_seats')->truncate();
        DB::table('joiner_reservations')->truncate();
        DB::table('joiner_departures')->truncate();
        DB::table('charter_bookings')->truncate();
        DB::table('educational_tour_bookings')->truncate();
        DB::table('bookings')->truncate();
        DB::table('resource_allocations')->truncate();
        DB::table('trip_tickets')->truncate();
        
        Schema::enableForeignKeyConstraints();

        // 2. Fetch or create drivers
        $driver1 = User::where('role', 'driver')->first() ?? User::create([
            'first_name' => 'Mario',
            'last_name' => 'Speedwagon',
            'email' => 'driver.mario@jvdevents.com',
            'password' => bcrypt('password123'),
            'role' => 'driver',
            'is_active' => true,
        ]);

        $driver2 = User::where('role', 'driver')->skip(1)->first() ?? User::create([
            'first_name' => 'Danilo',
            'last_name' => 'Santos',
            'email' => 'driver.danilo@jvdevents.com',
            'password' => bcrypt('password123'),
            'role' => 'driver',
            'is_active' => true,
        ]);

        // 3. Update/Seed Fleet Buses with Seat Maps and Assigned Drivers
        $bus1 = Bus::updateOrCreate(
            ['plate_number' => 'NAG-8891'],
            [
                'model' => 'Golden Dragon Grand Cruiser (49 Seater)',
                'vehicle_type' => 'Bus',
                'bus_category' => 'VIP',
                'seating_capacity' => 49,
                'status' => 'available',
                'assigned_driver' => $driver1->id,
                'total_mileage' => 12500,
            ]
        );

        $bus2 = Bus::updateOrCreate(
            ['plate_number' => 'NCB-4022'],
            [
                'model' => 'Higer Luxury Coaster (25 Seater)',
                'vehicle_type' => 'Coaster',
                'bus_category' => 'LUXURY',
                'seating_capacity' => 25,
                'status' => 'available',
                'assigned_driver' => $driver2->id,
                'total_mileage' => 8400,
            ]
        );

        $bus3 = Bus::updateOrCreate(
            ['plate_number' => 'NBD-9090'],
            [
                'model' => 'King Long Executive Express (49 Seater)',
                'vehicle_type' => 'Bus',
                'bus_category' => 'LUXURY',
                'seating_capacity' => 49,
                'status' => 'available',
                'assigned_driver' => null,
                'total_mileage' => 5200,
            ]
        );

        // 4. Ensure Categories
        $tourCat = ServiceCategory::firstOrCreate(['name' => 'Tour Packages'], ['pricing_model' => 'per_pax']);
        $joinerCat = ServiceCategory::firstOrCreate(['name' => 'Joiners'], ['pricing_model' => 'per_pax']);
        $charterCat = ServiceCategory::firstOrCreate(['name' => 'Charter Services'], ['pricing_model' => 'per_day']);
        $eduCat = ServiceCategory::firstOrCreate(['name' => 'Educational Tours'], ['pricing_model' => 'per_pax']);

        // 5. Seed Tour Packages & Programs with Inclusions, Exclusions, and Itineraries
        $tagaytay1Day = Service::updateOrCreate(
            ['name' => '1-Day Tagaytay Scenic Escape'],
            [
                'service_type' => 'private_tour',
                'category' => 'Domestic Tour',
                'service_category_id' => $tourCat->id,
                'description' => 'Full day tour of Tagaytay scenic spots including Taal View, Palace in the Sky, Picnic Grove, and Gingerbread House.',
                'price' => 1850.00,
                'adult_price' => 1850.00,
                'child_price' => 1400.00,
                'max_pax' => 49,
                'is_sales_catalog' => true,
                'is_active' => true,
                'inclusions' => [
                    'Roundtrip Airconditioned Tourist Bus Transportation',
                    'Driver Fee, Fuel, Toll Fees & Parking Fees',
                    'Tagaytay Sightseeing (People\'s Park, Picnic Grove, Taal Lake Viewpoint)',
                    'Buffet Lunch at Cresta de Tagaytay',
                    'Licensed Tour Guide & Travel Insurance',
                ],
                'exclusions' => [
                    'Personal Souvenir Shopping',
                    'Breakfast and Dinner',
                    'Optional Horseback Riding Fees',
                    'Tour Guide / Driver Gratuity',
                ],
                'package_config' => [
                    'destination' => 'Tagaytay City',
                    'origin' => 'Manila',
                    'duration_days' => 1,
                    'duration_nights' => 0,
                    'minimum_pax' => 1,
                    'maximum_pax' => 49,
                    'default_itinerary' => [
                        '05:00 AM Departure from Manila -> 08:30 AM Arrival in Tagaytay -> Taal Viewpoint & Palace in the Sky -> 12:00 PM Buffet Lunch -> 02:00 PM Picnic Grove -> 05:00 PM Return Trip to Manila.'
                    ],
                ],
            ]
        );

        $baguio3D2N = Service::updateOrCreate(
            ['name' => '3D2N Baguio Highland Adventure'],
            [
                'service_type' => 'private_tour',
                'category' => 'Domestic Tour',
                'service_category_id' => $tourCat->id,
                'description' => '3 Days / 2 Nights cool mountain getaway to Baguio City covering Mines View, Camp John Hay, Burnham Park, and Strawberry Farm.',
                'price' => 4800.00,
                'adult_price' => 4800.00,
                'child_price' => 3800.00,
                'max_pax' => 49,
                'is_sales_catalog' => true,
                'is_active' => true,
                'inclusions' => [
                    'Roundtrip Aircon Tourist Bus (Manila-Baguio-Manila)',
                    '3D2N Hotel Accommodation (Midtown Hotel Baguio)',
                    'Daily Hotel Breakfast',
                    'Baguio City & La Trinidad Strawberry Farm Tour',
                    'All Entrance Fees, Tolls & Environmental Permits',
                    'Licensed Tour Guide & Travel Insurance',
                ],
                'exclusions' => [
                    'Lunch & Dinner Meals not specified',
                    'La Trinidad Strawberry Picking Activity Fee',
                    'Personal Expenses & Tipping',
                ],
                'package_config' => [
                    'destination' => 'Baguio City',
                    'origin' => 'Manila',
                    'duration_days' => 3,
                    'duration_nights' => 2,
                    'minimum_pax' => 1,
                    'maximum_pax' => 49,
                    'default_itinerary' => [
                        'Overnight Travel -> Arrival at Baguio -> Hotel Check-in -> Afternoon Visit to Burnham Park & Cathedral.',
                        'Breakfast -> Mines View Park, The Mansion, Camp John Hay -> La Trinidad Strawberry Farm -> Night Market.',
                        'Hotel Check-out -> Souvenir Shopping at Good Shepherd -> Lions Head photo stop -> Return journey to Manila.',
                    ],
                ],
            ]
        );

        $educationalProgram = Service::updateOrCreate(
            ['name' => 'Science & Heritage Educational Exposure Tour'],
            [
                'service_type' => 'educational_tour',
                'category' => 'Educational Tour',
                'service_category_id' => $eduCat->id,
                'description' => 'Interactive educational field trip to Mind Museum, Planetarium, and National Museum of Natural History.',
                'price' => 1650.00,
                'adult_price' => 1650.00,
                'child_price' => 1650.00,
                'max_pax' => 49,
                'is_sales_catalog' => true,
                'is_active' => true,
                'inclusions' => [
                    'Dedicated Aircon Tourist Bus Transportation',
                    'All Museum Entrance Tickets & All-Access Passes',
                    'Student Plated Lunch Box & Bottled Water',
                    'Tour Coordinators & First Aid Personnel',
                    'Comprehensive Student Accident Insurance',
                ],
                'exclusions' => [
                    'Personal Souvenir Shopping',
                    'Additional Snacks outside itinerary',
                ],
                'package_config' => [
                    'destination' => 'Metro Manila Museums',
                    'origin' => 'School Campus',
                    'duration_days' => 1,
                    'duration_nights' => 0,
                    'minimum_pax' => 20,
                    'maximum_pax' => 200,
                    'default_itinerary' => [
                        '07:00 AM School Pick-up -> 09:00 AM Mind Museum BGC -> 12:00 PM Plated Lunch -> 01:30 PM National Museum of Natural History -> 04:30 PM Departure back to School.'
                    ],
                ],
            ]
        );

        // Seed Charter Rate Plan
        $charterService = Service::updateOrCreate(
            ['name' => '49-Seater Tourist Bus Charter (Daily Rate)'],
            [
                'service_type' => 'charter',
                'category' => 'Bus Rental',
                'service_category_id' => $charterCat->id,
                'description' => 'Full day private charter of 49-seater deluxe tourist bus within Luzon.',
                'price' => 12000.00,
                'is_sales_catalog' => true,
                'is_active' => true,
                'inclusions' => [
                    '49-Seater Deluxe Tourist Bus with Reclining Seats & Audio/Video System',
                    'Professional Licensed Uniformed Driver',
                    'Passenger Insurance Coverage',
                ],
                'exclusions' => [
                    'Diesel Fuel (Unless quoted inclusive)',
                    'Toll Fees & Parking Fees',
                    'Driver Meal Allowance & Accommodation (if multi-day)',
                ],
            ]
        );

        CharterRatePlan::updateOrCreate(
            ['service_id' => $charterService->id],
            [
                'name' => 'Deluxe Bus Charter Rate - Daily Luzon',
                'vehicle_class' => 'bus',
                'base_price' => 12000.00,
                'included_hours' => 10,
                'included_kilometers' => 100,
                'extra_hour_rate' => 1000.00,
                'extra_kilometer_rate' => 45.00,
                'is_active' => true,
                'created_by' => $driver1->id,
            ]
        );

        // 6. Seed Joiner Departure with Seat Assignments
        $joinerService = Service::updateOrCreate(
            ['name' => 'Joiner Trip: Sagada & Banaue Rice Terraces Escape'],
            [
                'service_type' => 'joiners',
                'category' => 'Joiners',
                'service_category_id' => $joinerCat->id,
                'description' => 'Weekend joiner departure to Sagada, Banaue viewpoint, and Sumaguing Cave.',
                'price' => 3800.00,
                'adult_price' => 3800.00,
                'child_price' => 3200.00,
                'max_pax' => 49,
                'is_sales_catalog' => true,
                'is_active' => true,
                'inclusions' => [
                    'Roundtrip Transportation in 49-Seater Tourist Bus',
                    '3D2N Lodge Accommodation in Sagada',
                    'Local Cave & Eco-Trail Guides',
                    'Environmental Fees & Registrations',
                ],
                'exclusions' => [
                    'All Meals',
                    'Optional Cave Connection Upgrades',
                ],
            ]
        );

        $departureDate = Carbon::now()->addDays(5);
        $joinerDeparture = JoinerDeparture::create([
            'service_id' => $joinerService->id,
            'code' => 'DEP-SAGADA-001',
            'bus_id' => $bus1->id,
            'driver_id' => $driver1->id,
            'starts_at' => $departureDate->copy()->setHour(21)->setMinute(0),
            'ends_at' => $departureDate->copy()->addDays(3)->setHour(20)->setMinute(0),
            'booking_cutoff_at' => $departureDate->copy()->subHours(12),
            'capacity' => 49,
            'status' => 'scheduled',
            'created_by' => $driver1->id,
        ]);

        // Create seats for this joiner departure
        for ($i = 1; $i <= 49; $i++) {
            $seatCode = (string) $i;
            // Mark seats 1, 2, 3 as confirmed booked to demonstrate seat locking!
            $status = in_array($seatCode, ['1', '2', '3']) ? 'confirmed' : 'available';
            JoinerDepartureSeat::create([
                'departure_id' => $joinerDeparture->id,
                'seat_code' => $seatCode,
                'status' => $status,
            ]);
        }

        // Lock bus1 and driver1 in ResourceAllocation for this active joiner departure window
        ResourceAllocation::updateOrCreate(
            [
                'source_type' => JoinerDeparture::class,
                'source_id' => $joinerDeparture->id,
                'bus_id' => $bus1->id,
            ],
            [
                'driver_id' => $driver1->id,
                'starts_at' => $joinerDeparture->starts_at,
                'ends_at' => $joinerDeparture->ends_at,
                'status' => 'confirmed',
                'reference' => 'Sagada Joiner Departure #'.$joinerDeparture->id,
            ]
        );
    }
}
