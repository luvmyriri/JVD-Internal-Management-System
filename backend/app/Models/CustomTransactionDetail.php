<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomTransactionDetail extends Model
{
    use HasFactory;

    protected $table = 'custom_transaction_details';

    protected $fillable = [
        'invoice_id', 'category',
        'vehicle_type', 'route', 'rental_days', 'plate_number',
        'inclusion_driver', 'inclusion_fuel', 'inclusion_toll', 'inclusion_insurance',
        'school_name', 'grade_level', 'expected_pax', 'itinerary_stops',
        'edu_inclusion_meals', 'edu_inclusion_coordinator', 'edu_inclusion_insurance', 'edu_inclusion_tshirt',
        'destination', 'accommodation_type',
        'visa_country', 'visa_type', 'visa_req_passport', 'visa_req_photo', 'visa_req_bank_cert', 'visa_req_itr', 'visa_req_birth_cert',
        'joiner_tour_code',
        'booking_type', 'booking_reference_code', 'booking_details',
        'category_meta', 'additional_remarks',
    ];

    protected function casts(): array
    {
        return [
            'inclusion_driver' => 'boolean', 'inclusion_fuel' => 'boolean', 'inclusion_toll' => 'boolean', 'inclusion_insurance' => 'boolean',
            'edu_inclusion_meals' => 'boolean', 'edu_inclusion_coordinator' => 'boolean', 'edu_inclusion_insurance' => 'boolean', 'edu_inclusion_tshirt' => 'boolean',
            'visa_req_passport' => 'boolean', 'visa_req_photo' => 'boolean', 'visa_req_bank_cert' => 'boolean', 'visa_req_itr' => 'boolean', 'visa_req_birth_cert' => 'boolean',
            'category_meta' => 'array',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
