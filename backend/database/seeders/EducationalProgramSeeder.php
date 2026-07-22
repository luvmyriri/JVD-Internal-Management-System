<?php

namespace Database\Seeders;

use App\Models\EducationalTourProgram;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;

class EducationalProgramSeeder extends Seeder
{
    public function run(): void
    {
        $service = Service::firstOrCreate(
            ['name' => 'Educational School Tour Program'],
            [
                'description' => 'Guided educational and cultural heritage field trip for school groups.',
                'category' => 'Educational Tour',
                'service_type' => 'educational_tour',
                'price' => 1500,
                'is_active' => true,
                'is_sales_catalog' => true,
            ]
        );

        $superAdmin = User::where('role', 'super_admin')->first();
        $adminId = $superAdmin ? $superAdmin->id : 1;

        $programs = [
            [
                'service_id' => $service->id,
                'name' => 'Historical & Cultural Manila Heritage Tour',
                'learning_objectives' => 'Explore Rizal Park, Intramuros, National Museum, and Fort Santiago to gain deep insights into Philippine history.',
                'default_stops' => ['Intramuros Historical Walls', 'National Museum of Fine Arts', 'Rizal Park Monument'],
                'minimum_students' => 20,
                'students_per_chaperone' => 15,
                'students_per_free_chaperone' => 20,
                'student_price' => 1200,
                'additional_chaperone_price' => 600,
                'includes_meals' => true,
                'includes_coordinator' => true,
                'includes_insurance' => true,
                'includes_shirt' => false,
                'is_active' => true,
                'created_by' => $adminId,
            ],
            [
                'service_id' => $service->id,
                'name' => 'Subic & Clark Science & Eco-Educational Adventure',
                'learning_objectives' => 'Hands-on oceanography, wildlife conservation, and forestry research in Subic Safari and Clark Science Center.',
                'default_stops' => ['Ocean Adventure Subic', 'Zoobic Safari Eco-Trail', 'Clark Science & Tech Hub'],
                'minimum_students' => 30,
                'students_per_chaperone' => 20,
                'students_per_free_chaperone' => 25,
                'student_price' => 2450,
                'additional_chaperone_price' => 1200,
                'includes_meals' => true,
                'includes_coordinator' => true,
                'includes_insurance' => true,
                'includes_shirt' => true,
                'is_active' => true,
                'created_by' => $adminId,
            ],
        ];

        foreach ($programs as $program) {
            EducationalTourProgram::firstOrCreate(['name' => $program['name']], $program);
        }
    }
}
