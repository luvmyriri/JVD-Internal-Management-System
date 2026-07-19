<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesQuotation extends Model
{
    protected $fillable = [
        'quotation_number',
        'customer_id',
        'client_name', 'client_company', 'client_address', 'client_contact', 'client_email', 'client_tin',
        'service_id', 'service_name', 'category',
        'line_items', 'description', 'inclusions', 'exclusions',
        'subtotal', 'vat_amount', 'total', 'vat_rate',
        'travel_date', 'valid_until', 'status', 'notes', 'prepared_by',
    ];

    protected $casts = [
        'line_items' => 'array',
        'travel_date' => 'date',
        'valid_until' => 'date',
    ];

    public function preparer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}
