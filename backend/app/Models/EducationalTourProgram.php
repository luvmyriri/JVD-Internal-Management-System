<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EducationalTourProgram extends Model
{
    protected $fillable = ['name', 'learning_objectives', 'images', 'default_stops', 'minimum_students', 'students_per_chaperone', 'students_per_free_chaperone', 'student_price', 'additional_chaperone_price', 'includes_meals', 'includes_coordinator', 'includes_insurance', 'includes_shirt', 'is_active', 'created_by'];

    protected $hidden = ['service_id'];

    protected function casts(): array
    {
        return ['default_stops' => 'array', 'images' => 'array', 'student_price' => 'decimal:2', 'additional_chaperone_price' => 'decimal:2', 'includes_meals' => 'boolean', 'includes_coordinator' => 'boolean', 'includes_insurance' => 'boolean', 'includes_shirt' => 'boolean', 'is_active' => 'boolean'];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(EducationalTourBooking::class, 'program_id');
    }
}
