<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EducationalTourParticipantBooking extends Model
{
    use HasFactory;

    protected $fillable = [
        'public_id',
        'reference',
        'access_token_hash',
        'package_id',
        'customer_id',
        'invoice_id',
        'participant_first_name',
        'participant_middle_name',
        'participant_last_name',
        'participant_type',
        'student_number',
        'grade_level',
        'section',
        'date_of_birth',
        'participant_email',
        'participant_phone',
        'guardian_name',
        'guardian_email',
        'guardian_phone',
        'emergency_contact_name',
        'emergency_contact_phone',
        'dietary_restrictions',
        'medical_or_accessibility_notes',
        'rate_snapshot',
        'subtotal',
        'tax_amount',
        'amount_due',
        'currency',
        'payment_plan',
        'payment_status',
        'status',
        'bus_assignment_id',
        'seat_number',
        'booked_at',
        'slot_expires_at',
        'confirmed_at',
        'cancelled_at',
        'cancellation_reason',
        'privacy_consent_at',
        'created_by',
    ];

    protected $hidden = [
        'access_token_hash',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'booked_at' => 'datetime',
            'slot_expires_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'privacy_consent_at' => 'datetime',
            'rate_snapshot' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'amount_due' => 'decimal:2',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return trim(implode(' ', array_filter([
            $this->participant_first_name,
            $this->participant_middle_name,
            $this->participant_last_name,
        ])));
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(EducationalTourPackage::class, 'package_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function busAssignment(): BelongsTo
    {
        return $this->belongsTo(EducationalTourBusAssignment::class, 'bus_assignment_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(EducationalTourBookingPayment::class, 'booking_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
