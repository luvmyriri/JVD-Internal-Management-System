<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class JobOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'service_date' => 'date',
            'total_cost'   => 'decimal:2',
            'requires_po'  => 'boolean',
        ];
    }

    // ── Relationships ───────────────────────────────────────────────

    public function items()
    {
        return $this->hasMany(JobOrderItem::class);
    }

    /** Customer linked to this JO (nullable for maintenance JOs). */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function bus()
    {
        return $this->belongsTo(Bus::class);
    }

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function tripTicket()
    {
        return $this->hasOne(TripTicket::class, 'job_order_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Who requested this JO (e.g., mechanic requesting vehicle maintenance). */
    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /** The Work Order that spawned this maintenance JO (if applicable). */
    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    /** The PO linked to this JO for externally sourced parts (if applicable). */
    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function passengers()
    {
        return $this->belongsToMany(Passenger::class, 'job_order_passenger');
    }

    public function legalDocuments()
    {
        return $this->hasMany(LegalDocument::class);
    }

    // ── Scopes ──────────────────────────────────────────────────────

    /** Only maintenance-type JOs (PMS-driven). */
    public function scopeMaintenance($query)
    {
        return $query->where('service_type', 'maintenance');
    }

    /** Only travel-type JOs (customer-facing). */
    public function scopeTravel($query)
    {
        return $query->whereIn('service_type', [
            'bus_rental', 'field_trip', 'corporate_transport', 'travel_package', 'event',
        ]);
    }
}
