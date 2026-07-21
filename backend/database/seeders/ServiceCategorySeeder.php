<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ServiceCategory;

class ServiceCategorySeeder extends Seeder
{
    public function run(): void
    {
        ServiceCategory::create([
            'name' => 'Bus Rental',
            'pricing_model' => 'per_day', // or flat depending on distance
            'field_schema' => [
                ['key' => 'pickup_location', 'label' => 'Pickup Location', 'type' => 'text', 'required' => true],
                ['key' => 'destination', 'label' => 'Destination', 'type' => 'text', 'required' => true],
                ['key' => 'departure_date', 'label' => 'Departure Date & Time', 'type' => 'datetime-local', 'required' => true],
                ['key' => 'return_date', 'label' => 'Return Date & Time', 'type' => 'datetime-local', 'required' => true],
                ['key' => 'pax_count', 'label' => 'Number of Passengers', 'type' => 'number', 'required' => true],
                ['key' => 'vehicle_type', 'label' => 'Vehicle Type', 'type' => 'select', 'required' => true, 'options' => ['Bus', 'Coaster', 'Van']],
                ['key' => 'with_driver', 'label' => 'With Driver?', 'type' => 'checkbox', 'required' => false],
                ['key' => 'client_type', 'label' => 'Client Type', 'type' => 'select', 'required' => true, 'options' => ['School', 'Company', 'Individual']],
            ]
        ]);

        ServiceCategory::create([
            'name' => 'Educational Tour',
            'pricing_model' => 'per_head_min_pax',
            'field_schema' => [
                ['key' => 'school_name', 'label' => 'School / Organization', 'type' => 'text', 'required' => true],
                ['key' => 'contact_person', 'label' => 'Contact Person', 'type' => 'text', 'required' => true],
                ['key' => 'destination', 'label' => 'Destination', 'type' => 'text', 'required' => true],
                ['key' => 'tour_date', 'label' => 'Tour Date', 'type' => 'date', 'required' => true],
                ['key' => 'students_count', 'label' => 'Number of Students', 'type' => 'number', 'required' => true],
                ['key' => 'chaperones_count', 'label' => 'Number of Chaperones', 'type' => 'number', 'required' => true],
                ['key' => 'grade_level', 'label' => 'Grade Level', 'type' => 'text', 'required' => true],
            ]
        ]);
    }
}
