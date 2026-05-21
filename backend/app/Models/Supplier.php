<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Supplier extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_name', 'contact_person', 'phone', 'email', 'address',
        // Cross-check / verification (boss-mandated)
        'is_verified', 'verified_by', 'verified_at',
        // Payment terms
        'payment_terms', 'is_consignment',
        // Financial/compliance
        'bank_name', 'bank_account_number', 'tin_number',
        // Accreditation
        'accreditation_status',
    ];

    protected function casts(): array
    {
        return [
            'is_verified'    => 'boolean',
            'is_consignment' => 'boolean',
            'verified_at'    => 'datetime',
        ];
    }

    // ── Relationships ───────────────────────────────────────────────

    public function purchaseOrders()
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // ── Scopes ──────────────────────────────────────────────────────

    /** Only suppliers that have passed accounting cross-check. */
    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    /** Only suppliers with active accreditation. */
    public function scopeAccredited($query)
    {
        return $query->where('accreditation_status', 'accredited');
    }

    /**
     * Get all of the supplier's accreditations.
     */
    public function accreditations()
    {
        return $this->morphMany(Accreditation::class, 'entity', 'entity_type', 'entity_id');
    }
}
