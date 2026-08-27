<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EducationalTourPackage extends Model
{
    use HasFactory;

    protected $appends = [
        'destination',
    ];

    protected $fillable = [
        'public_id',
        'tour_code',
        'program_id',
        'school_customer_id',
        'name',
        'school_name',
        'grade_level',
        'description',
        'learning_objectives',
        'starts_at',
        'ends_at',
        'registration_opens_at',
        'registration_closes_at',
        'pickup_location',
        'itinerary',
        'inclusions',
        'exclusions',
        'images',
        'maximum_capacity',
        'rate_per_head',
        'adult_rate_per_head',
        'currency',
        'is_tax_inclusive',
        'vat_rate',
        'payment_policy',
        'down_payment_amount',
        'installment_count',
        'balance_due_at',
        'registration_token_hash',
        'status',
        'operations_notes',
        'created_by',
        'published_at',
    ];

    protected $hidden = [
        'registration_token_hash',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'registration_opens_at' => 'datetime',
            'registration_closes_at' => 'datetime',
            'balance_due_at' => 'datetime',
            'published_at' => 'datetime',
            'itinerary' => 'array',
            'inclusions' => 'array',
            'exclusions' => 'array',
            'images' => 'array',
            'maximum_capacity' => 'integer',
            'rate_per_head' => 'decimal:2',
            'adult_rate_per_head' => 'decimal:2',
            'vat_rate' => 'decimal:5',
            'is_tax_inclusive' => 'boolean',
            'down_payment_amount' => 'decimal:2',
            'installment_count' => 'integer',
        ];
    }

    public function getDestinationAttribute(): ?string
    {
        $stops = collect($this->itinerary ?? []);
        $destination = $stops
            ->map(fn ($stop) => is_array($stop) ? ($stop['location'] ?? null) : null)
            ->filter(fn ($location) => is_string($location) && trim($location) !== '')
            ->last();

        return $destination ? trim($destination) : null;
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(EducationalTourProgram::class, 'program_id');
    }

    public function schoolCustomer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'school_customer_id');
    }

    public function busAssignments(): HasMany
    {
        return $this->hasMany(EducationalTourBusAssignment::class, 'package_id')->orderBy('sequence_number');
    }

    public function participantBookings(): HasMany
    {
        return $this->hasMany(EducationalTourParticipantBooking::class, 'package_id');
    }

    public function tripTickets(): HasMany
    {
        return $this->hasMany(TripTicket::class, 'educational_tour_package_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
