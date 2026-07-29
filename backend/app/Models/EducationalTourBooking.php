<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EducationalTourBooking extends Model
{
    protected $fillable = ['reference', 'program_id', 'customer_id', 'invoice_id', 'school_name', 'contact_person', 'contact_email', 'contact_number', 'grade_level', 'starts_at', 'ends_at', 'pickup_location', 'stops_snapshot', 'student_count', 'chaperone_count', 'booking_mode', 'selected_seats', 'passengers', 'free_chaperone_count', 'chargeable_chaperone_count', 'student_amount', 'chaperone_amount', 'subtotal', 'pricing_snapshot', 'status', 'operations_notes', 'created_by'];

    protected function casts(): array
    {
        return ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'stops_snapshot' => 'array', 'selected_seats' => 'array', 'passengers' => 'array', 'pricing_snapshot' => 'array'];
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(EducationalTourProgram::class, 'program_id');
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(EducationalTourVehicle::class, 'booking_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
