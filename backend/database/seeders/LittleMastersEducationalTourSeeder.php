<?php

namespace Database\Seeders;

use App\Models\Bus;
use App\Models\EducationalTourPackage;
use App\Models\EducationalTourParticipantBooking;
use App\Models\EducationalTourProgram;
use App\Models\Service;
use App\Models\User;
use App\Services\EducationalTourPackageService;
use App\Services\EducationalTourPaymentService;
use App\Services\EducationalTourRegistrationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class LittleMastersEducationalTourSeeder extends Seeder
{
    public function run(): void
    {
        Mail::fake();
        config(['mail.default' => 'array']);

        $superAdmin = User::where('role', 'super_admin')->first() ?? User::first();
        if (! $superAdmin) {
            $superAdmin = User::create([
                'employee_id' => 'EMP-0001',
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'email' => 'admin@jvd.com',
                'role' => 'super_admin',
                'is_active' => true,
                'password' => bcrypt('password'),
            ]);
        }
        $adminId = $superAdmin->id;

        $service = Service::firstOrCreate(
            ['name' => 'Educational School Tour Program'],
            [
                'description' => 'Guided educational and cultural heritage field trip for school groups.',
                'category' => 'Educational Tour',
                'service_type' => 'educational_tour',
                'price' => 1300,
                'is_active' => true,
                'is_sales_catalog' => true,
            ]
        );

        $program = EducationalTourProgram::firstOrCreate(
            ['name' => 'Little Masters Tagaytay & Laguna Adventure'],
            [
                'service_id' => $service->id,
                'learning_objectives' => 'Interactive sensory learning, wildlife discovery, baking culture, and theme park excitement for preschool children (3-5yo).',
                'default_stops' => ['Paradizoo Tagaytay', 'Gingerbread House Tagaytay', 'Enchanted Kingdom (Parkzone) Sta. Rosa Laguna'],
                'minimum_students' => 20,
                'students_per_chaperone' => 15,
                'students_per_free_chaperone' => 20,
                'student_price' => 1300.00,
                'additional_chaperone_price' => 1400.00,
                'includes_meals' => true,
                'includes_coordinator' => true,
                'includes_insurance' => true,
                'includes_shirt' => true,
                'is_active' => true,
                'created_by' => $adminId,
            ]
        );

        $packageService = app(EducationalTourPackageService::class);
        $registrationService = app(EducationalTourRegistrationService::class);
        $paymentService = app(EducationalTourPaymentService::class);

        $bus = Bus::find(2) ?? Bus::where('status', 'available')->first() ?? Bus::first();
        if (! $bus) {
            $bus = Bus::create([
                'plate_number' => 'NAG-1426',
                'model' => 'Golden Dragon 49-Seater Luxury Coach',
                'vehicle_type' => 'bus',
                'seating_capacity' => 49,
                'status' => 'available',
            ]);
        }

        $driver = User::find(33);
        if (! $driver || $driver->role !== 'driver' || ! $driver->is_active) {
            $driver = User::where('role', 'driver')->where('is_active', true)->first();
        }
        if (! $driver) {
            $driver = User::create([
                'employee_id' => 'EMP-DRV-0033',
                'first_name' => 'Eduardo',
                'last_name' => 'Ramos',
                'email' => 'driver.eduardo@jvd.com',
                'role' => 'driver',
                'is_active' => true,
                'password' => bcrypt('password'),
            ]);
        }

        // Check if package already exists
        $package = EducationalTourPackage::where('name', 'Little Masters')
            ->orWhere('tour_code', 'JVD-EDT-LM-2026-001')
            ->first();

        if (! $package) {
            $packageData = [
                'program_id' => $program->id,
                'tour_code' => 'JVD-EDT-LM-2026-001',
                'name' => 'Little Masters',
                'school_name' => 'Little Masters Learning Center',
                'grade_level' => 'Preschool (3-5yo)',
                'description' => "Little Masters (3-5yo) - (49 pax)\nDate: March 14, 2026 (Saturday)\nAssemble: 5:00 AM | ETD: 5:30 AM | ETA: 6:00 PM\nDestination: Tagaytay / Sta. Rosa Laguna\nPick-up & Drop-off: City Mall Imus Cavite",
                'learning_objectives' => 'Outdoor sensory exploration, farm animal appreciation, hands-on bakery workshop, and theme park activities.',
                'starts_at' => '2026-03-14 05:30:00',
                'ends_at' => '2026-03-14 18:00:00',
                'registration_opens_at' => '2026-01-15 00:00:00',
                'registration_closes_at' => '2026-03-13 23:59:59',
                'pickup_location' => 'City Mall Imus Cavite',
                'maximum_capacity' => 49,
                'rate_per_head' => 1300.00,
                'adult_rate_per_head' => 1400.00,
                'payment_policy' => 'flexible',
                'down_payment_amount' => 500.00,
                'installment_count' => 2,
                'status' => 'published',
                'images' => [
                    '/uploads/services/69a59b66a5c13_1772493670.jpg',
                    '/uploads/services/69a59b66b3d1b_1772493670.jpg',
                ],
                'itinerary' => [
                    ['day_number' => 1, 'sequence' => 1, 'location' => 'City Mall Imus Cavite', 'activity' => 'Assembly and roll call at 5:00 AM. ETD 5:30 AM.'],
                    ['day_number' => 1, 'sequence' => 2, 'location' => 'Paradizoo Tagaytay', 'activity' => 'Interactive petting zoo, farm flora, and butterfly sanctuary visit.'],
                    ['day_number' => 1, 'sequence' => 3, 'location' => 'Gingerbread House Tagaytay', 'activity' => 'Pastry wonderland tour and sensory pastry decorating experience.'],
                    ['day_number' => 1, 'sequence' => 4, 'location' => 'Enchanted Kingdom Sta. Rosa', 'activity' => 'Parkzone rides, kiddie attractions, and student group bonding.'],
                    ['day_number' => 1, 'sequence' => 5, 'location' => 'City Mall Imus Cavite', 'activity' => 'Return trip and student dismissal at 6:00 PM.'],
                ],
                'inclusions' => [
                    '49-seater tourist bus with airconditioning',
                    'Fuel, toll fees, and parking fees',
                    "Driver's fee and meal allowance",
                    'Dedicated Tour Coordinator',
                    'Accredited Tour Facilitator',
                    'Entrance fees as per itinerary (Paradizoo, Gingerbread House, EK Parkzone)',
                    'Comprehensive travel insurance coverage',
                    'JVD Souvenir package',
                    'Commemorative event tarpaulin',
                    'Personalized Little Masters luggage tag',
                    'On-board first aid kit and emergency medical kit',
                    'Standard health protocol compliance',
                ],
                'exclusions' => [
                    'Personal food and souvenirs outside of provided meal plan',
                    'Optional game booth tickets inside Enchanted Kingdom',
                ],
                'operations_notes' => 'Early assembly at City Mall Imus Cavite parking bay. Toddlers must wear ID tags and wristbands at all times.',
            ];

            $createResult = $packageService->createPackage($packageData, $adminId);
            $package = $createResult['package'];

            // Assign Bus and Driver
            if ($bus) {
                $packageService->assignBus($package, [
                    'bus_id' => $bus->id,
                    'driver_id' => $driver?->id,
                    'sequence_number' => 1,
                ], $adminId);
            }
        }

        // Get bus assignment ID
        $busAssignment = $package->busAssignments()->first();

        // Seed realistic participant bookings (Students & Adults)
        $participants = [
            // --- Students (₱1,300 each) ---
            [
                'type' => 'student',
                'first_name' => 'Lucas',
                'last_name' => 'Alcantara',
                'student_number' => 'LM-2026-001',
                'grade_level' => 'Nursery (3yo)',
                'section' => 'Sunflowers',
                'guardian_name' => 'Ramon Alcantara',
                'guardian_email' => 'ramon.alcantara@gmail.com',
                'guardian_phone' => '09171234561',
                'payment_plan' => 'full',
                'paid' => 1300.00,
                'seat' => 'Seat 1',
            ],
            [
                'type' => 'student',
                'first_name' => 'Chloe',
                'last_name' => 'Villanueva',
                'student_number' => 'LM-2026-002',
                'grade_level' => 'Kinder 1 (4yo)',
                'section' => 'Butterflies',
                'guardian_name' => 'Grace Villanueva',
                'guardian_email' => 'grace.villanueva@yahoo.com',
                'guardian_phone' => '09181234562',
                'payment_plan' => 'full',
                'paid' => 1300.00,
                'seat' => 'Seat 2',
            ],
            [
                'type' => 'student',
                'first_name' => 'Ethan',
                'last_name' => 'Dela Cruz',
                'student_number' => 'LM-2026-003',
                'grade_level' => 'Kinder 2 (5yo)',
                'section' => 'Dolphins',
                'guardian_name' => 'Mark Dela Cruz',
                'guardian_email' => 'mark.delacruz@outlook.com',
                'guardian_phone' => '09191234563',
                'payment_plan' => 'down_payment',
                'paid' => 500.00,
                'seat' => 'Seat 3',
            ],
            [
                'type' => 'student',
                'first_name' => 'Sophia',
                'last_name' => 'Mendoza',
                'student_number' => 'LM-2026-004',
                'grade_level' => 'Kinder 2 (5yo)',
                'section' => 'Dolphins',
                'guardian_name' => 'Elena Mendoza',
                'guardian_email' => 'elena.mendoza@gmail.com',
                'guardian_phone' => '09201234564',
                'payment_plan' => 'full',
                'paid' => 1300.00,
                'seat' => 'Seat 4',
            ],
            [
                'type' => 'student',
                'first_name' => 'Noah',
                'last_name' => 'Reyes',
                'student_number' => 'LM-2026-005',
                'grade_level' => 'Nursery (3yo)',
                'section' => 'Sunflowers',
                'guardian_name' => 'Carlo Reyes',
                'guardian_email' => 'carlo.reyes@gmail.com',
                'guardian_phone' => '09211234565',
                'payment_plan' => 'full',
                'paid' => 1300.00,
                'seat' => 'Seat 5',
            ],
            [
                'type' => 'student',
                'first_name' => 'Amara',
                'last_name' => 'Santos',
                'student_number' => 'LM-2026-006',
                'grade_level' => 'Kinder 1 (4yo)',
                'section' => 'Butterflies',
                'guardian_name' => 'Patricia Santos',
                'guardian_email' => 'patricia.santos@gmail.com',
                'guardian_phone' => '09221234566',
                'payment_plan' => 'down_payment',
                'paid' => 500.00,
                'seat' => 'Seat 6',
            ],
            [
                'type' => 'student',
                'first_name' => 'Liam',
                'last_name' => 'Bautista',
                'student_number' => 'LM-2026-007',
                'grade_level' => 'Kinder 2 (5yo)',
                'section' => 'Dolphins',
                'guardian_name' => 'Dennis Bautista',
                'guardian_email' => 'dennis.bautista@gmail.com',
                'guardian_phone' => '09231234567',
                'payment_plan' => 'full',
                'paid' => 1300.00,
                'seat' => 'Seat 7',
            ],
            [
                'type' => 'student',
                'first_name' => 'Mia',
                'last_name' => 'Aquino',
                'student_number' => 'LM-2026-008',
                'grade_level' => 'Nursery (3yo)',
                'section' => 'Sunflowers',
                'guardian_name' => 'Jennifer Aquino',
                'guardian_email' => 'jen.aquino@gmail.com',
                'guardian_phone' => '09241234568',
                'payment_plan' => 'full',
                'paid' => 1300.00,
                'seat' => 'Seat 8',
            ],
            [
                'type' => 'student',
                'first_name' => 'Jacob',
                'last_name' => 'Tan',
                'student_number' => 'LM-2026-009',
                'grade_level' => 'Kinder 1 (4yo)',
                'section' => 'Butterflies',
                'guardian_name' => 'Richard Tan',
                'guardian_email' => 'richard.tan@gmail.com',
                'guardian_phone' => '09251234569',
                'payment_plan' => 'full',
                'paid' => 1300.00,
                'seat' => 'Seat 9',
            ],
            [
                'type' => 'student',
                'first_name' => 'Zoe',
                'last_name' => 'Lim',
                'student_number' => 'LM-2026-010',
                'grade_level' => 'Kinder 2 (5yo)',
                'section' => 'Dolphins',
                'guardian_name' => 'Stephanie Lim',
                'guardian_email' => 'steph.lim@gmail.com',
                'guardian_phone' => '09261234570',
                'payment_plan' => 'down_payment',
                'paid' => 500.00,
                'seat' => 'Seat 10',
            ],
            [
                'type' => 'student',
                'first_name' => 'Mateo',
                'last_name' => 'Garcia',
                'student_number' => 'LM-2026-011',
                'grade_level' => 'Nursery (3yo)',
                'section' => 'Sunflowers',
                'guardian_name' => 'Victor Garcia',
                'guardian_email' => 'victor.garcia@gmail.com',
                'guardian_phone' => '09271234571',
                'payment_plan' => 'full',
                'paid' => 1300.00,
                'seat' => 'Seat 11',
            ],
            [
                'type' => 'student',
                'first_name' => 'Isabella',
                'last_name' => 'Navarro',
                'student_number' => 'LM-2026-012',
                'grade_level' => 'Kinder 1 (4yo)',
                'section' => 'Butterflies',
                'guardian_name' => 'Maricel Navarro',
                'guardian_email' => 'maricel.navarro@gmail.com',
                'guardian_phone' => '09281234572',
                'payment_plan' => 'full',
                'paid' => 1300.00,
                'seat' => 'Seat 12',
            ],
            [
                'type' => 'student',
                'first_name' => 'Gabriel',
                'last_name' => 'Perez',
                'student_number' => 'LM-2026-013',
                'grade_level' => 'Kinder 2 (5yo)',
                'section' => 'Dolphins',
                'guardian_name' => 'Arnel Perez',
                'guardian_email' => 'arnel.perez@gmail.com',
                'guardian_phone' => '09291234573',
                'payment_plan' => 'full',
                'paid' => 1300.00,
                'seat' => 'Seat 13',
            ],
            [
                'type' => 'student',
                'first_name' => 'Hannah',
                'last_name' => 'Cruz',
                'student_number' => 'LM-2026-014',
                'grade_level' => 'Nursery (3yo)',
                'section' => 'Sunflowers',
                'guardian_name' => 'Rowena Cruz',
                'guardian_email' => 'rowena.cruz@gmail.com',
                'guardian_phone' => '09301234574',
                'payment_plan' => 'full',
                'paid' => 1300.00,
                'seat' => 'Seat 14',
            ],
            [
                'type' => 'student',
                'first_name' => 'Elijah',
                'last_name' => 'Ocampo',
                'student_number' => 'LM-2026-015',
                'grade_level' => 'Kinder 1 (4yo)',
                'section' => 'Butterflies',
                'guardian_name' => 'Noel Ocampo',
                'guardian_email' => 'noel.ocampo@gmail.com',
                'guardian_phone' => '09311234575',
                'payment_plan' => 'down_payment',
                'paid' => 500.00,
                'seat' => 'Seat 15',
            ],

            // --- Adult Companions / Teachers / Guardians (₱1,400 each) ---
            [
                'type' => 'adult',
                'first_name' => 'Teacher Marites',
                'last_name' => 'Domingo',
                'guardian_name' => 'Marites Domingo',
                'guardian_email' => 'teacher.marites@littlemasters.edu.ph',
                'guardian_phone' => '09175551001',
                'payment_plan' => 'full',
                'paid' => 1400.00,
                'seat' => 'Seat 16',
            ],
            [
                'type' => 'adult',
                'first_name' => 'Teacher Joy',
                'last_name' => 'Salvador',
                'guardian_name' => 'Joy Salvador',
                'guardian_email' => 'teacher.joy@littlemasters.edu.ph',
                'guardian_phone' => '09175551002',
                'payment_plan' => 'full',
                'paid' => 1400.00,
                'seat' => 'Seat 17',
            ],
            [
                'type' => 'adult',
                'first_name' => 'Grace',
                'last_name' => 'Villanueva',
                'guardian_name' => 'Grace Villanueva',
                'guardian_email' => 'grace.villanueva@yahoo.com',
                'guardian_phone' => '09181234562',
                'payment_plan' => 'full',
                'paid' => 1400.00,
                'seat' => 'Seat 18',
            ],
            [
                'type' => 'adult',
                'first_name' => 'Elena',
                'last_name' => 'Mendoza',
                'guardian_name' => 'Elena Mendoza',
                'guardian_email' => 'elena.mendoza@gmail.com',
                'guardian_phone' => '09201234564',
                'payment_plan' => 'full',
                'paid' => 1400.00,
                'seat' => 'Seat 19',
            ],
            [
                'type' => 'adult',
                'first_name' => 'Patricia',
                'last_name' => 'Santos',
                'guardian_name' => 'Patricia Santos',
                'guardian_email' => 'patricia.santos@gmail.com',
                'guardian_phone' => '09221234566',
                'payment_plan' => 'down_payment',
                'paid' => 500.00,
                'seat' => 'Seat 20',
            ],
            [
                'type' => 'adult',
                'first_name' => 'Jennifer',
                'last_name' => 'Aquino',
                'guardian_name' => 'Jennifer Aquino',
                'guardian_email' => 'jen.aquino@gmail.com',
                'guardian_phone' => '09241234568',
                'payment_plan' => 'full',
                'paid' => 1400.00,
                'seat' => 'Seat 21',
            ],
            [
                'type' => 'adult',
                'first_name' => 'Stephanie',
                'last_name' => 'Lim',
                'guardian_name' => 'Stephanie Lim',
                'guardian_email' => 'steph.lim@gmail.com',
                'guardian_phone' => '09261234570',
                'payment_plan' => 'full',
                'paid' => 1400.00,
                'seat' => 'Seat 22',
            ],
            [
                'type' => 'adult',
                'first_name' => 'Maricel',
                'last_name' => 'Navarro',
                'guardian_name' => 'Maricel Navarro',
                'guardian_email' => 'maricel.navarro@gmail.com',
                'guardian_phone' => '09281234572',
                'payment_plan' => 'full',
                'paid' => 1400.00,
                'seat' => 'Seat 23',
            ],
        ];

        foreach ($participants as $p) {
            // Check if participant already booked
            $existing = null;
            if (! empty($p['student_number'])) {
                $existing = $package->participantBookings()->where('student_number', $p['student_number'])->first();
            } else {
                $existing = $package->participantBookings()
                    ->where('participant_first_name', $p['first_name'])
                    ->where('participant_last_name', $p['last_name'])
                    ->first();
            }

            if ($existing) {
                continue;
            }

            $regData = [
                'participant' => [
                    'first_name' => $p['first_name'],
                    'last_name' => $p['last_name'],
                    'type' => $p['type'],
                    'participant_type' => $p['type'],
                    'student_number' => $p['student_number'] ?? null,
                    'grade_level' => $p['grade_level'] ?? null,
                    'section' => $p['section'] ?? null,
                    'email' => $p['guardian_email'] ?? null,
                    'phone' => $p['guardian_phone'] ?? null,
                ],
                'participant_type' => $p['type'],
                'guardian' => [
                    'name' => $p['guardian_name'] ?? null,
                    'email' => $p['guardian_email'] ?? null,
                    'phone' => $p['guardian_phone'] ?? null,
                ],
                'payment_plan' => $p['payment_plan'],
                'allocation_mode' => 'manual',
                'bus_assignment_id' => $busAssignment?->id,
                'seat_number' => $p['seat'],
            ];

            $regResult = $registrationService->registerParticipantForPackage($package, $regData, $adminId);
            $booking = EducationalTourParticipantBooking::where('reference', $regResult['booking_reference'])->firstOrFail();

            // Record initial payment if specified
            if (! empty($p['paid']) && $p['paid'] > 0) {
                $paymentService->recordPayment($booking, [
                    'amount' => $p['paid'],
                    'payment_method' => 'Cash',
                    'notes' => 'Registration desk payment for Little Masters tour.',
                    'idempotency_key' => 'seed-lm-'.$booking->id.'-'.Str::random(8),
                ], $adminId);
            }
        }
    }
}
