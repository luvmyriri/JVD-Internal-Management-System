<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProcurementDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'document_type',
        'file_path',
        'amount',
        'supplier_id',
        'inventory_item_id',
        'driver_id',
        'customer_id',
        'job_order_id',
        'work_order_id',
        'trip_ticket_id',
        'transaction_type',
        'transaction_id',
        'custom_metadata',
        'uploaded_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'custom_metadata' => 'array',
    ];

    /**
     * Get the supplier that owns the document.
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /**
     * Get the inventory item associated with the document.
     */
    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    /**
     * Get the driver (User) associated with the document.
     */
    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    /**
     * Get the user who uploaded the document.
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function jobOrder(): BelongsTo
    {
        return $this->belongsTo(JobOrder::class);
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function tripTicket(): BelongsTo
    {
        return $this->belongsTo(TripTicket::class);
    }
}
